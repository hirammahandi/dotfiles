import type { Elements, Register } from "claude-code";

const SHELL_TOOLS: ReadonlySet<string> = new Set(["Bash", "PowerShell"]);

const RUNTIMES: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /(^|[\s;&|(])(python3?|py|uv|poetry|pip3?)(\s|$)/,
    "Ejecutando un script de Python",
  ],
  [
    /(^|[\s;&|(])(node|tsx|ts-node|bun|deno)(\s|$)/,
    "Ejecutando un script de Node",
  ],
  [/(^|[\s;&|(])(npm|npx|pnpm|yarn)(\s|$)/, "Ejecutando un script de npm"],
  [/(^|[\s;&|(])git(\s|$)/, "Ejecutando un comando de git"],
  [/(^|[\s;&|(])gh(\s|$)/, "Consultando GitHub"],
  [/(^|[\s;&|(])(grep|rg|find)(\s|$)/, "Buscando en el código"],
  [/(^|[\s;&|(])(ls|dir|tree)(\s|$)/, "Listando una carpeta"],
  [/(^|[\s;&|(])(cat|head|tail|sed -n|less)(\s|$)/, "Leyendo un fichero"],
  [/(^|[\s;&|(])(curl|wget)(\s|$)/, "Haciendo una petición HTTP"],
];

const OTHER_TOOLS: Readonly<Record<string, readonly [string, string]>> = {
  Read: ["fichero leído", "ficheros leídos"],
  Grep: ["búsqueda", "búsquedas"],
  Glob: ["búsqueda de ficheros", "búsquedas de ficheros"],
};

type ShellInput = { command?: unknown; description?: unknown };
type ShellOutput = { backgroundTaskId?: unknown };

type CallState = {
  tool: string;
  input: unknown;
  output?: unknown;
  isRunning: boolean;
  isErrored: boolean;
  isInterrupted: boolean;
};

type TerminalElements = Elements["terminal"];

export const describeShellCall = (tool: string, input: unknown): string => {
  const { command, description } = (input ?? {}) as ShellInput;

  if (typeof description === "string" && description.trim() !== "") {
    return description.trim();
  }

  const text = typeof command === "string" ? command : "";
  const runtime = RUNTIMES.find(([pattern]) => pattern.test(text));

  if (runtime) {
    return runtime[1];
  }

  return tool === "PowerShell"
    ? "Ejecutando un comando de PowerShell"
    : "Ejecutando un comando de shell";
};

const isBackgrounded = (output: unknown): boolean =>
  typeof (output as ShellOutput | undefined)?.backgroundTaskId === "string";

const markColor = ({
  isErrored,
  isInterrupted,
  isRunning,
}: Omit<CallState, "tool" | "input">) =>
  isErrored
    ? "error"
    : isInterrupted
      ? "warning"
      : isRunning
        ? "inactive"
        : "success";

const suffixOf = ({
  isErrored,
  isInterrupted,
  isRunning,
  output,
}: Omit<CallState, "tool" | "input">) =>
  isInterrupted
    ? " (interrumpido)"
    : isErrored
      ? " (falló)"
      : isRunning
        ? "…"
        : isBackgrounded(output)
          ? " (en segundo plano)"
          : "";

const shellLine = ({ Text }: TerminalElements, call: CallState) => (
  <Text>
    <Text color={markColor(call)}>● </Text>
    {describeShellCall(call.tool, call.input)}
    <Text
      color={call.isErrored ? "error" : undefined}
      dimColor={!call.isErrored}
    >
      {suffixOf(call)}
    </Text>
  </Text>
);

export const summarizeOtherCalls = (
  calls: ReadonlyArray<CallState>,
): string => {
  const counts = new Map<string, number>();

  for (const { tool } of calls) {
    counts.set(tool, (counts.get(tool) ?? 0) + 1);
  }

  return [...counts]
    .map(([tool, count]) => {
      const [one, many] = OTHER_TOOLS[tool] ?? [
        `llamada a ${tool}`,
        `llamadas a ${tool}`,
      ];

      return `${count} ${count === 1 ? one : many}`;
    })
    .join(" · ");
};

export const register: Register = (on) => {
  on("ui.render", { component: "ToolUse" }, ($, e, next) => {
    if (
      e.surface !== "terminal" ||
      !SHELL_TOOLS.has(e.props.tool) ||
      e.props.isExpanded === true
    ) {
      return next(e);
    }

    const elements = $.ui.resolve(e);

    return <elements.Box>{shellLine(elements, e.props)}</elements.Box>;
  });

  on("ui.render", { component: "ToolResult" }, ($, e, next) => {
    if (
      e.surface !== "terminal" ||
      !SHELL_TOOLS.has(e.props.tool) ||
      e.props.isExpanded === true
    ) {
      return next(e);
    }

    const { Box } = $.ui.resolve(e);

    return <Box />;
  });

  on("ui.render", { component: "ToolGroup" }, ($, e, next) => {
    const { calls, isExpanded } = e.props;
    const shellCalls = calls.filter((call) => SHELL_TOOLS.has(call.tool));

    if (e.surface !== "terminal" || isExpanded || shellCalls.length === 0) {
      return next(e);
    }

    const elements = $.ui.resolve(e);
    const { Box, Text } = elements;
    const otherCalls = calls.filter((call) => !SHELL_TOOLS.has(call.tool));
    const othersState = {
      isRunning: otherCalls.some((call) => call.isRunning),
      isErrored: otherCalls.some((call) => call.isErrored),
      isInterrupted: otherCalls.some((call) => call.isInterrupted),
    };

    return (
      <Box flexDirection="column">
        {shellCalls.map((call) => shellLine(elements, call))}
        {otherCalls.length > 0 && (
          <Text>
            <Text color={markColor(othersState)}>● </Text>
            <Text dimColor>{summarizeOtherCalls(otherCalls)}</Text>
          </Text>
        )}
      </Box>
    );
  });
};

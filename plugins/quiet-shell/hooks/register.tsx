import type { Register } from "claude-code";

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
  [/(^|[\s;&|(])(cat|head|tail|sed -n|less)(\s|$)/, "Leyendo un fichero"],
  [/(^|[\s;&|(])(curl|wget)(\s|$)/, "Haciendo una petición HTTP"],
];

type ShellInput = { command?: unknown; description?: unknown };
type ShellOutput = { backgroundTaskId?: unknown };

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

export const register: Register = (on) => {
  on("ui.render", { component: "ToolUse" }, ($, e, next) => {
    const {
      tool,
      input,
      output,
      isRunning,
      isErrored,
      isInterrupted,
      isExpanded,
    } = e.props;

    if (
      e.surface !== "terminal" ||
      !SHELL_TOOLS.has(tool) ||
      isExpanded === true
    ) {
      return next(e);
    }

    const { Box, Text } = $.ui.resolve(e);
    const markColor = isErrored
      ? "error"
      : isInterrupted
        ? "warning"
        : isRunning
          ? "inactive"
          : "success";
    const suffix = isInterrupted
      ? " (interrumpido)"
      : isErrored
        ? " (falló)"
        : isRunning
          ? "…"
          : isBackgrounded(output)
            ? " (en segundo plano)"
            : "";

    return (
      <Box>
        <Text>
          <Text color={markColor}>● </Text>
          {describeShellCall(tool, input)}
          <Text color={isErrored ? "error" : undefined} dimColor={!isErrored}>
            {suffix}
          </Text>
        </Text>
      </Box>
    );
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
};

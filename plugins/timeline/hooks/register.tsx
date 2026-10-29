import type { EngineInterface, Register, SessionMessage, SessionUsage } from "claude-code";

const PANE = "timeline";
const TITLE = "Timeline";
const PANE_COLUMNS = 44;

const WRAPPERS =
  /<(system-reminder|local-command-caveat|local-command-stdout|local-command-stderr|command-name|command-message|command-args|task-notification|bash-input|bash-stdout|bash-stderr)>[\s\S]*?<\/\1>/g;
const INTERRUPTED = /^\[Request interrupted by user[^\]]*\]$/;

export const promptsOf = (messages: ReadonlyArray<SessionMessage>): string[] =>
  messages.flatMap((message) => {
    if (message.role !== "user" || (message.toolResults?.length ?? 0) > 0) {
      return [];
    }

    const text = message.text.replace(WRAPPERS, "").replace(/\s+/g, " ").trim();

    return text === "" || INTERRUPTED.test(text) ? [] : [text];
  });

export const formatTokens = (tokens: number): string =>
  tokens >= 1_000_000
    ? `${(tokens / 1_000_000).toFixed(1)}M`
    : tokens >= 1_000
      ? `${(tokens / 1_000).toFixed(1)}k`
      : String(tokens);

const clip = (text: string, length: number): string =>
  text.length > length ? `${text.slice(0, Math.max(1, length - 1))}…` : text;

const usageColor = (percent: number) =>
  percent >= 85 ? "error" : percent >= 60 ? "warning" : "success";

const openPane = ($: EngineInterface) =>
  $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS });

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: PANE,
      description:
        "Abre o cierra el panel con el timeline de prompts y el uso de contexto",
    });
    void openPane($);

    return next(e);
  });

  on("command.run", { command: PANE }, async ($) => {
    const isOpen = (await $.ui.panes()).some((pane) => pane.id === PANE);

    await (isOpen ? $.ui.close({ id: PANE }) : openPane($));

    return {};
  });

  on("prompt.submit", async ($, e, next) => {
    const result = await next(e);
    $.ui.invalidate("ui.render");

    return result;
  });

  on("tool.call", async ($, e, next) => {
    const result = await next(e);
    $.ui.invalidate("ui.render");

    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    $.ui.invalidate("ui.render");

    return result;
  });

  on("command.run", async ($, e, next) => {
    const result = await next(e);
    $.ui.invalidate("ui.render");

    return result;
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e);
    const columns = Math.max(16, e.props.bodyColumns);
    const [messages, usage] = await Promise.all([
      $.session.messages(),
      $.session.usage(),
    ]);
    const prompts = promptsOf(messages);
    const { context, cost }: SessionUsage = usage;
    const percent = context.percent;
    const barWidth = Math.max(4, columns - 6);
    const filled =
      percent === undefined ? 0 : Math.round((percent / 100) * barWidth);

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>Contexto </Text>
          <Text dimColor>
            {percent === undefined ? "sin datos aún" : `${percent}%`}
          </Text>
        </Text>
        <Text>
          <Text
            color={percent === undefined ? "inactive" : usageColor(percent)}
          >
            {"█".repeat(filled)}
          </Text>
          <Text dimColor>{"░".repeat(barWidth - filled)}</Text>
        </Text>
        <Text dimColor>
          {context.tokens === undefined ? "—" : formatTokens(context.tokens)} /{" "}
          {formatTokens(context.window)} tokens
          {cost === undefined ? "" : ` · $${cost.usd.toFixed(2)}`}
        </Text>
        <Text dimColor>{"─".repeat(columns)}</Text>
        <Text bold>
          {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
        </Text>
        {prompts.length === 0 && (
          <Text dimColor>Aún no hay prompts en esta conversación.</Text>
        )}
        {prompts
          .map((text, index) => ({ text, number: index + 1 }))
          .reverse()
          .map(({ text, number }) => (
            <Text>
              <Text
                color={number === prompts.length ? "claude" : "inactive"}
              >{`${number}. `}</Text>
              {clip(text, columns * 2 - 4)}
            </Text>
          ))}
      </Box>
    );
  });
};

import { expect, test } from "claude-code/testing";
import type { TestBody } from "claude-code/testing";
import type { SessionMessage, UiPane } from "claude-code";

const PANE = {
  plugin: "timeline",
  component: "Pane",
  requestId: "timeline",
  props: {
    title: "Timeline",
    isFocused: false,
    bodyColumns: 40,
    placement: "dock",
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const;

const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Arregla el login", toolUses: [] },
  { role: "assistant", text: "Hecho.", toolUses: [] },
  {
    role: "user",
    text: "",
    toolUses: [],
    toolResults: [
      { tool_use_id: "t1", text: "ok", isError: false, result: {} },
    ],
  },
  {
    role: "user",
    text: "<system-reminder>internal</system-reminder>",
    toolUses: [],
  },
  {
    role: "user",
    text: "<command-name>/clear</command-name><command-args></command-args>",
    toolUses: [],
  },
  { role: "user", text: "[Request interrupted by user]", toolUses: [] },
  { role: "user", text: "Ahora añade\n  tests   al login", toolUses: [] },
];

const world = (on: Parameters<TestBody>[1], percent?: number) => {
  on("session.messages", () => ({ value: MESSAGES }));
  on("session.usage", () => ({
    value: {
      startedAt: 0,
      context: {
        tokens: percent === undefined ? undefined : 91_200,
        window: 200_000,
        percent,
      },
      rateLimits: [],
      cost: { usd: 3.4 },
    },
  }));
};

test("the pane lists the typed prompts, newest first, under the usage bar", async ($, on) => {
  world(on, 46);

  for (const surface of ["terminal", "desktop"] as const) {
    const ui = await $.ui.mount({ ...PANE, surface });

    expect(await ui.find({ type: "Text", text: /46%/ })).toBeDefined();
    expect(
      await ui.find({
        type: "Text",
        text: /91\.2k \/ 200\.0k tokens · \$3\.40/,
      }),
    ).toBeDefined();
    expect(await ui.find({ type: "Text", text: /^2 prompts$/ })).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: /2\. Ahora añade tests al login/ }),
    ).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: /1\. Arregla el login/ }),
    ).toBeDefined();
    expect(
      await ui.find({
        type: "Text",
        text: /internal|\/clear|interrupted|Hecho/,
      }),
    ).toBeUndefined();
    await ui.unmount();
  }
});

test("before the first response the bar says there is no data yet", async ($, on) => {
  world(on);
  const ui = await $.ui.mount({ ...PANE, surface: "terminal" });

  expect(await ui.find({ type: "Text", text: /sin datos aún/ })).toBeDefined();
  await ui.unmount();
});

test("the pane opens with the session, and /timeline toggles it", async ($, on) => {
  const calls: string[] = [];
  let panes: UiPane[] = [];

  on("command.register", (_, e) => ({ value: { command: e.name } }));
  on("session.start", (_, e) => ({ cwd: e.cwd }));
  on("ui.panes", () => ({ value: panes }));
  on("ui.open", (_, e) => {
    calls.push(`open ${e.id}`);
    panes = [{ id: e.id, title: "Timeline", isShown: true, isFocused: false, isPlaced: true }];

    return { value: { isPlaced: true } };
  });
  on("ui.close", (_, e) => {
    calls.push(`close ${e.id}`);
    panes = [];

    return { value: undefined };
  });
  on("command.run", () => ({}));

  await $.session.start({ cwd: "/", surface: "terminal", isInteractive: true });
  const run = () =>
    $.command.run({
      command: "timeline",
      args: "",
      origin: { kind: "composer" },
      presentation: { isFullscreen: true, columns: 160 },
    });

  await run();
  await run();
  await run();

  expect(calls).toEqual([
    "open timeline",
    "close timeline",
    "open timeline",
    "close timeline",
  ]);
});

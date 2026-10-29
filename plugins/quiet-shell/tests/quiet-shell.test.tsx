import { expect, test } from "claude-code/testing";
import type { TestBody } from "claude-code/testing";

const row = (props: Record<string, unknown>) =>
  ({
    plugin: "quiet-shell",
    component: "ToolUse",
    requestId: "toolu_1",
    surface: "terminal",
    props: {
      tool_use_id: "toolu_1",
      tool: "Bash",
      input: {
        command: 'python -I -c "print(1)"',
        description: "Count open cards",
      },
      isRunning: false,
      isErrored: false,
      isInterrupted: false,
      output: { stdout: "secret-output", stderr: "", interrupted: false },
      ...props,
    },
  }) as const;

const engine = (on: Parameters<TestBody>[1]) =>
  on("ui.render", ($, e) => {
    const { Text } = $.ui.resolve(e);

    return <Text>engine</Text>;
  });

test("a finished Bash call draws its description, not the command or output", async ($, on) => {
  engine(on);
  const ui = await $.ui.mount(row({}));

  expect(
    (await ui.find({ type: "Text", text: /Count open cards/ }))?.text,
  ).toContain("Count open cards");
  expect(
    await ui.find({ type: "Text", text: /python|secret-output|engine/ }),
  ).toBeUndefined();
  await ui.unmount();
});

test("a call with no description falls back to a label from its runtime", async ($, on) => {
  engine(on);
  const ui = await $.ui.mount(
    row({ input: { command: "cd x && node build.js" } }),
  );

  expect(
    await ui.find({ type: "Text", text: /Ejecutando un script de Node/ }),
  ).toBeDefined();
  await ui.unmount();
});

test("an errored call is marked as failed", async ($, on) => {
  engine(on);
  const ui = await $.ui.mount(row({ isErrored: true }));

  expect(await ui.find({ type: "Text", text: /falló/ })).toBeDefined();
  await ui.unmount();
});

test("ctrl+o (expanded) and other tools are left to the engine", async ($, on) => {
  engine(on);

  for (const props of [
    { isExpanded: true },
    { tool: "Read", input: { file_path: "a.ts" } },
  ]) {
    const ui = await $.ui.mount(row(props));

    expect((await ui.find({ type: "Text", text: /engine/ }))?.text).toBe(
      "engine",
    );
    await ui.unmount();
  }
});

test("the shell result block is hidden unless expanded", async ($, on) => {
  engine(on);
  const result = (isExpanded: boolean) =>
    ({
      plugin: "quiet-shell",
      component: "ToolResult",
      requestId: "toolu_1",
      surface: "terminal",
      props: {
        tool_use_id: "toolu_1",
        tool: "Bash",
        output: { stdout: "secret-output", stderr: "", interrupted: false },
        isErrored: false,
        isExpanded,
      },
    }) as const;

  const hidden = await $.ui.mount(result(false));
  expect(await hidden.find({ type: "Text", text: /engine/ })).toBeUndefined();
  await hidden.unmount();

  const shown = await $.ui.mount(result(true));
  expect((await shown.find({ type: "Text", text: /engine/ }))?.text).toBe(
    "engine",
  );
  await shown.unmount();
});

const group = (calls: ReadonlyArray<Record<string, unknown>>, isExpanded = false) =>
  ({
    plugin: "quiet-shell",
    component: "ToolGroup",
    requestId: "group_1",
    surface: "terminal",
    props: {
      isActive: true,
      isExpanded,
      calls: calls.map((call, index) => ({
        tool_use_id: `toolu_${index}`,
        tool: "Bash",
        input: {} as unknown,
        isRunning: false,
        isErrored: false,
        isInterrupted: false,
        ...call,
      })),
    },
  }) as const;

test("a folded group with a shell call draws descriptions, never the command", async ($, on) => {
  engine(on);
  const ui = await $.ui.mount(
    group([
      { input: { command: 'cat "a.txt"', description: "Read the notes file" }, isRunning: true },
      { input: { command: "ls -la" } },
      { tool: "Read", input: { file_path: "b.ts" } },
      { tool: "Read", input: { file_path: "c.ts" } },
      { tool: "Grep", input: { pattern: "foo" } },
    ]),
  );

  expect(await ui.find({ type: "Text", text: /Read the notes file/ })).toBeDefined();
  expect(await ui.find({ type: "Text", text: /Listando una carpeta/ })).toBeDefined();
  expect(await ui.find({ type: "Text", text: /2 ficheros leídos · 1 búsqueda/ })).toBeDefined();
  expect(await ui.find({ type: "Text", text: /cat |ls -la|engine/ })).toBeUndefined();
  await ui.unmount();
});

test("groups without shell calls, or unfolded, are left to the engine", async ($, on) => {
  engine(on);

  for (const props of [group([{ tool: "Read", input: { file_path: "a.ts" } }]), group([{ input: { command: "ls" } }], true)]) {
    const ui = await $.ui.mount(props);

    expect((await ui.find({ type: "Text", text: /engine/ }))?.text).toBe("engine");
    await ui.unmount();
  }
});

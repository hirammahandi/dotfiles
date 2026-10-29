# dotfiles

My dotfiles: the configuration files that usually live in `$HOME`, kept in Git so they can be backed up, restored and synced across machines. See [dotfiles.github.io](https://dotfiles.github.io/) for the background and the wider ecosystem of tools.

## Layout

The repo follows the [GNU Stow](https://www.gnu.org/software/stow/) convention: each top-level folder is a package, and the files inside it mirror their final location under `$HOME`.

```
dotfiles/
├── .claude-plugin/
│   └── marketplace.json            # makes the repo a Claude Code plugin marketplace
├── plugins/                        # Claude Code plugins, installed with /plugin (not a Stow package)
│   └── quiet-shell/
├── install.sh                      # symlinks the skills into ~/.claude/skills
└── claude/                         # package: Claude Code
    └── .claude/
        └── skills/
            └── code-review/        # -> ~/.claude/skills/code-review
                ├── SKILL.md
                ├── checklists.md
                ├── decision-matrix.md
                └── output-template.md
```

## Plugins

The repo is also a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces): `.claude-plugin/marketplace.json` lists the plugins under `plugins/`.

### quiet-shell

A [mod](https://code.claude.com/docs/en/plugins/mods/overview) that keeps the transcript clean. Every Bash or PowerShell call (shell commands, Python, Node, npm, git...) is drawn as one readable line, the call's `description`, instead of the command and the first lines of its output:

```
● Find Calendly links in the marketing pages
● Count open cards on the board (en segundo plano)
```

The dot shows the state: green when done, grey with `…` while it runs, red with `(falló)` when it errored, yellow with `(interrumpido)` when it was cut. A call with no `description` gets a label from the command it runs (`Ejecutando un script de Python`, `Buscando en el código`, ...). Claude Code's folded groups of read-only calls (`Reading 1 file…`, `Listed 1 directory`) that include a shell command are drawn the same way: one line per command, and the reads and searches in the group summed up in one line (`● 2 ficheros leídos · 1 búsqueda`), so no command, path or pattern shows. Groups with no shell command are left as Claude Code draws them, and `ctrl+o` still shows every command and its full output. It only changes the terminal; the desktop app and VS Code draw as before.

#### Install

At the prompt of a Claude Code terminal session (2.1.275 or later):

```
/plugin install quiet-shell --marketplace hirammahandi/dotfiles
```

Answer `y` to add the marketplace, then pick the user scope so it loads in every session. From a shell: `claude plugin install quiet-shell --marketplace hirammahandi/dotfiles`. In the desktop app, click + next to the prompt box, then Plugins, Add marketplace with `hirammahandi/dotfiles`, then Add plugin.

Update with `claude plugin update quiet-shell@hirammahandi` and then `/reload-plugins`; remove with `claude plugin uninstall quiet-shell@hirammahandi`.

#### Develop

`claude --plugin-dir ~/dotfiles/plugins/quiet-shell` loads the working copy for one session and reloads it on save. `claude plugin validate plugins/quiet-shell` checks it and `claude plugin test plugins/quiet-shell` runs its tests.

## Skills

[Claude Code skills](https://code.claude.com/docs/en/slash-commands) are folders with a `SKILL.md` file. Claude Code loads them from `~/.claude/skills/` (personal, every project) or from `<project>/.claude/skills/` (that project only).

### code-review

Multi-agent code review for a pull request or for local changes. It spawns a team of specialised reviewers (code quality, security, architecture, silent failures, tests, types, comments, performance, simplification), cross-validates their findings, drops anything scored below 80 on a 0-100 confidence scale and produces a report with an APPROVE / REQUEST CHANGES / COMMENT decision.

```
/code-review --pr 138 --severity strict --parallel --think-hard --auto-comment
/code-review --scope changed
/code-review --scope src/auth --severity quick
```

| Severity | Agents | Approx. time |
| --- | --- | --- |
| `quick` | `reviewer` only, no cross-validation | ~5 min |
| `normal` (default) | 5 agents (+ `type-analyst` for TypeScript type changes), full cross-validation | ~15 min |
| `strict` | all 9 agents, `--think-hard` enabled | ~30 min |

All flags, the agent dispatch matrix and the review phases are documented in [`SKILL.md`](claude/.claude/skills/code-review/SKILL.md). The skill is manual-only (`disable-model-invocation: true`): Claude never runs it on its own, you type `/code-review`.

#### Requirements

- [Claude Code](https://code.claude.com/docs) with agent teams enabled. They are experimental, so set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your environment or in the `env` block of `~/.claude/settings.json`.
- The [GitHub CLI](https://cli.github.com/) (`gh`), authenticated, for `--pr` and `--auto-comment`.
- The subagent types the skill dispatches:
  - `code-reviewer`, `silent-failure-hunter`, `pr-test-analyzer`, `type-design-analyzer`, `comment-analyzer`, `code-simplifier` come from the `pr-review-toolkit` plugin: `/plugin install pr-review-toolkit@claude-plugins-official`.
  - `security-engineer`, `system-architect`, `performance-engineer` come from the [SuperClaude Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) agents. Any agents with those names work.
- `--validate` runs `npm run lint`, `build`, `test`, `test:coverage` and `npm audit`, so the project needs those npm scripts.

#### Install from GitHub

**Option 1: clone and link (recommended).** The skill folder becomes a symlink into the clone, so `git pull` updates it.

```bash
git clone https://github.com/hirammahandi/dotfiles.git ~/dotfiles
~/dotfiles/install.sh code-review
```

`install.sh` with no arguments installs every skill in the repo. If a `code-review` folder already exists, it is moved to `~/.claude/skills.backup/` first. Pass `--copy` to copy instead of linking, or `--dest <dir>` to install somewhere else, for example a project: `~/dotfiles/install.sh --dest ./.claude/skills code-review`.

On Windows, run it from Git Bash. Native symlinks need [Developer Mode](https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development) enabled; without it the script falls back to copying.

**Option 2: GNU Stow.** Create the skills folder first so Stow links only the skill, not the whole `skills` directory.

```bash
git clone https://github.com/hirammahandi/dotfiles.git ~/dotfiles
mkdir -p ~/.claude/skills
stow --dir ~/dotfiles --target ~ claude
```

**Option 3: just the skill, no clone.** [degit](https://github.com/Rich-Harris/degit) downloads one folder of the repo without Git history. Re-run it with `--force` to update.

```bash
npx degit hirammahandi/dotfiles/claude/.claude/skills/code-review ~/.claude/skills/code-review
```

For a single project, point it at the project instead: `npx degit hirammahandi/dotfiles/claude/.claude/skills/code-review .claude/skills/code-review`.

**Option 4: Windows PowerShell.** A directory junction behaves like the symlink in option 1 and does not need Developer Mode.

```powershell
git clone https://github.com/hirammahandi/dotfiles.git "$HOME\dotfiles"
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
New-Item -ItemType Junction -Path "$HOME\.claude\skills\code-review" -Target "$HOME\dotfiles\claude\.claude\skills\code-review"
```

#### Check the install

Start a new Claude Code session and type `/code-review`. The autocomplete should describe it as "Multi-agent code review with cross-validation, confidence scoring, and decision matrix".

This skill replaces Claude Code's bundled `/code-review`. The bundled review is still available as `/review`. If the same skill exists in both `~/.claude/skills/` and a project's `.claude/skills/`, the personal one wins.

#### Uninstall

```bash
rm ~/.claude/skills/code-review       # symlink or junction
rm -rf ~/.claude/skills/code-review   # copied folder
stow --dir ~/dotfiles --target ~ --delete claude   # if installed with Stow
```

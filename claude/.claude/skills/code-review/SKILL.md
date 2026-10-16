---
name: code-review
disable-model-invocation: true
description: Multi-agent code review with cross-validation, confidence scoring, and decision matrix. Supports PR review and local change review with configurable severity. Manual-only; auto-trigger handled by pr-review-toolkit:review-pr.
user-invocable: true
---

# Code Review - Multi-Agent Team Analysis

Performs comprehensive code review using Agent Teams with cross-validation for PRs or local changes.

## Usage

```
/code-review --pr <number> [flags]           # PR review
/code-review --scope changed [flags]          # Local changes
/code-review --scope src/auth [flags]         # Specific path
```

## Parameters

- `--pr <number>`: GitHub PR number (required for PR review)
- `--scope <value>`: `all`, `changed` (default), or path like `src/auth`
- `--severity <level>`: `quick`, `normal` (default), `strict`
- `--parallel`: Enable parallel multi-agent analysis
- `--think-hard`: Promote all Sonnet agents to Opus
- `--serena`: Enable Serena MCP for semantic understanding
- `--validate`: Run quality gates and automated checks
- `--auto-comment`: Post review comments to PR
- `--auto-decision`: Auto approve/request changes based on findings

## Phase 1: Information Gathering (Parallel)

**PR Reviews** — run in parallel:
```bash
gh pr view <number> --json title,body,labels,state,author
gh pr diff <number> --patch
gh pr checks <number>
gh pr view <number> --json comments,reviews
```

**Local Reviews** — run in parallel:
```bash
git status && git diff --cached && git diff HEAD && git log -5 --oneline
```

Capture diff output for inclusion in every agent's task description.

## Phase 2: Team-Based Review

1. **Create team**: `TeamCreate` with name `code-review-pr-{number}`
2. **Create tasks**: One `TaskCreate` per agent with diff, scope, and confidence rubric (0-100, report >= 80)
3. **Spawn teammates and assign**

### Agent Dispatch Matrix

| Name | subagent_type | quick | normal | strict | Model |
|------|--------------|-------|--------|--------|-------|
| `reviewer` | `code-reviewer` | Yes | Yes | Yes | sonnet |
| `security` | `security-engineer` | - | Yes | Yes | opus |
| `architect` | `system-architect` | - | Yes | Yes | sonnet |
| `failure-hunter` | `silent-failure-hunter` | - | Yes | Yes | sonnet |
| `test-analyst` | `pr-test-analyzer` | - | Yes | Yes | sonnet |
| `type-analyst` | `type-design-analyzer` | - | * | Yes | sonnet |
| `comment-analyst` | `comment-analyzer` | - | - | Yes | sonnet |
| `perf-analyst` | `performance-engineer` | - | - | Yes | sonnet |
| `simplifier` | `code-simplifier` | - | - | Yes | opus |

*`type-analyst` in normal: include only if diff has `.ts` files with `type`/`interface`/`enum`.*
*`--think-hard`: all Sonnet agents promote to Opus.*

4. **Monitor**: Poll `TaskList` until all complete
5. **Cross-validation**: Broadcast Critical/High findings (>= 80 confidence) to all teammates for corroboration/challenge
6. **Shutdown**: `SendMessage(type: "shutdown_request")` to each, then `TeamDelete`

## Phase 3: Synthesis

1. Discard findings with confidence < 80
2. Deduplicate findings referencing same file:line across agents
3. Integrate cross-validation: upgrade corroborated, downgrade challenged
4. Read `checklists.md` and `decision-matrix.md` from this skill directory
5. Generate report using `output-template.md`
6. Apply decision using decision matrix
7. If `--auto-comment`: post via `gh pr review`
8. If `--auto-decision`: approve or request changes

## Severity Configurations

- **Quick** (~5 min): `reviewer` only, no cross-validation
- **Normal** (~15 min): 5 agents + conditional `type-analyst`, full cross-validation
- **Strict** (~30 min): All 9 agents, `--think-hard` auto-enabled, `simplifier` runs last

## Automated Checks (--validate)
```bash
npm run lint && npm run build && npm run test && npm run test:coverage && npm audit
```

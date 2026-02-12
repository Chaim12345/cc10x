# OpenCode cc10x Plugin

**The Intelligent Orchestrator for OpenCode**

**Notice: Credit to the original cc10x project and maintainers. This repository is a fork; changes here are limited to OpenCode compatibility and runtime adaptation.**

cc10x is a native OpenCode orchestration plugin that routes development requests into structured workflows (build/debug/review/plan) using specialized OpenCode agents.

Package: `opencode-cc10x` (npm)

## Quickstart

1) Add the plugin to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cc10x"]
}
```

2) Install the npm package:

```bash
npm add opencode-cc10x
# or
bun add opencode-cc10x
```

To pin a specific version:

```bash
npm add opencode-cc10x@6.0.24
```

3) Restart OpenCode.

4) If you do not see commands, run:

```bash
npx opencode-cc10x init
```

## Usage

Type a normal dev task; cc10x routes it automatically:

- "build a settings page with tests"
- "debug this failing CI job"
- "review this diff for security"
- "plan a migration strategy"

Or use the explicit command: `/cc10x-orchestrate <your task>`.

## What You Get

- **Automatic intent detection**: BUILD / DEBUG / REVIEW / PLAN
- **6 cc10x agents**: `cc10x-component-builder`, `cc10x-bug-investigator`, `cc10x-code-reviewer`, `cc10x-silent-failure-hunter`, `cc10x-integration-verifier`, `cc10x-planner`
- **Skills bundle**: session memory, TDD discipline, planning patterns, debugging patterns, review patterns
- **Parallel execution**: reviewer + silent failure hunter run in parallel for BUILD
- **Persistent memory**: `.opencode/cc10x/` survives compaction and keeps work resumable

## How It Works

```
User message
  -> cc10x router
    -> loads `.opencode/cc10x/*`
    -> chooses workflow
    -> runs subagents (and parallel steps when needed)
    -> updates `.opencode/cc10x/*` with evidence/notes
```

## Commands

The installer writes command files into `~/.config/opencode/commands/`:

- `cc10x-orchestrate`
- `cc10x-build`
- `cc10x-debug`
- `cc10x-review`
- `cc10x-plan`

If you customize these files, re-running `npx opencode-cc10x init --commands-only` will not overwrite content, but it may apply safe migrations.

## Alternative Install (No npm/bun)

This installs directly from GitHub without cloning:

```bash
curl -fsSL https://raw.githubusercontent.com/Chaim12345/cc10x/main/project/opencode-cc10x-plugin/install-from-github.mjs | node
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Chaim12345/cc10x/main/project/opencode-cc10x-plugin/install-from-github.mjs | node
```

## Configuration

### Agent Settings

You can override the bundled agent defaults in `~/.config/opencode/opencode.json`:

```json
{
  "agent": {
    "cc10x-component-builder": {
      "temperature": 0.3,
      "model": "inherit"
    },
    "cc10x-code-reviewer": {
      "temperature": 0.1,
      "model": "inherit"
    }
  }
}
```

Notes:

- cc10x commands and agents are set to inherit your main/default model unless you override them here.

### Permissions

cc10x follows OpenCode's builtin permission model.

If you want a zero-prompt local dev setup, set global allow:

```json
{
  "permission": {
    "*": "allow"
  }
}
```

## Memory

cc10x stores persistent memory in:

```
.opencode/cc10x/
├── activeContext.md
├── patterns.md
└── progress.md
```

This directory is created in your current project/workspace root.

Compatibility behavior:

- Auto-detect priority: `.opencode/cc10x/` first, then `.claude/cc10x/`
- You can force a specific memory directory with `CC10X_MEMORY_DIR`

Example:

```bash
CC10X_MEMORY_DIR=.claude/cc10x opencode
```

## Compatibility

- **Plugin Version**: `6.0.24`
- **OpenCode Plugin API**: `@opencode-ai/plugin` `^1.1.60`
- **Node.js**: 18+
- **Bun**: 1.0+

To confirm what you have installed:

```bash
npm view opencode-cc10x version
```

## Development

```bash
bun install
bun test
npm run build
```

## Troubleshooting

- **Commands missing**: `npx opencode-cc10x init`
- **Agents missing**: restart OpenCode, then run `opencode agent list`
- **Plugin not loading**: verify `"plugin": ["opencode-cc10x"]` in `~/.config/opencode/opencode.json`
- **Memory not updating**: ensure `.opencode/cc10x/` is writable

## License

MIT

**Notice: Credit to the original cc10x project and maintainers. This repository is a fork; changes here are limited to OpenCode compatibility and runtime adaptation.**

# OpenCode cc10x Plugin

**The Intelligent Orchestrator for OpenCode**

A native OpenCode orchestration plugin providing intelligent workflow automation, TDD enforcement, and multi-agent coordination.

Current release: `6.0.24`

## Features

- **Automatic Intent Detection** - Router automatically detects BUILD, DEBUG, REVIEW, or PLAN intents
- **6 Specialized Agents** - Component builder, bug investigator, code reviewer, silent failure hunter, integration verifier, planner
- **12 Supporting Skills** - Session memory, TDD enforcement, code generation, debugging patterns, and more
- **Task-Based Orchestration** - Uses OpenCode's Task system for coordinated multi-agent workflows
- **Memory Persistence** - Survives context compaction with .opencode/cc10x/ memory bank
- **Parallel Execution** - Code reviewer and silent failure hunter run simultaneously
- **Confidence Scoring** - 80%+ threshold for issue reporting
- **TDD Enforcement** - RED → GREEN → REFACTOR cycle with exit code verification

## Architecture

```
USER REQUEST
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  cc10x-router (OpenCode Plugin)                                 │
│  ├─ Intent Detection                                           │
│  ├─ Memory Loading (.opencode/cc10x/)                          │
│  ├─ Task Hierarchy Creation                                    │
│  └─ Workflow Orchestration                                     │
└─────────────────────────────────────────────────────────────────┘
    │
    ├─ BUILD → component-builder → [code-reviewer ∥ silent-failure-hunter] → integration-verifier
    ├─ DEBUG → bug-investigator → code-reviewer → integration-verifier
    ├─ REVIEW → code-reviewer
    └─ PLAN → planner
```

## Installation

### Prerequisites
- OpenCode installed and configured
- Node.js/Bun available for plugin dependencies

### Steps

1. **Add the plugin to your OpenCode configuration:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cc10x"]
}
```

2. **Install the plugin (recommended):**

```bash
npm add opencode-cc10x@6.0.24
# or
bun add opencode-cc10x@6.0.24
```

3. **Alternative one-command install (no clone):**

```bash
curl -fsSL https://raw.githubusercontent.com/Chaim12345/cc10x/main/project/opencode-cc10x-plugin/install-from-github.mjs | node
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Chaim12345/cc10x/main/project/opencode-cc10x-plugin/install-from-github.mjs | node
```

If commands do not appear in OpenCode, run:

```bash
npx opencode-cc10x init
```

If you are testing locally before publishing, install from a tarball:

```bash
npm pack
npm add ./opencode-cc10x-<version>.tgz
```

4. **Set up cc10x memory directory:**

The plugin will automatically create `.opencode/cc10x/` on first use.

5. **Configure agents (optional):**

The plugin automatically configures the necessary agents. You can customize them in your `opencode.json`:

```json
{
  "agent": {
    "cc10x-component-builder": {
      "color": "#00ff00",
      "temperature": 0.3
    },
    "cc10x-code-reviewer": {
      "color": "#ffff00", 
      "temperature": 0.1
    }
  }
}
```

## Usage

Once installed, cc10x automatically activates for development tasks:

- **"Build a user authentication system"** → Triggers BUILD workflow
- **"Debug the payment error"** → Triggers DEBUG workflow  
- **"Review this PR for security issues"** → Triggers REVIEW workflow
- **"Plan the database schema"** → Triggers PLAN workflow

The router handles all orchestration automatically - no manual skill selection needed.

## Configuration

### Agent Customization

All cc10x agents can be configured in `opencode.json`:

```json
{
  "agent": {
    "cc10x-component-builder": {
      "description": "Builds features using TDD",
      "model": "inherit",
      "temperature": 0.3,
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      }
    }
  }
}
```

### Permissions

The plugin follows OpenCode's builtin permission model. If your environment prompts more than expected, set explicit global allow in your local `opencode.json`:

```json
{
  "permission": {
    "*": "allow"
  }
}
```

### Skill Permissions

cc10x skills are automatically loaded. Control access with:

```json
{
  "permission": {
    "skill": {
      "cc10x:*": "allow"
    }
  }
}
```

## Memory System

cc10x uses `.opencode/cc10x/` for persistent memory:

```
.opencode/cc10x/
├── activeContext.md   # Current focus, decisions, learnings
├── patterns.md        # Project conventions, common gotchas
└── progress.md        # Completed work, verification evidence
```

This memory survives context compaction and enables:
- Continuity across sessions
- Pattern learning and reuse
- Resumable workflows
- Decision tracking

## Workflows

### BUILD Workflow
1. **component-builder** - Implements feature with TDD
2. **code-reviewer** + **silent-failure-hunter** (parallel) - Quality and edge case analysis
3. **integration-verifier** - End-to-end validation

### DEBUG Workflow  
1. **bug-investigator** - Log-first investigation
2. **code-reviewer** - Fix validation
3. **integration-verifier** - Verification

### REVIEW Workflow
1. **code-reviewer** - Comprehensive code analysis with 80%+ confidence

### PLAN Workflow
1. **planner** - Creates detailed plans with research

## Development

### Building the Plugin

```bash
cd opencode-cc10x-plugin
bun install
bun build
```

### Testing

```bash
# Run plugin tests
bun test

# Test with OpenCode
opencode --plugin ./dist/
```

## Compatibility

- **Plugin Version**: `6.0.24`
- **OpenCode Plugin API**: `@opencode-ai/plugin` `^1.1.60`
- **OpenCode**: latest stable release recommended
- **Node.js**: 18+
- **Bun**: 1.0+

## Troubleshooting

### Plugin not loading
- Check OpenCode version compatibility
- Verify plugin is in `opencode.json` plugins list
- Check `~/.config/opencode/plugins/` for installation

### Agents not available
- Run `opencode agent list` to see available agents
- Check agent configuration in `opencode.json`
- Restart OpenCode after plugin installation

### Memory issues
- Ensure `.opencode/cc10x/` directory exists and is writable
- Check file permissions
- Plugin will auto-create missing files with templates

## Contributing

For issues or enhancements:

1. Check existing issues
2. Keep behavior aligned with OpenCode plugin patterns
3. Maintain the core cc10x principles and workflows
4. Test with both simple and complex development tasks

## License

MIT

## Acknowledgments

- OpenCode team for the plugin system

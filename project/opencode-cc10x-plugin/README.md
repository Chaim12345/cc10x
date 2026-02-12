# OpenCode cc10x Plugin

**The Intelligent Orchestrator for OpenCode**

A complete port of the cc10x orchestration system from Claude Code to OpenCode, providing intelligent workflow automation, TDD enforcement, and multi-agent coordination.

## Features

- **Automatic Intent Detection** - Router automatically detects BUILD, DEBUG, REVIEW, or PLAN intents
- **6 Specialized Agents** - Component builder, bug investigator, code reviewer, silent failure hunter, integration verifier, planner
- **12 Supporting Skills** - Session memory, TDD enforcement, code generation, debugging patterns, and more
- **Task-Based Orchestration** - Uses OpenCode's Task system for coordinated multi-agent workflows
- **Memory Persistence** - Survives context compaction with .claude/cc10x/ memory bank
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
│  ├─ Memory Loading (.claude/cc10x/)                            │
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

2. **Install the plugin (single command, no clone):**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Chaim12345/cc10x/opencode-unified-structure/project/opencode-cc10x-plugin/install-from-github.sh)
```

3. **Alternative package-manager install:**

```bash
npm add opencode-cc10x
bun add opencode-cc10x
```

If you are testing locally before publishing, install from a tarball:

```bash
npm pack
npm add ./opencode-cc10x-<version>.tgz
```

4. **Set up cc10x memory directory:**

The plugin will automatically create `.claude/cc10x/` on first use.

5. **Configure agents (optional):**

The plugin automatically configures the necessary agents. You can customize them in your `opencode.json`:

```json
{
  "agent": {
    "component-builder": {
      "color": "green",
      "temperature": 0.3
    },
    "code-reviewer": {
      "color": "yellow", 
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
    "component-builder": {
      "description": "Builds features using TDD",
      "model": "anthropic/claude-sonnet-4-20250514",
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

The plugin requires these permissions for proper operation:

```json
{
  "permission": {
    "bash": {
      "mkdir *": "allow",
      "git *": "allow"
    },
    "edit": "allow",
    "write": "allow"
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

cc10x uses `.claude/cc10x/` for persistent memory:

```
.claude/cc10x/
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

- **OpenCode Version**: 0.8.0+
- **Node.js**: 18+
- **Bun**: 1.0+

## Migration from Claude Code

If you're migrating from Claude Code:

1. Install this plugin in OpenCode
2. Copy your existing `.claude/cc10x/` memory files to the project root
3. The plugin will automatically use your existing memory
4. All cc10x workflows will work identically

## Differences from Claude Code

| Aspect | Claude Code | OpenCode cc10x |
|--------|-------------|----------------|
| Plugin Format | Marketplace plugin | npm package + OpenCode plugin |
| Agent System | Custom agent framework | OpenCode native agents |
| Task System | Claude Code Tasks | OpenCode Task tool |
| Memory | .claude/cc10x/ | Same location, adapted APIs |
| Skills | Claude skills | OpenCode skills with compatibility layer |

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
- Ensure `.claude/cc10x/` directory exists and is writable
- Check file permissions
- Plugin will auto-create missing files with templates

## Contributing

This is a faithful port of cc10x. For issues or enhancements:

1. Check existing issues
2. Ensure compatibility with both Claude Code and OpenCode patterns
3. Maintain the core cc10x principles and workflows
4. Test with both simple and complex development tasks

## License

MIT - Same as original cc10x

## Acknowledgments

- Original cc10x by romiluz13
- OpenCode team for the excellent plugin system
- Claude Code team for the orchestration patterns

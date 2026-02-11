#!/bin/bash

# OpenCode cc10x Plugin Installer
# This script installs and configures the cc10x orchestration system for OpenCode

set -e

echo "🔌 Installing OpenCode cc10x Plugin..."

# Check if OpenCode is installed
if ! command -v opencode &> /dev/null; then
    echo "❌ OpenCode is not installed. Please install OpenCode first."
    exit 1
fi

# Create plugin directory
PLUGIN_DIR="$HOME/.config/opencode/plugins"
mkdir -p "$PLUGIN_DIR"

# Copy plugin file
echo "📦 Installing plugin..."
cp dist/index.js "$PLUGIN_DIR/opencode-cc10x.js"

# Create global config
CONFIG_DIR="$HOME/.config/opencode"
CONFIG_FILE="$CONFIG_DIR/opencode.json"

echo "⚙️  Creating global configuration..."

# Create config with proper structure
cat > "$CONFIG_FILE" << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cc10x"],
  "command": {
    "cc10x-orchestrate": {
      "template": "Run cc10x intelligent orchestration for this development task: ${input}",
      "description": "Intelligent orchestration system for development tasks with multi-agent workflows",
      "agent": "planner",
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "cc10x-build": {
      "template": "Build this feature using TDD: ${input}",
      "description": "Build features using TDD cycle (RED → GREEN → REFACTOR)",
      "agent": "component-builder",
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "cc10x-debug": {
      "template": "Debug this issue: ${input}",
      "description": "Investigate and fix bugs with log-first approach",
      "agent": "bug-investigator",
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "cc10x-review": {
      "template": "Review this code: ${input}",
      "description": "Comprehensive code review with 80%+ confidence threshold",
      "agent": "code-reviewer",
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "cc10x-plan": {
      "template": "Create a comprehensive plan for: ${input}",
      "description": "Create detailed plans with research and architecture design",
      "agent": "planner",
      "model": "anthropic/claude-sonnet-4-20250514"
    }
  },
  "agent": {
    "component-builder": {
      "description": "Builds features using TDD cycle (RED → GREEN → REFACTOR). Part of cc10x orchestration system.",
      "mode": "subagent",
      "temperature": 0.3,
      "color": "#00ff00",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true,
        "askUserQuestion": true
      }
    },
    "bug-investigator": {
      "description": "Investigates bugs with log-first approach. Part of cc10x orchestration system.",
      "mode": "subagent", 
      "temperature": 0.2,
      "color": "#ffa500",
      "tools": {
        "write": false,
        "edit": false,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true,
        "webfetch": true
      }
    },
    "code-reviewer": {
      "description": "Reviews code with 80%+ confidence threshold. Part of cc10x orchestration system.",
      "mode": "subagent",
      "temperature": 0.1,
      "color": "#ffff00",
      "tools": {
        "write": false,
        "edit": false,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true
      }
    },
    "silent-failure-hunter": {
      "description": "Finds silent failures and error handling gaps. Part of cc10x orchestration system.",
      "mode": "subagent",
      "temperature": 0.2,
      "color": "#ff0000",
      "tools": {
        "write": false,
        "edit": false,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true
      }
    },
    "integration-verifier": {
      "description": "Performs end-to-end validation. Part of cc10x orchestration system.",
      "mode": "subagent",
      "temperature": 0.1,
      "color": "#0000ff",
      "tools": {
        "write": false,
        "edit": false,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true,
        "askUserQuestion": true
      }
    },
    "planner": {
      "description": "Creates comprehensive plans with research. Part of cc10x orchestration system.",
      "mode": "subagent",
      "temperature": 0.4,
      "color": "#800080",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true,
        "grep": true,
        "glob": true,
        "skill": true,
        "lsp": true,
        "webfetch": true
      }
    }
  },
  "permission": {
    "bash": {
      "mkdir -p .claude/cc10x": "allow",
      "git status": "allow",
      "git diff": "allow",
      "git log": "allow",
      "npm test": "allow",
      "yarn test": "allow",
      "bun test": "allow",
      "npm start": "allow",
      "*": "ask"
    },
    "edit": "allow",
    "write": "allow",
    "skill": {
      "cc10x:*": "allow"
    }
  }
}
EOF

# Create commands directory
COMMANDS_DIR="$CONFIG_DIR/commands"
mkdir -p "$COMMANDS_DIR"

echo "📝 Creating command files..."

# Create cc10x-orchestrate command
cat > "$COMMANDS_DIR/cc10x-orchestrate.md" << 'EOF'
---
description: Intelligent orchestration system for development tasks with multi-agent workflows
agent: planner
model: anthropic/claude-sonnet-4-20250514
---

Run cc10x intelligent orchestration for this development task:

$ARGUMENTS

This will automatically detect the intent and orchestrate the appropriate workflow with multiple specialized agents.
EOF

# Create cc10x-build command
cat > "$COMMANDS_DIR/cc10x-build.md" << 'EOF'
---
description: Build features using TDD cycle (RED → GREEN → REFACTOR)
agent: component-builder
model: anthropic/claude-sonnet-4-20250514
---

Build this feature using TDD:

$ARGUMENTS

Follow the TDD cycle strictly:
1. RED: Write a failing test first
2. GREEN: Write minimal code to pass
3. REFACTOR: Clean up while keeping tests green
4. VERIFY: All tests must pass
EOF

# Create cc10x-debug command
cat > "$COMMANDS_DIR/cc10x-debug.md" << 'EOF'
---
description: Investigate and fix bugs with log-first approach
agent: bug-investigator
model: anthropic/claude-sonnet-4-20250514
---

Debug this issue:

$ARGUMENTS

Use a log-first approach to:
1. Identify the root cause
2. Find all related error logs
3. Propose fixes with evidence
4. Implement the solution
EOF

# Create cc10x-review command
cat > "$COMMANDS_DIR/cc10x-review.md" << 'EOF'
---
description: Comprehensive code review with 80%+ confidence threshold
agent: code-reviewer
model: anthropic/claude-sonnet-4-20250514
---

Review this code:

$ARGUMENTS

Perform a comprehensive code review with 80%+ confidence threshold:
- Check for bugs and security issues
- Verify code quality and best practices
- Suggest improvements
- Only approve if confidence is high
EOF

# Create cc10x-plan command
cat > "$COMMANDS_DIR/cc10x-plan.md" << 'EOF'
---
description: Create detailed plans with research and architecture design
agent: planner
model: anthropic/claude-sonnet-4-20250514
---

Create a comprehensive plan for:

$ARGUMENTS

Include:
- Research phase
- Architecture design
- Implementation steps
- Risk assessment
- Timeline estimates
EOF

echo "✅ Installation complete!"
echo ""
echo "📁 Files installed:"
echo "  Plugin: $PLUGIN_DIR/opencode-cc10x.js"
echo "  Config: $CONFIG_FILE"
echo "  Commands: $COMMANDS_DIR/"
echo ""
echo "🚀 Usage:"
echo "  • Start OpenCode: opencode"
echo "  • Press '/' to see cc10x commands"
echo "  • Or use directly: /cc10x-orchestrate <task>"
echo "  • Or run: opencode run \"<your task>\""
echo ""
echo "🎯 The cc10x orchestration system is now ready!"
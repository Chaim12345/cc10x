import { join } from 'path';
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';

const HOME = homedir();
const CONFIG_DIR = process.platform === 'win32' 
  ? join(HOME, 'AppData', 'Roaming', 'opencode')
  : join(HOME, '.config', 'opencode');
const PLUGINS_DIR = join(CONFIG_DIR, 'plugins');
const COMMANDS_DIR = join(CONFIG_DIR, 'commands');

const PLUGIN_NAME = 'opencode-cc10x';
const PLUGIN_SOURCE = join(process.cwd(), 'dist', 'index.js');
const PLUGIN_DEST = join(PLUGINS_DIR, `${PLUGIN_NAME}.js`);

const CONFIG_TEMPLATE = {
  "$schema": "https://opencode.ai/config.json",
  "plugin": [PLUGIN_NAME],
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
};

const COMMAND_FILES = {
  'cc10x-orchestrate.md': `---
description: Intelligent orchestration system for development tasks with multi-agent workflows
agent: planner
model: anthropic/claude-sonnet-4-20250514
---

Run cc10x intelligent orchestration for this development task:

$ARGUMENTS

This will automatically detect the intent and orchestrate the appropriate workflow with multiple specialized agents.`,
  'cc10x-build.md': `---
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
4. VERIFY: All tests must pass`,
  'cc10x-debug.md': `---
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
4. Implement the solution`,
  'cc10x-review.md': `---
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
- Only approve if confidence is high`,
  'cc10x-plan.md': `---
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
- Timeline estimates`,
  'cc10x-router.md': `---
description: Main cc10x orchestration router - the only entry point for development tasks
agent: planner
model: anthropic/claude-sonnet-4-20250514
---

Execute cc10x intelligent orchestration router for this task:

$ARGUMENTS

This is the main entry point that will:
1. Detect the intent (BUILD/DEBUG/REVIEW/PLAN)
2. Load memory from .claude/cc10x/
3. Orchestrate the appropriate multi-agent workflow
4. Update memory with results

All development tasks should go through this router.`
};

async function install() {
  console.log('🔌 Installing OpenCode cc10x Plugin...');

  // Check if OpenCode is installed (optional)
  try {
    const { execSync } = await import('child_process');
    execSync('opencode --version', { stdio: 'ignore' });
  } catch (error) {
    console.warn('⚠️  OpenCode not found. Make sure OpenCode is installed.');
  }

  // Create directories
  try {
    mkdirSync(PLUGINS_DIR, { recursive: true });
    mkdirSync(COMMANDS_DIR, { recursive: true });
  } catch (error) {
    console.error('❌ Failed to create directories:', error);
    process.exit(1);
  }

  // Copy plugin file
  try {
    if (!existsSync(PLUGIN_SOURCE)) {
      console.error('❌ Plugin file not found. Make sure the package is built correctly.');
      console.error('   Expected:', PLUGIN_SOURCE);
      console.error('   CWD:', process.cwd());
      process.exit(1);
    }
    cpSync(PLUGIN_SOURCE, PLUGIN_DEST);
  } catch (error) {
    console.error('❌ Failed to copy plugin:', error);
    process.exit(1);
  }

  // Create or update global config
  try {
    const configPath = join(CONFIG_DIR, 'opencode.json');
    let config = CONFIG_TEMPLATE;
    
    if (existsSync(configPath)) {
      try {
        const existingContent = readFileSync(configPath, 'utf-8');
        const existing = JSON.parse(existingContent);
        // Merge plugin into existing config
        config = { ...existing, plugin: [...(existing.plugin || []), PLUGIN_NAME].filter((v, i, a) => a.indexOf(v) === i) };
      } catch (error) {
        console.warn('⚠️  Could not parse existing config, creating new one');
      }
    }
    
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created/updated global config:', configPath);
  } catch (error) {
    console.error('❌ Failed to create config:', error);
    process.exit(1);
  }

  // Create command files
  try {
    for (const [filename, content] of Object.entries(COMMAND_FILES)) {
      const filepath = join(COMMANDS_DIR, filename);
      writeFileSync(filepath, content);
    }
    console.log('✅ Created command files:', Object.keys(COMMAND_FILES).join(', '));
  } catch (error) {
    console.error('❌ Failed to create command files:', error);
    process.exit(1);
  }

  console.log('');
  console.log('🎉 OpenCode cc10x Plugin installed successfully!');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('  1. Restart OpenCode if it\'s running');
  console.log('  2. Press "/" to see cc10x commands');
  console.log('  3. Try: /cc10x-orchestrate "Build a simple API"');
  console.log('');
  console.log('📚 Memory directory will be created automatically: .claude/cc10x/');
  console.log('');
}

console.log('About to call install()...');
install().then(() => {
  console.log('✅ Install function completed successfully');
}).catch(error => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
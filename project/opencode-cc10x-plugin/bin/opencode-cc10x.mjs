#!/usr/bin/env node

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PLUGIN_NAME = "opencode-cc10x";

function configBase() {
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

function opencodeConfigDir() {
  return path.join(configBase(), "opencode");
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function readBundledOpencodeConfig() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgDir = path.resolve(scriptDir, "..");
  const configPath = path.join(pkgDir, "opencode.json");
  const raw = readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function isPlainObject(v) {
  return Boolean(v && typeof v === "object" && !Array.isArray(v));
}

function deepMerge(target, source) {
  // Merge objects without overwriting user customizations.
  // Arrays are unioned (unique by primitive identity) and objects merge recursively.
  if (!isPlainObject(target) || !isPlainObject(source)) return target;

  for (const [k, sv] of Object.entries(source)) {
    const tv = target[k];
    if (tv === undefined) {
      target[k] = sv;
      continue;
    }
    if (Array.isArray(tv) && Array.isArray(sv)) {
      const set = new Set(tv);
      for (const item of sv) set.add(item);
      target[k] = Array.from(set);
      continue;
    }
    if (isPlainObject(tv) && isPlainObject(sv)) {
      deepMerge(tv, sv);
      continue;
    }
    // Keep user's existing value.
  }
  return target;
}

function upsertOpencodeJson(pluginName) {
  const cfgDir = opencodeConfigDir();
  const cfgFile = path.join(cfgDir, "opencode.json");
  ensureDir(cfgDir);

  let cfg = {};
  if (existsSync(cfgFile)) {
    try {
      cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Refusing to modify invalid JSON at ${cfgFile}. Fix the file first. Parse error: ${detail}`
      );
    }
  }

  // Ensure base schema + plugin list.
  if (!Array.isArray(cfg.plugin)) cfg.plugin = [];
  if (!cfg.plugin.includes(pluginName)) cfg.plugin.push(pluginName);
  if (!cfg.$schema) cfg.$schema = "https://opencode.ai/config.json";

  // Merge bundled configuration (agents, permissions, etc.) without clobbering user customizations.
  // This is how we make "everything loads automatically" work in a package-managed install.
  const bundled = readBundledOpencodeConfig();
  deepMerge(cfg, bundled);

  writeFileSync(cfgFile, `${JSON.stringify(cfg, null, 2)}\n`);
}

function writeCommands() {
  const commandsDir = path.join(opencodeConfigDir(), "commands");
  ensureDir(commandsDir);

  const files = [
    {
      name: "cc10x-orchestrate.md",
      content: `---\ndescription: Intelligent orchestration system for development tasks with multi-agent workflows\nagent: cc10x-planner\n---\n\nRun cc10x intelligent orchestration for this development task:\n\n$ARGUMENTS\n\nThis will automatically detect the intent and orchestrate the appropriate workflow with multiple specialized agents.\n`,
    },
    {
      name: "cc10x-build.md",
      content: `---\ndescription: Build features using TDD cycle (RED -> GREEN -> REFACTOR)\nagent: cc10x-component-builder\n---\n\nBuild this feature using TDD:\n\n$ARGUMENTS\n\nFollow the TDD cycle strictly:\n1. RED: Write a failing test first\n2. GREEN: Write minimal code to pass\n3. REFACTOR: Clean up while keeping tests green\n4. VERIFY: All tests must pass\n`,
    },
    {
      name: "cc10x-debug.md",
      content: `---\ndescription: Investigate and fix bugs with log-first approach\nagent: cc10x-bug-investigator\n---\n\nDebug this issue:\n\n$ARGUMENTS\n\nUse a log-first approach to:\n1. Identify the root cause\n2. Find all related error logs\n3. Propose fixes with evidence\n4. Implement the solution\n`,
    },
    {
      name: "cc10x-review.md",
      content: `---\ndescription: Comprehensive code review with 80%+ confidence threshold\nagent: cc10x-code-reviewer\n---\n\nReview this code:\n\n$ARGUMENTS\n\nPerform a comprehensive code review with 80%+ confidence threshold:\n- Check for bugs and security issues\n- Verify code quality and best practices\n- Suggest improvements\n- Only approve if confidence is high\n`,
    },
    {
      name: "cc10x-plan.md",
      content: `---\ndescription: Create detailed plans with research and architecture design\nagent: cc10x-planner\n---\n\nCreate a comprehensive plan for:\n\n$ARGUMENTS\n\nInclude:\n- Research phase\n- Architecture design\n- Implementation steps\n- Risk assessment\n- Timeline estimates\n`,
    },
  ];

  for (const f of files) {
    const target = path.join(commandsDir, f.name);
    if (!existsSync(target)) {
      writeFileSync(target, f.content);
      continue;
    }

    const current = readFileSync(target, "utf8");
    const migrated = current
      .replace(/(^|\n)agent:\s*planner(\n|$)/g, "$1agent: cc10x-planner$2")
      .replace(/(^|\n)agent:\s*component-builder(\n|$)/g, "$1agent: cc10x-component-builder$2")
      .replace(/(^|\n)agent:\s*bug-investigator(\n|$)/g, "$1agent: cc10x-bug-investigator$2")
      .replace(/(^|\n)agent:\s*code-reviewer(\n|$)/g, "$1agent: cc10x-code-reviewer$2")
      .replace(/(^|\n)model:\s*anthropic\/claude-sonnet-4-20250514(\n|$)/g, "$1");

    if (migrated !== current) {
      writeFileSync(target, migrated);
    }
  }
}

function canPrompt() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function shouldAttemptSudo() {
  if (process.platform === "win32") return false;
  if (typeof process.getuid === "function" && process.getuid() === 0) return false;
  if (process.env.CC10X_ELEVATED === "1") return false;
  return canPrompt();
}

function reRunWithSudo(argv) {
  const nodePath = process.execPath;
  const scriptPath = path.resolve(argv[1]);
  const args = ["-E", nodePath, scriptPath, ...argv.slice(2)];
  const result = spawnSync("sudo", args, { stdio: "inherit" });
  process.exit(result.status ?? 1);
}

function usage() {
  console.log(
    `Usage: opencode-cc10x <command>\n\nCommands:\n  init   Install OpenCode commands and merge bundled config into opencode.json\n`
  );
}

async function main() {
  const cmd = process.argv[2] || "";
  if (cmd === "init") {
    const args = process.argv.slice(3);
    const commandsOnly = args.includes("--commands-only");
    const isPostinstall = args.includes("--postinstall");

    try {
      if (!commandsOnly) upsertOpencodeJson(PLUGIN_NAME);
      writeCommands();
      console.log("cc10x initialized: commands installed" + (commandsOnly ? "" : " and plugin ensured in opencode.json"));
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : "";
      if (code === "EACCES" || code === "EPERM") {
        console.error("Permission denied writing OpenCode config.");
        console.error(`Try re-running with elevated privileges: sudo opencode-cc10x init`);

        // During postinstall we want "everything", but we also must not brick installs in non-interactive contexts.
        // Best effort: if interactive, we can prompt for sudo; otherwise print the instruction and exit success.
        if (isPostinstall && !canPrompt()) {
          console.error("postinstall is non-interactive; skipping sudo escalation.");
          process.exit(0);
        }
        if (shouldAttemptSudo()) {
          console.error("Attempting to re-run with sudo...");
          process.env.CC10X_ELEVATED = "1";
          reRunWithSudo(process.argv);
        }
      }
      throw err;
    }
    return;
  }
  usage();
  process.exit(cmd ? 1 : 0);
}

main();

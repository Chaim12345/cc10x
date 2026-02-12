#!/usr/bin/env node

import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const REPO = process.env.CC10X_REPO || "Chaim12345/cc10x";
const REF = process.env.CC10X_REF || "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/project/opencode-cc10x-plugin`;
const TARBALL_URL = `https://codeload.github.com/${REPO}/tar.gz/${REF}`;
const PLUGIN_NAME = "opencode-cc10x";

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function run(cmd, args, cwd = process.cwd()) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function detectConfigBase() {
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

function isTempHome(home) {
  if (!home) return false;
  if (process.platform === "win32") {
    const normalized = home.toLowerCase();
    return normalized.startsWith(path.join(process.env.TEMP || "", "").toLowerCase());
  }
  return home.startsWith("/tmp/");
}

async function downloadText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

async function downloadFile(url, targetPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(targetPath, buf);
}

function findPluginDir(rootDir) {
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    if (path.basename(current) === "opencode-cc10x-plugin") return current;
    let entries = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry);
      try {
        if (statSync(full).isDirectory()) {
          stack.push(full);
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

function isPlainObject(v) {
  return Boolean(v && typeof v === "object" && !Array.isArray(v));
}

function deepMerge(target, source) {
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
    }
  }
  return target;
}

function upsertConfig(configFile, pluginName, bundledConfig) {
  let cfg = {};
  if (existsSync(configFile)) {
    try {
      cfg = JSON.parse(readFileSync(configFile, "utf8"));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      fail(`Refusing to modify invalid JSON at ${configFile}. Fix this file first. Parse error: ${detail}`);
    }
  }
  if (!Array.isArray(cfg.plugin)) cfg.plugin = [];
  if (!cfg.plugin.includes(pluginName)) cfg.plugin.push(pluginName);
  if (!cfg.$schema) cfg.$schema = "https://opencode.ai/config.json";
  if (bundledConfig && isPlainObject(bundledConfig)) {
    deepMerge(cfg, bundledConfig);
  }
  writeFileSync(configFile, `${JSON.stringify(cfg, null, 2)}\n`);
}

function writeCommands(commandsDir) {
  mkdirSync(commandsDir, { recursive: true });

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
    if (migrated !== current) writeFileSync(target, migrated);
  }
}

async function main() {
  log(`Installing ${PLUGIN_NAME} from GitHub (${REPO}@${REF})...`);

  if (isTempHome(os.homedir()) && process.env.CC10X_ALLOW_TMP_HOME !== "1") {
    fail(`Refusing to install into temporary HOME (${os.homedir()}). Set CC10X_ALLOW_TMP_HOME=1 for testing.`);
  }

  const configBase = detectConfigBase();
  const pluginDir = path.join(configBase, "opencode", "plugins");
  const configDir = path.join(configBase, "opencode");
  const configFile = path.join(configDir, "opencode.json");
  const pluginFile = path.join(pluginDir, `${PLUGIN_NAME}.js`);

  mkdirSync(pluginDir, { recursive: true });
  mkdirSync(configDir, { recursive: true });

  let installed = false;
  try {
    const source = await downloadText(`${RAW_BASE}/dist/index.js`);
    writeFileSync(pluginFile, source);
    log("Downloaded prebuilt plugin artifact.");
    installed = true;
  } catch {
    log("Prebuilt artifact not found. Building from source...");
    const workdir = mkdtempSync(path.join(tmpdir(), "cc10x-"));
    try {
      const tgzPath = path.join(workdir, "cc10x.tar.gz");
      await downloadFile(TARBALL_URL, tgzPath);
      run("tar", ["-xzf", tgzPath, "-C", workdir]);
      const srcDir = findPluginDir(workdir);
      if (!srcDir) fail("Could not locate plugin source in tarball.");
      run("npm", ["install"], srcDir);
      run("npm", ["run", "build"], srcDir);
      copyFileSync(path.join(srcDir, "dist", "index.js"), pluginFile);
      installed = true;
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  }

  if (!installed) fail("Installation failed.");
  let bundledConfig = null;
  try {
    bundledConfig = JSON.parse(await downloadText(`${RAW_BASE}/opencode.json`));
  } catch (err) {
    log(`Warning: could not load bundled opencode.json (${err instanceof Error ? err.message : String(err)}). Continuing with plugin registration only.`);
  }

  upsertConfig(configFile, PLUGIN_NAME, bundledConfig);
  writeCommands(path.join(configDir, "commands"));

  log(`Installed ${PLUGIN_NAME} to ${pluginFile}`);
  log(`Installed cc10x commands to ${path.join(configDir, "commands")}`);
  log("Restart OpenCode to load the plugin.");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));

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

function upsertConfig(configFile, pluginName) {
  let cfg = {};
  if (existsSync(configFile)) {
    try {
      cfg = JSON.parse(readFileSync(configFile, "utf8"));
    } catch {
      cfg = {};
    }
  }
  if (!Array.isArray(cfg.plugin)) cfg.plugin = [];
  if (!cfg.plugin.includes(pluginName)) cfg.plugin.push(pluginName);
  if (!cfg.$schema) cfg.$schema = "https://opencode.ai/config.json";
  writeFileSync(configFile, `${JSON.stringify(cfg, null, 2)}\n`);
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
  upsertConfig(configFile, PLUGIN_NAME);

  log(`Installed ${PLUGIN_NAME} to ${pluginFile}`);
  log("Restart OpenCode to load the plugin.");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));

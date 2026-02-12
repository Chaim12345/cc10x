#!/usr/bin/env bash

set -euo pipefail

REPO="${CC10X_REPO:-Chaim12345/cc10x}"
REF="${CC10X_REF:-main}"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/${REF}/project/opencode-cc10x-plugin"
TARBALL_URL="https://codeload.github.com/${REPO}/tar.gz/${REF}"
PLUGIN_DIR="${HOME}/.config/opencode/plugins"
CONFIG_DIR="${HOME}/.config/opencode"
CONFIG_FILE="${CONFIG_DIR}/opencode.json"
PLUGIN_NAME="opencode-cc10x"

echo "Installing ${PLUGIN_NAME} from GitHub (${REPO}@${REF})..."

if ! command -v opencode >/dev/null 2>&1; then
  echo "OpenCode is not installed or not in PATH."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for GitHub installation."
  exit 1
fi

mkdir -p "${PLUGIN_DIR}" "${CONFIG_DIR}"

if curl -fsSL "${RAW_BASE}/dist/index.js" -o "${PLUGIN_DIR}/${PLUGIN_NAME}.js"; then
  echo "Downloaded prebuilt plugin artifact."
else
  echo "Prebuilt artifact not found. Building from source..."
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to build from source."
    exit 1
  fi
  WORKDIR="$(mktemp -d)"
  curl -fsSL "${TARBALL_URL}" -o "${WORKDIR}/cc10x.tar.gz"
  tar -xzf "${WORKDIR}/cc10x.tar.gz" -C "${WORKDIR}"
  SRC_DIR="$(find "${WORKDIR}" -maxdepth 5 -type d -name 'opencode-cc10x-plugin' | head -n 1)"
  if [ -z "${SRC_DIR}" ]; then
    echo "Could not locate plugin source in tarball."
    exit 1
  fi
  (cd "${SRC_DIR}" && npm install && npm run build)
  cp "${SRC_DIR}/dist/index.js" "${PLUGIN_DIR}/${PLUGIN_NAME}.js"
  rm -rf "${WORKDIR}"
fi

if command -v node >/dev/null 2>&1; then
  CONFIG_FILE="${CONFIG_FILE}" PLUGIN_NAME="${PLUGIN_NAME}" node <<'NODE'
const fs = require('fs');
const path = require('path');

const configFile = process.env.CONFIG_FILE;
const pluginName = process.env.PLUGIN_NAME;

let cfg = {};
if (fs.existsSync(configFile)) {
  try {
    cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch {
    cfg = {};
  }
}

if (!Array.isArray(cfg.plugin)) cfg.plugin = [];
if (!cfg.plugin.includes(pluginName)) cfg.plugin.push(pluginName);
if (!cfg.$schema) cfg.$schema = 'https://opencode.ai/config.json';

fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2) + '\n');
NODE
else
  if [ ! -f "${CONFIG_FILE}" ]; then
    cat > "${CONFIG_FILE}" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "plugin": ["${PLUGIN_NAME}"]
}
EOF
  elif ! grep -q "\"${PLUGIN_NAME}\"" "${CONFIG_FILE}"; then
    echo "Plugin installed, but ${PLUGIN_NAME} was not added to ${CONFIG_FILE} automatically."
    echo "Please add it manually under the \"plugin\" array."
  fi
fi

echo "Installed ${PLUGIN_NAME} to ${PLUGIN_DIR}/${PLUGIN_NAME}.js"
echo "Restart OpenCode to load the plugin."

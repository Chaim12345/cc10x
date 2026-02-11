#!/bin/bash

# OpenCode cc10x Plugin Installer
# This script installs the cc10x orchestration system for OpenCode

set -e

echo "🔌 Installing OpenCode cc10x Plugin..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from the cc10x plugin directory."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is required but not installed."
  exit 1
fi

# Check if bun is available (preferred for building)
if command -v bun &> /dev/null; then
  echo "✅ Bun detected"
  BUILD_CMD="bun"
else
  echo "⚠️  Bun not found, using npm for building"
  BUILD_CMD="npm"
fi

# Build the plugin
echo "🔨 Building plugin..."
if [ "$BUILD_CMD" = "bun" ]; then
  bun run build:all
else
  npm run build:all
fi

# Run the installer
echo "📦 Installing to OpenCode..."
if [ "$BUILD_CMD" = "bun" ]; then
  bun run dist/installer.js
else
  node dist/installer.js
fi

echo "✅ Installation complete!"
echo ""
echo "🚀 Next steps:"
echo "  1. Restart OpenCode if it's running"
echo "  2. Press '/' to see cc10x commands"
echo "  3. Try: /cc10x-orchestrate \"Build a simple API\""
echo ""
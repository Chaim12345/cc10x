import { existsSync } from 'node:fs';

export const OPENCODE_MEMORY_DIR = '.opencode/cc10x';
export const LEGACY_MEMORY_DIR = '.claude/cc10x';

function sanitizeMemoryDir(value: string): string {
  const normalized = normalizePath(value);
  if (!normalized || isAbsoluteLike(normalized) || hasTraversal(normalized)) {
    return OPENCODE_MEMORY_DIR;
  }
  return normalized;
}

function normalizePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
    .trim();
}

function isAbsoluteLike(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:\//.test(value);
}

function hasTraversal(value: string): boolean {
  return value.split('/').some((segment) => segment === '..');
}

export function getPreferredMemoryDir(): string {
  const explicit = process.env.CC10X_MEMORY_DIR;
  if (explicit && explicit.trim().length > 0) {
    return sanitizeMemoryDir(explicit.trim());
  }

  if (existsSync(OPENCODE_MEMORY_DIR)) return OPENCODE_MEMORY_DIR;
  if (existsSync(LEGACY_MEMORY_DIR)) return LEGACY_MEMORY_DIR;
  return OPENCODE_MEMORY_DIR;
}

export function getKnownMemoryDirs(): string[] {
  const preferred = getPreferredMemoryDir();
  const dirs = [preferred, OPENCODE_MEMORY_DIR, LEGACY_MEMORY_DIR];
  return Array.from(new Set(dirs));
}

export function buildMemoryFiles(memoryDir: string) {
  return {
    activeContext: `${memoryDir}/activeContext.md`,
    patterns: `${memoryDir}/patterns.md`,
    progress: `${memoryDir}/progress.md`,
  };
}

export function isMemoryPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  if (!normalized || isAbsoluteLike(normalized) || hasTraversal(normalized)) return false;

  return getKnownMemoryDirs().some((dir) => {
    const prefix = `${dir}/`;
    return normalized === dir || normalized.startsWith(prefix);
  });
}

export function isMemoryDirectory(path: string): boolean {
  const normalized = normalizePath(path);
  if (!normalized || isAbsoluteLike(normalized) || hasTraversal(normalized)) return false;
  return getKnownMemoryDirs().some((dir) => normalizePath(dir) === normalized);
}

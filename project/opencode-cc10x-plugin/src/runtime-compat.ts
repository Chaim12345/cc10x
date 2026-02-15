const TOOL_ALIASES: Record<string, string> = {
  bash: 'bash',
  execute: 'bash',
  read: 'read',
  write: 'write',
  create: 'write',
  edit: 'edit',
  grep: 'grep',
  glob: 'glob',
  list: 'list',
  webfetch: 'webfetch',
  skill: 'skill',
  patch: 'patch',
  task: 'task',
  question: 'question',
  todowrite: 'todowrite',
  todoread: 'todoread',
};

export function normalizeToolName(tool?: string): string {
  if (!tool) return '';
  const normalized = tool.trim().toLowerCase();
  return TOOL_ALIASES[normalized] ?? normalized;
}

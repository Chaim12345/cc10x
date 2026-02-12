# Branch Structure

This repository had multiple unrelated OpenCode histories (`origin/opencode-port` and `origin/feature/opencode-cc10x-plugin`).

Unified structure:

- `main`: canonical ClaudeCode plugin source (`plugins/cc10x`) plus shared docs.
- `project/opencode-cc10x-plugin`: canonical OpenCode port location in the same repo.
- `opencode-unified-structure` (this branch): integration branch that consolidates OpenCode port structure onto `main`.

Remote branch notes:

- `origin/opencode-port`: orphan OpenCode branch with root-level OpenCode files.
- `origin/feature/opencode-cc10x-plugin`: orphan OpenCode branch with OpenCode files under `project/opencode-cc10x-plugin`.

Recommended cleanup after review:

1. Merge `opencode-unified-structure` into `main`.
2. Keep one long-lived OpenCode branch (for example `opencode/main`) from the unified `main` history.
3. Archive or delete orphan OpenCode remote branches after merge.

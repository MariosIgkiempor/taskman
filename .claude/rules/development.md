# Workspace Setup (Conductor Worktrees)

If you detect that this workspace is a git worktree (`.git` is a file, not a directory) and `vendor/` does not exist, you MUST run `bash scripts/workspace-setup.sh` before doing anything else. This installs PHP/Node dependencies, configures `.env`, runs migrations, and builds frontend assets so that Laravel Boost MCP and other tools work correctly.

# Validation

Make sure `composer run test` passes when you are done working.

This script will:
- check PHP & TS linting & formatting (pint, rector, phpstan, biome check)
- run PestPHP tests

You can also run `composer run lint` to fix pint and biome errors.

# Testing Strategy

Where sensible, make sure you write tests.

Use PestPHP v4 making use of datasets to test a wide variety of data and hooks to tidy up repeated test set-up and teardown.

When working on UI, write PestPHP browser tests for the critical flows of each feature.

# Use PNPM


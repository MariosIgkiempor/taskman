#!/usr/bin/env bash
set -euo pipefail

# Workspace setup script for Conductor worktrees.
# Installs PHP and Node dependencies, configures .env, and builds assets.
# Safe to run multiple times — skips steps that are already complete.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

step() {
    echo ""
    echo "==> $1"
}

# PHP dependencies
if [ -d "vendor" ]; then
    echo "vendor/ exists — skipping composer install"
else
    step "Installing PHP dependencies"
    composer install --no-interaction
fi

# Environment file
if [ -f ".env" ]; then
    echo ".env exists — skipping copy"
else
    step "Copying .env.example to .env"
    cp .env.example .env

    step "Generating application key"
    php artisan key:generate --no-interaction
fi

# Database migrations
step "Running migrations"
php artisan migrate --force --no-interaction

# Node dependencies
if [ -d "node_modules" ]; then
    echo "node_modules/ exists — skipping npm install"
else
    step "Installing Node dependencies"
    npm install
fi

# Build frontend assets
step "Building frontend assets"
npm run build

echo ""
echo "Workspace setup complete."

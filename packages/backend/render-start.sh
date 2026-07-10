#!/bin/bash
set -e

echo "=== Running Database Migrations ==="
npx tsx src/core/migrate.ts

echo "=== Starting Server ==="
exec node dist/index.js

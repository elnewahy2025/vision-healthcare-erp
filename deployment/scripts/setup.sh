#!/bin/bash
set -e

echo "=== Vision Healthcare ERP Setup ==="
echo ""

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "✗ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "✗ Docker is required. Install from https://docker.com"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "✗ Docker Compose is required."; exit 1; }

echo "✓ Node.js $(node -v)"
echo "✓ Docker $(docker --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Build shared package
echo "Building shared package..."
npm run build -w packages/shared

# Start infrastructure
echo "Starting database and services..."
docker compose up -d postgres redis

echo "Waiting for PostgreSQL..."
sleep 3

# Run migrations
echo "Running database migrations..."
cd packages/backend
npx knex migrate:latest --knexfile knexfile.ts
cd ../..

# Seed demo data
echo "Seeding demo data..."
cd packages/backend
npx knex seed:run --knexfile knexfile.ts
cd ../..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "Demo credentials:"
echo "  Organization: demo"
echo "  Admin:   admin@demo.com / Admin@123"
echo "  Doctor:  doctor@demo.com / Doctor@123"
echo "  Reception: reception@demo.com / Recept@123"
echo ""
echo "API Docs: http://localhost:3000/docs"
echo "Frontend: http://localhost:5173"

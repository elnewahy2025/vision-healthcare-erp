#!/bin/bash
set -e

echo "=== Deploying Vision Healthcare with Docker Compose ==="

# Build and start all services
docker compose build
docker compose up -d

echo ""
echo "Services:"
echo "  Frontend:  http://localhost:5173"
echo "  API:       http://localhost:3000"
echo "  API Docs:  http://localhost:3000/docs"
echo "  MinIO:     http://localhost:9001"
echo ""
echo "Demo credentials:"
echo "  Organization: demo"
echo "  Email: admin@demo.com"
echo "  Password: Admin@123"

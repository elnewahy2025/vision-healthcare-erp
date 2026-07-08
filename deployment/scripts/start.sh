#!/bin/bash
set -e

echo "=== Starting Vision Healthcare ERP ==="

# Ensure infrastructure is running
docker compose up -d postgres redis minio

# Start backend & frontend
npm run dev

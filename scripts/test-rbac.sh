#!/bin/bash
# ──────────────────────────────────────────────────────────────
# RBAC Test Runner
#
# Runs all RBAC integration tests and generates a report.
#
# Prerequisites:
#   - Docker stack running (backend :3000, frontend :81)
#   - Seed data applied
#
# Usage:
#   bash scripts/test-rbac.sh              # Run all tests
#   bash scripts/test-rbac.sh api          # API tests only
#   bash scripts/test-rbac.sh ui           # Playwright tests only
# ──────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          RBAC Integration Test Runner                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check if backend is running
echo -n "Checking backend... "
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo -e "${GREEN}running${NC}"
else
  echo -e "${RED}not running on :3000${NC}"
  echo "Start the Docker stack first: docker compose up -d"
  exit 1
fi

# Check if frontend is running
echo -n "Checking frontend... "
if curl -s http://localhost:81 > /dev/null 2>&1 || curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${GREEN}running${NC}"
else
  echo -e "${YELLOW}not running (UI tests will be skipped)${NC}"
fi

MODE=${1:-all}

run_api_tests() {
  echo ""
  echo -e "${YELLOW}── API Permission Tests ──${NC}"
  npx tsx e2e/tests/rbac-api-permissions.ts
}

run_ui_tests() {
  echo ""
  echo -e "${YELLOW}── UI Role Matrix Tests ──${NC}"
  npx playwright test e2e/tests/rbac-role-matrix.spec.ts --reporter=list
}

case $MODE in
  api)
    run_api_tests
    ;;
  ui)
    run_ui_tests
    ;;
  *)
    run_api_tests
    run_ui_tests
    ;;
esac

echo ""
echo -e "${GREEN}All RBAC tests completed.${NC}"

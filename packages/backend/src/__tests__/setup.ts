import { beforeAll, afterAll } from 'vitest';

// Integration test setup
// Uses a test PostgreSQL database (healthcare_test)
// Set DB_NAME=healthcare_test in your .env before running tests

export const testTenantId = '00000000-0000-0000-0000-000000000001';
export const testUserId = '00000000-0000-0000-0000-000000000002';
export const testPatientId = '00000000-0000-0000-0000-000000000003';
export const testAppointmentId = '00000000-0000-0000-0000-000000000004';

export async function setupTestDatabase() {
  // Will be called in beforeAll of integration tests
}

export async function teardownTestDatabase() {
  // Will be called in afterAll of integration tests
}

import { describe, it, expect, vi } from 'vitest';

// Mock the database
vi.mock('../../core/database.js', () => ({
  db: vi.fn(),
}));

describe('Audit Service', () => {
  it('should log audit entry without throwing', async () => {
    const { logAudit } = await import('../audit.js');
    // Should not throw even if DB fails (fire-and-forget)
    await expect(logAudit({
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      action: 'test.action',
      entityType: 'test',
      entityId: 'test-id',
      ipAddress: '127.0.0.1',
    })).resolves.toBeUndefined();
  });
});

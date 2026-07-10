import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { getCtx } from '../../utils/route-helper.js';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response.js';

// Fine-grained permission modules and actions
const PERMISSION_MODULES = [
  'patients', 'appointments', 'emr', 'billing', 'laboratory', 'radiology',
  'pharmacy', 'inventory', 'hr', 'insurance', 'crm', 'reports',
  'ai', 'settings', 'users', 'audit', 'communications', 'queue',
];

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete', 'export', 'import'];

// Predefined roles with permissions
const ROLE_TEMPLATES: Record<string, string[]> = {
  super_admin: PERMISSION_MODULES.flatMap(m => PERMISSION_ACTIONS.map(a => `${m}.${a}`)),
  admin: ['patients.*', 'appointments.*', 'emr.*', 'billing.*', 'laboratory.*', 'radiology.*', 'pharmacy.*', 'inventory.*', 'hr.read', 'hr.update', 'insurance.*', 'crm.*', 'reports.*', 'ai.*', 'settings.read', 'users.*', 'audit.read', 'communications.*', 'queue.*'],
  doctor: ['patients.read', 'patients.update', 'appointments.read', 'appointments.update', 'emr.*', 'billing.read', 'laboratory.read', 'laboratory.create', 'radiology.read', 'radiology.create', 'pharmacy.read', 'pharmacy.create', 'insurance.read', 'ai.*', 'queue.read', 'queue.update'],
  nurse: ['patients.read', 'patients.update', 'appointments.read', 'appointments.update', 'emr.read', 'emr.create', 'laboratory.read', 'pharmacy.read', 'queue.*'],
  receptionist: ['patients.*', 'appointments.*', 'billing.read', 'billing.create', 'queue.*', 'insurance.read', 'communications.*', 'emr.read'],
  billing_staff: ['patients.read', 'billing.*', 'insurance.*', 'reports.read', 'emr.read'],
  lab_tech: ['patients.read', 'laboratory.*', 'emr.read'],
  radiologist: ['patients.read', 'radiology.*', 'emr.read'],
};

export async function registerRbacModule(app: FastifyInstance) {

  // Get all available permissions
  app.get('/api/v1/rbac/permissions', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const permissions: any[] = [];
    for (const mod of PERMISSION_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        permissions.push({ module: mod, action, key: `${mod}.${action}` });
      }
    }
    return sendSuccess(reply, { permissions, modules: PERMISSION_MODULES, actions: PERMISSION_ACTIONS });
  });

  // Get role templates
  app.get('/api/v1/rbac/roles', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const roles = Object.entries(ROLE_TEMPLATES).map(([name, perms]) => ({ name, permissionCount: perms.length, permissions: perms }));
    return sendSuccess(reply, roles);
  });

  // Get user permissions
  app.get('/api/v1/rbac/users/:userId/permissions', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);

    const user = await db('users').where({ id: userId, tenant_id: tenantId }).first();
    if (!user) return sendError(reply, 'User not found', 404);

    const userRoles = typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || ['admin']);
    const customPerms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []);

    // Merge role template permissions with custom permissions
    const allPerms = new Set<string>();
    for (const role of userRoles) {
      (ROLE_TEMPLATES[role] || []).forEach((p: string) => allPerms.add(p));
    }
    customPerms.forEach((p: string) => allPerms.add(p));

    return sendSuccess(reply, {
      userId, roles: userRoles,
      permissions: Array.from(allPerms),
      isSuperAdmin: userRoles.includes('super_admin'),
    });
  });

  // Update user permissions (admin only)
  app.put('/api/v1/rbac/users/:userId/permissions', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { tenantId, roles } = getCtx(request);
    if (!roles?.includes('admin') && !roles?.includes('super_admin')) {
      return sendError(reply, 'Insufficient permissions', 403);
    }
    const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      roles: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional(),
    }).parse(request.body);

    const updates: any = {};
    if (body.roles) updates.roles = JSON.stringify(body.roles);
    if (body.permissions) updates.permissions = JSON.stringify(body.permissions);

    await db('users').where({ id: userId, tenant_id: tenantId }).update(updates);
    return sendSuccess(reply, { userId, ...body }, 'Permissions updated');
  });

  console.log('✓ RBAC module loaded (fine-grained permissions)');
}

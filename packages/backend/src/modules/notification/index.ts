import type { FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';

export async function registerNotificationModule(app: FastifyInstance) {
  app.get('/api/v1/notifications', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request);
    const limit = parseInt((request.query as any).limit) || 20;
    const notifs = await db('notifications').where({ tenant_id: tenantId, user_id: ctx.userId })
      .orderBy('created_at', 'desc').limit(limit);
    return sendSuccess(reply, notifs.map((n: any) => ({
      id: n.id, channel: n.channel, recipient: n.recipient,
      subject: n.subject, body: n.body, status: n.status,
      referenceType: n.reference_type, referenceId: n.reference_id,
      sentAt: n.sent_at, readAt: n.read_at, createdAt: n.created_at,
    })));
  });

  app.put('/api/v1/notifications/:id/read', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('notifications').where({ id }).update({ status: 'read', read_at: new Date() });
    return sendSuccess(reply, null, 'Marked as read');
  });

  app.get('/api/v1/notifications/unread-count', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request);
    const row: any = await db('notifications').where({ tenant_id: tenantId, user_id: ctx.userId, status: 'pending' }).count('id as count').first();
    const unreadCount = Number(row?.count || 0);
    return sendSuccess(reply, { unread: unreadCount });
  });

  // Templates
  app.get('/api/v1/notification-templates', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const templates = await db('notification_templates').where({ tenant_id: tenantId, is_active: true });
    return sendSuccess(reply, templates.map((t: any) => ({
      id: t.id, code: t.code, name: t.name, channel: t.channel,
      subject: t.subject, bodyTemplate: t.body_template, variables: t.variables,
    })));
  });
}

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerNotificationModule(app: FastifyInstance) {
  app.get('/api/v1/notifications', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
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

  app.put('/api/v1/notifications/:id/read', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    await db('notifications').where({ id }).update({ status: 'read', read_at: new Date() });
    return sendSuccess(reply, null, 'Marked as read');
  });

  app.get('/api/v1/notifications/unread-count', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request);
    const row: any = await db('notifications').where({ tenant_id: tenantId, user_id: ctx.userId, status: 'pending' }).count('id as count').first();
    const unreadCount = Number(row?.count || 0);
    return sendSuccess(reply, { unread: unreadCount });
  });


}

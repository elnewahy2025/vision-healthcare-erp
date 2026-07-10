import { db } from '../core/database.js';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '@healthcare/shared/config';

interface ChatMessage {
  id?: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  senderRole: 'doctor' | 'patient' | 'staff' | 'admin';
  messageType: 'text' | 'image' | 'file' | 'system';
  content: string;
  metadata?: any;
  createdAt?: string;
}

interface Conversation {
  id: string;
  tenantId: string;
  title: string;
  participantIds: string[];
  participantRoles: string[];
  patientId?: string;
  appointmentId?: string;
  isActive: boolean;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
}

// Store for WebSocket connections (per-conversation rooms)
// In production, use Redis pub/sub for horizontal scaling
interface WsClient {
  userId: string;
  tenantId: string;
  role: string;
  send: (data: any) => void;
}

const conversationRooms = new Map<string, Map<string, WsClient>>();

export function registerChatWsHandlers(app: FastifyInstance): void {
  const env = getEnv();

  // WebSocket endpoint for chat
  // Using polling fallback — WebSocket native support depends on @fastify/websocket
  // For now, we implement REST-based chat with SSE for real-time updates
  // and a WebSocket upgrade handler when the plugin is available

  // If @fastify/websocket is registered, handle upgrade
  if ((app as any).websocket) {
    (app as any).websocket('/api/v1/chat/ws', { options: { maxPayload: 131072 } }, async (socket: any, req: any) => {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const conversationId = url.searchParams.get('conversationId');

      if (!token || !conversationId) {
        socket.close(4001, 'Missing token or conversationId');
        return;
      }

      // Validate token and get user info
      try {
        const jwt = app.jwt as any;
        const payload = jwt.verify(token);
        const client: WsClient = {
          userId: payload.userId,
          tenantId: payload.tenantId || payload.ctx?.tenantId,
          role: payload.role || 'staff',
          send: (data: any) => {
            try { socket.send(JSON.stringify(data)); } catch { /* ignore */ }
          },
        };

        // Join conversation room
        if (!conversationRooms.has(conversationId)) {
          conversationRooms.set(conversationId, new Map());
        }
        const room = conversationRooms.get(conversationId)!;
        room.set(client.userId, client);

        // Notify others
        broadcastToConversation(conversationId, {
          type: 'user_joined',
          userId: client.userId,
          role: client.role,
          timestamp: new Date().toISOString(),
        }, client.userId);

        // Handle incoming messages
        socket.on('message', async (raw: string) => {
          try {
            const msg = JSON.parse(raw);
            if (msg.type === 'message' && msg.content) {
              const saved = await sendChatMessage({
                tenantId: client.tenantId,
                conversationId,
                senderId: client.userId,
                senderRole: client.role as any,
                messageType: msg.messageType || 'text',
                content: msg.content,
                metadata: msg.metadata || null,
              });

              broadcastToConversation(conversationId, {
                type: 'new_message',
                message: saved,
              });
            }
          } catch (err: any) {
            console.error('✗ WS message error:', err.message);
          }
        });

        socket.on('close', () => {
          const room = conversationRooms.get(conversationId);
          if (room) {
            room.delete(client.userId);
            if (room.size === 0) conversationRooms.delete(conversationId);
          }
          broadcastToConversation(conversationId, {
            type: 'user_left',
            userId: client.userId,
            timestamp: new Date().toISOString(),
          });
        });

        // Send existing messages
        const messages = await getConversationMessages(conversationId, 1, 50);
        socket.send(JSON.stringify({ type: 'history', messages: messages.data }));

        // Send typing indicator handler
        socket.on('typing', (isTyping: boolean) => {
          broadcastToConversation(conversationId, {
            type: 'typing',
            userId: client.userId,
            isTyping,
          }, client.userId);
        });
      } catch {
        socket.close(4001, 'Invalid token');
      }
    });
  }
}

function broadcastToConversation(conversationId: string, data: any, excludeUserId?: string): void {
  const room = conversationRooms.get(conversationId);
  if (!room) return;
  for (const [uid, client] of room) {
    if (uid !== excludeUserId) {
      client.send(data);
    }
  }
}

export function getOnlineUsers(conversationId: string): string[] {
  const room = conversationRooms.get(conversationId);
  if (!room) return [];
  return Array.from(room.keys());
}

export async function sendChatMessage(msg: ChatMessage): Promise<any> {
  const [saved] = await db('chat_messages').insert({
    id: msg.id || undefined,
    tenant_id: msg.tenantId,
    conversation_id: msg.conversationId,
    sender_id: msg.senderId,
    sender_role: msg.senderRole,
    message_type: msg.messageType,
    content: msg.content,
    metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
  }).returning('*');

  // Update conversation's last_message_at
  await db('chat_conversations')
    .where({ id: msg.conversationId })
    .update({ last_message_at: db.fn.now(), is_active: true });

  // Mark as unread for other participants
  await db('chat_participants')
    .where({ conversation_id: msg.conversationId })
    .whereNot('user_id', msg.senderId)
    .increment('unread_count', 1);

  return saved;
}

export async function createConversation(data: {
  tenantId: string;
  title: string;
  participantIds: string[];
  participantRoles: string[];
  patientId?: string;
  appointmentId?: string;
  createdBy: string;
}): Promise<any> {
  const [conv] = await db('chat_conversations').insert({
    tenant_id: data.tenantId,
    title: data.title,
    patient_id: data.patientId || null,
    appointment_id: data.appointmentId || null,
    created_by: data.createdBy,
  }).returning('*');

  // Add participants
  const participants = data.participantIds.map((userId, i) => ({
    conversation_id: conv.id,
    user_id: userId,
    role: data.participantRoles[i] || 'staff',
    tenant_id: data.tenantId,
  }));

  await db('chat_participants').insert(participants);

  // System message
  await db('chat_messages').insert({
    tenant_id: data.tenantId,
    conversation_id: conv.id,
    sender_id: 'system',
    sender_role: 'system',
    message_type: 'system',
    content: `Conversation started with ${data.participantIds.length} participants`,
  });

  return conv;
}

export async function getConversations(
  tenantId: string,
  userId: string,
  page = 1,
  limit = 20
): Promise<{ data: any[]; total: number }> {
  const baseQuery = db('chat_conversations as cc')
    .join('chat_participants as cp', 'cc.id', 'cp.conversation_id')
    .where('cc.tenant_id', tenantId)
    .where('cp.user_id', userId);

  const countQuery = baseQuery.clone();
  const total = await countQuery.countDistinct('cc.id as count').first();

  const data = await baseQuery
    .select(
      'cc.*',
      db.raw('cp.unread_count'),
      db.raw('(SELECT content FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message')
    )
    .orderBy('cc.last_message_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  // Deduplicate conversations (because of join)
  const seen = new Set<string>();
  const unique = data.filter((r: any) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return { data: unique, total: Number(total?.count || 0) };
}

export async function getConversationMessages(
  conversationId: string,
  page = 1,
  limit = 50
): Promise<{ data: any[]; total: number }> {
  const total = await db('chat_messages')
    .where({ conversation_id: conversationId })
    .count('id as count').first();

  const data = await db('chat_messages')
    .where({ conversation_id: conversationId })
    .orderBy('created_at', 'asc')
    .limit(limit)
    .offset((page - 1) * limit);

  return { data, total: Number(total?.count || 0) };
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await db('chat_participants')
    .where({ conversation_id: conversationId, user_id: userId })
    .update({ unread_count: 0, last_read_at: db.fn.now() });
}

export async function getUnreadCount(
  tenantId: string,
  userId: string
): Promise<number> {
  const result = await db('chat_participants')
    .join('chat_conversations', 'chat_participants.conversation_id', 'chat_conversations.id')
    .where('chat_conversations.tenant_id', tenantId)
    .where('chat_participants.user_id', userId)
    .sum('chat_participants.unread_count as total')
    .first();

  return Number((result as any)?.total || 0);
}

export async function getConversationParticipants(conversationId: string): Promise<any[]> {
  return db('chat_participants')
    .where({ conversation_id: conversationId })
    .select('*');
}

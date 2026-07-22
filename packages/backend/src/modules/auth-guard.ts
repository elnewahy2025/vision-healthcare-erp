import type { FastifyRequest, FastifyReply } from 'fastify';

interface AuthenticatedServer {
  authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const server = request.server as unknown as AuthenticatedServer;
  return server.authenticate(request, reply);
}

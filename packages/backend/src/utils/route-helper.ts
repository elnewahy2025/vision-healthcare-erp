import type { FastifyRequest, FastifyReply, RouteOptions } from 'fastify';

// Helper to create auth preHandler
export function authGuard(request: FastifyRequest, reply: FastifyReply): void {
  const app = request.server as any;
  return app.authenticate(request, reply);
}

export function authGuardWith(...permissions: string[]) {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const app = request.server as any;
    return app.authorize(...permissions)(request, reply);
  };
}

// Helper to get context
export function getCtx(request: FastifyRequest) {
  return (request as any).ctx as {
    tenantId: string;
    userId: string;
    roles: string[];
    permissions: string[];
    locale: 'ar' | 'en';
    branchId?: string;
    requestId: string;
  };
}

export function getTenantId(request: FastifyRequest): string {
  return (request as any).tenantId || getCtx(request).tenantId;
}

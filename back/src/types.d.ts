import 'fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
    authorizeRoles: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signTokens: (payload: { id: string; tenantId: string | null; role: string }) => {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: string;
    };
    verifyRefreshToken: (token: string) => Promise<{ id: string; tenantId: string | null; role: string }>;
  }

  interface FastifyRequest {
    authUser: { id: string; tenantId: string | null; role: string };
  }
}

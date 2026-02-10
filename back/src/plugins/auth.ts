import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

const accessTtl = '7d';
const refreshTtl = '7d';

export default fp(async (fastify) => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

  fastify.register(jwt, { secret });

  fastify.decorate('signTokens', (payload: { id: string; tenantId: string | null; role: string }) => {
    const accessToken = fastify.jwt.sign(payload, { expiresIn: accessTtl });
    const refreshToken = fastify.jwt.sign(payload, { expiresIn: refreshTtl, key: refreshSecret });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessTtl };
  });

  fastify.decorate('authenticate', async (request) => {
    await request.jwtVerify();
    const user = request.user as { id: string; tenantId: string | null; role: string };
    request.authUser = user;
  });

  fastify.decorate('authorizeRoles', (roles: string[]) => async (request, reply) => {
    if (!request.authUser) {
      await fastify.authenticate(request);
    }
    const userRole = request.authUser?.role;
    if (!userRole || !roles.includes(userRole)) {
      return reply.forbidden('Insufficient role');
    }
  });

  fastify.decorate('verifyRefreshToken', async (token: string) => {
    const payload = fastify.jwt.verify(token, { key: refreshSecret }) as {
      id: string;
      tenantId: string | null;
      role: string;
    };
    return payload;
  });
});

import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserRole, TenantStatus } from '@prisma/client';

const getBootstrapToken = (request: any) => {
  return request.headers['x-bootstrap-token'] || request.headers['x-bootstrap_token'];
};

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = request.body as {
      email: string;
      password: string;
      name: string;
      companyName: string;
      cnpj?: string;
    };

    if (!body.email || !body.password || !body.companyName || !body.name) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    const existing = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.conflict('E-mail já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const tenant = await app.prisma.tenant.create({
      data: {
        name: body.companyName,
        cnpj: body.cnpj,
        status: TenantStatus.TRIAL,
      },
    });

    const user = await app.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        tenantId: tenant.id,
      },
    });

    const tokens = app.signTokens({ id: user.id, tenantId: tenant.id, role: user.role });

    return reply.status(201).send({
      data: {
        user: { id: user.id, email: user.email, role: user.role, tenantId: tenant.id },
        tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
        tokens,
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const body = request.body as { email: string; password: string };
    if (!body.email || !body.password) {
      return reply.badRequest('Credenciais ausentes.');
    }

    const user = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.isActive) {
      return reply.unauthorized('Credenciais inválidas.');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.unauthorized('Credenciais inválidas.');
    }

    const tokens = app.signTokens({ id: user.id, tenantId: user.tenantId, role: user.role });

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        tokens,
      },
    });
  });

  app.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken: string };
    if (!body.refreshToken) {
      return reply.badRequest('Refresh token ausente.');
    }

    const payload = await app.verifyRefreshToken(body.refreshToken);
    const user = await app.prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return reply.unauthorized('Token inválido.');
    }

    const tokens = app.signTokens({ id: user.id, tenantId: user.tenantId, role: user.role });
    return reply.send({ data: { tokens } });
  });

  app.post('/logout', async (_request, reply) => {
    return reply.status(204).send();
  });

  app.post('/bootstrap-saas', async (request, reply) => {
    const token = getBootstrapToken(request);
    const envToken = process.env.SAAS_BOOTSTRAP_TOKEN;
    if (!envToken || token !== envToken) {
      return reply.forbidden('Bootstrap token inválido.');
    }

    const body = request.body as { email: string; password: string };
    if (!body.email || !body.password) {
      return reply.badRequest('E-mail e senha são obrigatórios.');
    }

    const existingAdmin = await app.prisma.user.findFirst({
      where: { role: UserRole.SAAS_ADMIN },
    });
    if (existingAdmin) {
      return reply.conflict('Admin SaaS já existe.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await app.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: UserRole.SAAS_ADMIN,
        tenantId: null,
      },
    });

    return reply.status(201).send({
      data: { id: user.id, email: user.email, role: user.role },
    });
  });
}

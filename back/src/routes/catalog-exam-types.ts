import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';

const ensureCatalogRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

export default async function catalogExamRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureCatalogRead(app)] }, async (request) => {
    const role = request.authUser?.role;
    const items = await app.prisma.catalogExamType.findMany({
      where: role === UserRole.TENANT_ADMIN ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { data: items };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as { name: string; validityDays: number; isActive?: boolean };
    if (!body.name || !body.validityDays) {
      return reply.badRequest('Nome e validade s?o obrigat?rios.');
    }
    const item = await app.prisma.catalogExamType.create({
      data: {
        name: body.name,
        validityDays: Number(body.validityDays),
        isActive: body.isActive ?? true,
      },
    });
    return reply.status(201).send({ data: item });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; validityDays?: number; isActive?: boolean };
    const item = await app.prisma.catalogExamType.update({
      where: { id },
      data: {
        name: body.name,
        validityDays: body.validityDays ? Number(body.validityDays) : undefined,
        isActive: body.isActive,
      },
    });
    return { data: item };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.catalogExamType.delete({ where: { id } });
    return reply.status(204).send();
  });
}

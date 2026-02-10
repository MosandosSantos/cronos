import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

export default async function crmContactsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async () => {
    const contacts = await app.prisma.saasContact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: contacts };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as {
      name: string;
      email: string;
      phone?: string;
      companyName: string;
      source?: string;
      notes?: string;
      nextActionAt?: string;
    };

    if (!body.name || !body.email || !body.companyName) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    const contact = await app.prisma.saasContact.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        companyName: body.companyName,
        source: body.source,
        notes: body.notes,
        nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
      },
    });

    return reply.status(201).send({ data: contact });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      source?: string;
      notes?: string;
      nextActionAt?: string;
    };

    const contact = await app.prisma.saasContact.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        companyName: body.companyName,
        source: body.source,
        notes: body.notes,
        nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
      },
    });

    return { data: contact };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.saasContact.delete({ where: { id } });
    return reply.status(204).send();
  });
}

import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

export default async function employeeRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const query = request.query as { isActive?: string };
    const tenantId = request.authUser.tenantId as string;
    const employees = await app.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: query.isActive ? query.isActive === 'true' : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: employees };
  });

  app.post('/', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const tenantId = request.authUser.tenantId as string;
    const body = request.body as {
      name: string;
      cpf?: string;
      roleTitle?: string;
      admissionDate?: string;
      isActive?: boolean;
    };

    if (!body.name) {
      return reply.badRequest('Nome do funcionario e obrigatorio.');
    }

    const client = await app.prisma.client.findUnique({
      where: { userId: request.authUser.id },
    });

    if (client) {
      const contract = await app.prisma.saasContract.findFirst({
        where: { clientId: client.id, status: 'ACTIVE' },
        include: { entitlement: true },
      });

      const limit = contract?.employeeLimit ?? null;
      if (limit) {
        const currentCount = await app.prisma.employee.count({ where: { tenantId } });
        if (currentCount >= limit) {
          return reply.badRequest('Limite de funcionarios excedido pelo contrato.');
        }
      }
    }

    const employee = await app.prisma.employee.create({
      data: {
        tenantId,
        name: body.name,
        cpf: body.cpf,
        roleTitle: body.roleTitle,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined,
        isActive: body.isActive ?? true,
      },
    });

    return reply.status(201).send({ data: employee });
  });

  app.put('/:id', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    const body = request.body as {
      name?: string;
      cpf?: string;
      roleTitle?: string;
      admissionDate?: string;
      isActive?: boolean;
    };

    const employee = await app.prisma.employee.update({
      where: { id, tenantId },
      data: {
        name: body.name,
        cpf: body.cpf,
        roleTitle: body.roleTitle,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined,
        isActive: body.isActive,
      },
    });

    return { data: employee };
  });

  app.delete('/:id', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    await app.prisma.employee.delete({ where: { id, tenantId } });
    return reply.status(204).send();
  });
}


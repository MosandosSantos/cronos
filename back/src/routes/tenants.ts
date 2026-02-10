import { FastifyInstance } from 'fastify';
import { TenantStatus, UserRole } from '@prisma/client';

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

export default async function tenantRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const query = request.query as { status?: TenantStatus };
    const tenants = await app.prisma.tenant.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { employees: true } },
      },
    });

    const data = tenants.map((tenant) => {
      const employeeLimit = 0;
      const employeesCount = tenant._count.employees;
      const usagePercent = employeeLimit
        ? Math.round((employeesCount / employeeLimit) * 100)
        : 0;
      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        cnpj: tenant.cnpj,
        segment: tenant.segment,
        employeesCount,
        employeeLimit,
        usagePercent,
        contractStatus: null,
        createdAt: tenant.createdAt,
      };
    });

    return { data };
  });

  app.get('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = await app.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!tenant) {
      return reply.notFound('Tenant não encontrado.');
    }

    return {
      data: {
        ...tenant,
        employeesCount: tenant._count.employees,
      },
    };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as {
      name: string;
      status?: TenantStatus;
      cnpj?: string;
      segment?: string;
    };

    if (!body.name) {
      return reply.badRequest('Nome do tenant é obrigatório.');
    }

    const tenant = await app.prisma.tenant.create({
      data: {
        name: body.name,
        status: body.status ?? TenantStatus.LEAD,
        cnpj: body.cnpj,
        segment: body.segment,
      },
    });

    return reply.status(201).send({ data: tenant });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      status?: TenantStatus;
      cnpj?: string;
      segment?: string;
    };

    const tenant = await app.prisma.tenant.update({
      where: { id },
      data: {
        name: body.name,
        status: body.status,
        cnpj: body.cnpj,
        segment: body.segment,
      },
    });

    return { data: tenant };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.tenant.delete({ where: { id } });
    return reply.status(204).send();
  });
}


import { FastifyInstance } from 'fastify';
import { ContractStatus, UserRole } from '@prisma/client';

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);
const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export default async function contractRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const query = request.query as {
      clientId?: string;
      status?: ContractStatus;
      q?: string;
    };

    const q = query.q?.trim();

    const contracts = await app.prisma.saasContract.findMany({
      where: {
        clientId: query.clientId,
        status: query.status,
        OR: q ? [{ client: { fullName: { contains: q, mode: 'insensitive' } } }] : undefined,
      },
      include: {
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: contracts };
  });

  app.get('/current', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const client = await app.prisma.client.findUnique({
      where: { userId: request.authUser.id },
    });
    if (!client) return { data: null };

    const contract = await app.prisma.saasContract.findFirst({
      where: { clientId: client.id, status: ContractStatus.ACTIVE },
      orderBy: { startDate: 'desc' },
      include: { client: true },
    });
    return { data: contract };
  });

  app.get('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = await app.prisma.saasContract.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!contract) {
      return reply.notFound('Contrato nao encontrado.');
    }
    return { data: contract };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as {
      clientId: string;
      proposalId?: string;
      startDate: string;
      status?: ContractStatus;
      endDate?: string;
      contractValue: number;
      employeeLimit?: number | null;
      contractName?: string | null;
      billingCycle?: 'MONTHLY' | 'ANNUAL';
    };

    const startDate = parseDate(body.startDate);
    if (!body.clientId || !startDate) {
      return reply.badRequest('Cliente e data de inicio sao obrigatorios.');
    }

    const endDate = body.endDate ? parseDate(body.endDate) : null;
    if (endDate && endDate < startDate) {
      return reply.badRequest('Data final nao pode ser anterior ao inicio.');
    }

    const contractValue = Number(body.contractValue ?? 0);
    if (!contractValue) {
      return reply.badRequest('Informe o valor do contrato.');
    }

    const status = body.status ?? ContractStatus.ACTIVE;

    const contract = await app.prisma.saasContract.create({
      data: {
        client: { connect: { id: body.clientId } },
        proposalId: body.proposalId,
        startDate,
        endDate: endDate ?? undefined,
        status,
        contractValue,
        employeeLimit: body.employeeLimit ?? undefined,
        contractName: body.contractName ?? 'Plano',
        billingCycle: body.billingCycle ?? 'MONTHLY',
      } as any,
      include: { client: true },
    });

    return reply.status(201).send({ data: contract });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      clientId?: string | null;
      proposalId?: string | null;
      startDate?: string;
      status?: ContractStatus;
      endDate?: string | null;
      contractValue?: number;
      employeeLimit?: number | null;
      contractName?: string | null;
      billingCycle?: 'MONTHLY' | 'ANNUAL';
    };

    const existing = await app.prisma.saasContract.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.notFound('Contrato nao encontrado.');
    }

    const startDate = body.startDate ? parseDate(body.startDate) : existing.startDate;
    if (!startDate) {
      return reply.badRequest('Data de inicio invalida.');
    }

    const nextContractValue = Number(body.contractValue ?? existing.contractValue);
    if (!nextContractValue) {
      return reply.badRequest('Informe o valor do contrato.');
    }

    const endDate = body.endDate === null ? null : body.endDate ? parseDate(body.endDate) : existing.endDate;
    if (endDate && endDate < startDate) {
      return reply.badRequest('Data final nao pode ser anterior ao inicio.');
    }

    const updated = await app.prisma.saasContract.update({
      where: { id },
      data: {
        client:
          body.clientId === null
            ? { disconnect: true }
            : body.clientId
              ? { connect: { id: body.clientId } }
              : undefined,
        proposalId: body.proposalId ?? undefined,
        startDate,
        endDate,
        status: body.status ?? existing.status,
        contractValue: nextContractValue,
        employeeLimit: body.employeeLimit ?? existing.employeeLimit,
        contractName: body.contractName ?? existing.contractName ?? 'Plano',
        billingCycle: body.billingCycle ?? (existing as any).billingCycle ?? 'MONTHLY',
      } as any,
    });

    return { data: updated };
  });

  app.post('/:id/pause', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = await app.prisma.saasContract.update({
      where: { id },
      data: { status: ContractStatus.PAUSED },
    });
    return reply.status(200).send({ data: contract });
  });

  app.post('/:id/cancel', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = await app.prisma.saasContract.update({
      where: { id },
      data: { status: ContractStatus.CANCELED, endDate: new Date() },
    });
    return reply.status(200).send({ data: contract });
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.saasContract.delete({ where: { id } });
    return reply.status(204).send();
  });
}


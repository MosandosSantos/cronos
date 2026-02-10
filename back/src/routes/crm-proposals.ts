import { FastifyInstance } from 'fastify';
import { ContractStatus, ProposalStatus, UserRole } from '@prisma/client';

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

export default async function crmProposalsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const query = request.query as { contactId?: string; status?: ProposalStatus };
    const proposals = await app.prisma.saasProposal.findMany({
      where: { contactId: query.contactId, status: query.status },
      include: { contact: true, contract: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: proposals };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as {
      contactId: string;
      proposedValue: number;
      validUntil: string;
      status?: ProposalStatus;
    };

    if (!body.contactId || !body.proposedValue || !body.validUntil) {
      return reply.badRequest('Campos obrigatorios ausentes.');
    }

    const proposal = await app.prisma.saasProposal.create({
      data: {
        contactId: body.contactId,
        proposedValue: body.proposedValue,
        validUntil: new Date(body.validUntil),
        status: body.status ?? ProposalStatus.SENT,
      },
    });

    return reply.status(201).send({ data: proposal });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      proposedValue?: number;
      validUntil?: string;
      status?: ProposalStatus;
    };

    const proposal = await app.prisma.saasProposal.update({
      where: { id },
      data: {
        proposedValue: body.proposedValue,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        status: body.status,
      },
    });

    return { data: proposal };
  });

  app.post('/:id/approve', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      clientId: string;
      employeeLimit?: number;
      contractValue?: number;
      startDate: string;
      endDate?: string;
      contractName?: string | null;
    };

    if (!body.clientId || !body.startDate) {
      return reply.badRequest('Campos obrigatorios ausentes.');
    }

    const startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return reply.badRequest('Data de inicio invalida.');
    }

    const totalAmount = Number(body.contractValue ?? 0);
    if (!totalAmount) {
      return reply.badRequest('Informe o valor do contrato.');
    }

    if (!body.employeeLimit) {
      return reply.badRequest('Informe o limite de funcionarios.');
    }

    const proposal = await app.prisma.saasProposal.update({
      where: { id },
      data: { status: ProposalStatus.APPROVED },
    });

    const contract = await app.prisma.saasContract.create({
      data: {
        clientId: body.clientId,
        proposalId: proposal.id,
        status: ContractStatus.ACTIVE,
        startDate,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        contractValue: totalAmount,
        employeeLimit: body.employeeLimit ?? undefined,
        contractName: body.contractName ?? undefined,
      },
    });

    return reply.status(201).send({ data: { proposal, contract } });
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.saasProposal.delete({ where: { id } });
    return reply.status(204).send();
  });
}


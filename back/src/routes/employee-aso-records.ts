import { FastifyInstance } from 'fastify';
import { DueStatus, UserRole } from '@prisma/client';
import { calculateDue, daysBetween } from '../utils/due';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

export default async function employeeAsoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const query = request.query as { employeeId?: string; status?: DueStatus };
    const tenantId = request.authUser.tenantId as string;
    const records = await app.prisma.employeeAsoRecord.findMany({
      where: {
        tenantId,
        employeeId: query.employeeId,
        status: query.status,
      },
      include: { employee: true, asoType: true },
      orderBy: { dueDate: 'asc' },
    });

    const data = records.map((record) => ({
      ...record,
      daysToDue: daysBetween(new Date(), record.dueDate),
    }));

    return { data };
  });

  app.post('/', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const tenantId = request.authUser.tenantId as string;
    const body = request.body as { employeeId: string; asoTypeId: string; performedAt: string };
    if (!body.employeeId || !body.asoTypeId || !body.performedAt) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    const asoType = await app.prisma.catalogAsoType.findUnique({ where: { id: body.asoTypeId } });
    if (!asoType) {
      return reply.badRequest('Tipo de ASO inválido.');
    }

    const performedAt = new Date(body.performedAt);
    const { dueDate, status } = calculateDue(performedAt, asoType.validityDays);

    const record = await app.prisma.employeeAsoRecord.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        asoTypeId: body.asoTypeId,
        performedAt,
        dueDate,
        status,
      },
    });

    return reply.status(201).send({ data: record });
  });

  app.put('/:id', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    const body = request.body as { employeeId?: string; asoTypeId?: string; performedAt?: string };

    const existing = await app.prisma.employeeAsoRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return { data: null };
    }

    const asoTypeId = body.asoTypeId ?? existing.asoTypeId;
    const asoType = await app.prisma.catalogAsoType.findUnique({ where: { id: asoTypeId } });
    if (!asoType) {
      throw new Error('Tipo de ASO inválido.');
    }

    const performedAt = body.performedAt ? new Date(body.performedAt) : existing.performedAt;
    const { dueDate, status } = calculateDue(performedAt, asoType.validityDays);

    const record = await app.prisma.employeeAsoRecord.update({
      where: { id },
      data: {
        employeeId: body.employeeId,
        asoTypeId,
        performedAt,
        dueDate,
        status,
      },
    });

    return { data: record };
  });

  app.delete('/:id', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    await app.prisma.employeeAsoRecord.delete({ where: { id, tenantId } });
    return reply.status(204).send();
  });
}

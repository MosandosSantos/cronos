import { FastifyInstance } from 'fastify';
import { DueStatus, UserRole } from '@prisma/client';
import { calculateDue, daysBetween } from '../utils/due';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

export default async function employeeTrainingRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const query = request.query as { employeeId?: string; status?: DueStatus };
    const tenantId = request.authUser.tenantId as string;
    const records = await app.prisma.employeeTrainingRecord.findMany({
      where: {
        tenantId,
        employeeId: query.employeeId,
        status: query.status,
      },
      include: { employee: true, trainingType: true },
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
    const body = request.body as { employeeId: string; trainingTypeId: string; performedAt: string };
    if (!body.employeeId || !body.trainingTypeId || !body.performedAt) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    const trainingType = await app.prisma.catalogTrainingType.findUnique({
      where: { id: body.trainingTypeId },
    });
    if (!trainingType) {
      return reply.badRequest('Tipo de treinamento inválido.');
    }

    const performedAt = new Date(body.performedAt);
    const { dueDate, status } = calculateDue(performedAt, trainingType.validityDays);

    const record = await app.prisma.employeeTrainingRecord.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        trainingTypeId: body.trainingTypeId,
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
    const body = request.body as { employeeId?: string; trainingTypeId?: string; performedAt?: string };

    const existing = await app.prisma.employeeTrainingRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return { data: null };
    }

    const trainingTypeId = body.trainingTypeId ?? existing.trainingTypeId;
    const trainingType = await app.prisma.catalogTrainingType.findUnique({
      where: { id: trainingTypeId },
    });
    if (!trainingType) {
      throw new Error('Tipo de treinamento inválido.');
    }

    const performedAt = body.performedAt ? new Date(body.performedAt) : existing.performedAt;
    const { dueDate, status } = calculateDue(performedAt, trainingType.validityDays);

    const record = await app.prisma.employeeTrainingRecord.update({
      where: { id },
      data: {
        employeeId: body.employeeId,
        trainingTypeId,
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
    await app.prisma.employeeTrainingRecord.delete({ where: { id, tenantId } });
    return reply.status(204).send();
  });
}

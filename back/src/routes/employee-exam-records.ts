import { FastifyInstance } from 'fastify';
import { DueStatus, UserRole } from '@prisma/client';
import { calculateDue, daysBetween } from '../utils/due';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

export default async function employeeExamRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const query = request.query as { employeeId?: string; status?: DueStatus };
    const tenantId = request.authUser.tenantId as string;
    const records = await app.prisma.employeeExamRecord.findMany({
      where: {
        tenantId,
        employeeId: query.employeeId,
        status: query.status,
      },
      include: { employee: true, examType: true },
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
    const body = request.body as { employeeId: string; examTypeId: string; performedAt: string };
    if (!body.employeeId || !body.examTypeId || !body.performedAt) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    const examType = await app.prisma.catalogExamType.findUnique({ where: { id: body.examTypeId } });
    if (!examType) {
      return reply.badRequest('Tipo de exame inválido.');
    }

    const performedAt = new Date(body.performedAt);
    const { dueDate, status } = calculateDue(performedAt, examType.validityDays);

    const record = await app.prisma.employeeExamRecord.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        examTypeId: body.examTypeId,
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
    const body = request.body as { employeeId?: string; examTypeId?: string; performedAt?: string };

    const existing = await app.prisma.employeeExamRecord.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return { data: null };
    }

    const examTypeId = body.examTypeId ?? existing.examTypeId;
    const examType = await app.prisma.catalogExamType.findUnique({ where: { id: examTypeId } });
    if (!examType) {
      throw new Error('Tipo de exame inválido.');
    }

    const performedAt = body.performedAt ? new Date(body.performedAt) : existing.performedAt;
    const { dueDate, status } = calculateDue(performedAt, examType.validityDays);

    const record = await app.prisma.employeeExamRecord.update({
      where: { id },
      data: {
        employeeId: body.employeeId,
        examTypeId,
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
    await app.prisma.employeeExamRecord.delete({ where: { id, tenantId } });
    return reply.status(204).send();
  });
}

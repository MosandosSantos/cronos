import { FastifyInstance } from 'fastify';
import { TrainingModality, UserRole } from '@prisma/client';

const ensureCatalogRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

export default async function catalogTrainingRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [ensureSaasAdmin(app)] }, async () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [currentRecords, previousRecords, due30, due90] = await Promise.all([
      app.prisma.employeeTrainingRecord.findMany({
        where: { performedAt: { gte: currentMonthStart, lte: currentMonthEnd } },
        include: { trainingType: true },
      }),
      app.prisma.employeeTrainingRecord.findMany({
        where: { performedAt: { gte: previousMonthStart, lte: previousMonthEnd } },
        include: { trainingType: true },
      }),
      app.prisma.employeeTrainingRecord.count({
        where: { dueDate: { gte: today, lte: in30Days } },
      }),
      app.prisma.employeeTrainingRecord.count({
        where: { dueDate: { gte: today, lte: in90Days } },
      }),
    ]);

    const revenueCurrentMonth = currentRecords.reduce(
      (acc, record) => acc + Number(record.trainingType?.price || 0),
      0
    );
    const revenuePreviousMonth = previousRecords.reduce(
      (acc, record) => acc + Number(record.trainingType?.price || 0),
      0
    );

    return {
      data: {
        revenueCurrentMonth,
        revenuePreviousMonth,
        countCurrentMonth: currentRecords.length,
        countPreviousMonth: previousRecords.length,
        dueIn30Days: due30,
        dueIn90Days: due90,
      },
    };
  });

  app.get('/', { preHandler: [ensureCatalogRead(app)] }, async (request) => {
    const role = request.authUser?.role;
    const items = await app.prisma.catalogTrainingType.findMany({
      where: role === UserRole.TENANT_ADMIN ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { data: items };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      targetAudience?: string;
      durationHours?: number;
      isMandatory?: boolean;
      price?: number;
      didacticMaterial?: string;
      modality?: TrainingModality;
      validityDays: number;
      isActive?: boolean;
    };
    if (
      !body.name ||
      !body.targetAudience ||
      body.durationHours == null ||
      !body.modality ||
      body.validityDays == null
    ) {
      return reply.badRequest(
        'Nome, público alvo, duração (horas), modalidade e validade são obrigatórios.'
      );
    }

    const allowedModalities = new Set<TrainingModality>([
      TrainingModality.PRESENCIAL,
      TrainingModality.SEMIPRESENCIAL,
      TrainingModality.EAD,
      TrainingModality.APOSTILA,
      TrainingModality.VIDEO,
    ]);
    if (!allowedModalities.has(body.modality)) {
      return reply.badRequest('Modalidade inválida.');
    }

    const price = Number(body.price ?? 0);
    const durationHours = Number(body.durationHours);
    const validityDays = Number(body.validityDays);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return reply.badRequest('Duração (horas) deve ser maior que zero.');
    }
    if (!Number.isFinite(validityDays) || validityDays <= 0) {
      return reply.badRequest('Validade (dias) deve ser maior que zero.');
    }
    if (!Number.isFinite(price) || price < 0) {
      return reply.badRequest('Valor deve ser numérico e não pode ser negativo.');
    }

    const item = await app.prisma.catalogTrainingType.create({
      data: {
        name: body.name,
        description: body.description || null,
        targetAudience: body.targetAudience,
        durationHours,
        isMandatory: body.isMandatory ?? false,
        price,
        didacticMaterial: body.didacticMaterial || null,
        modality: body.modality,
        validityDays,
        isActive: body.isActive ?? true,
      },
    });
    return reply.status(201).send({ data: item });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      description?: string;
      targetAudience?: string;
      durationHours?: number;
      isMandatory?: boolean;
      price?: number;
      didacticMaterial?: string;
      modality?: TrainingModality;
      validityDays?: number;
      isActive?: boolean;
    };
    if (body.price != null) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        throw app.httpErrors.badRequest('Valor deve ser numérico e não pode ser negativo.');
      }
    }
    if (body.durationHours != null) {
      const durationHours = Number(body.durationHours);
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        throw app.httpErrors.badRequest('Duração (horas) deve ser maior que zero.');
      }
    }
    if (body.validityDays != null) {
      const validityDays = Number(body.validityDays);
      if (!Number.isFinite(validityDays) || validityDays <= 0) {
        throw app.httpErrors.badRequest('Validade (dias) deve ser maior que zero.');
      }
    }

    const item = await app.prisma.catalogTrainingType.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        targetAudience: body.targetAudience,
        durationHours: body.durationHours == null ? undefined : Number(body.durationHours),
        isMandatory: body.isMandatory,
        price: body.price == null ? undefined : Number(body.price),
        didacticMaterial: body.didacticMaterial,
        modality: body.modality,
        validityDays: body.validityDays == null ? undefined : Number(body.validityDays),
        isActive: body.isActive,
      },
    });
    return { data: item };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.prisma.catalogTrainingType.findUnique({ where: { id } });
    if (!existing) {
      return reply.notFound('Tipo de treinamento nao encontrado.');
    }

    const linkedRecords = await app.prisma.employeeTrainingRecord.count({
      where: { trainingTypeId: id },
    });

    if (linkedRecords > 0) {
      const updated = await app.prisma.catalogTrainingType.update({
        where: { id },
        data: { isActive: false },
      });
      return reply.send({
        data: updated,
        action: 'deactivated',
        message: 'Tipo desativado, pois possui registros vinculados.',
      });
    }

    await app.prisma.catalogTrainingType.delete({ where: { id } });
    return reply.send({
      data: null,
      action: 'deleted',
      message: 'Tipo de treinamento excluido com sucesso.',
    });
  });
}

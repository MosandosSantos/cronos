import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';

const ensureCatalogRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

type ReportCatalogBody = {
  code?: string;
  name?: string;
  validityDays?: number;
  generateAlert?: boolean;
  alertDays1?: number | null;
  alertDays2?: number | null;
  alertDays3?: number | null;
  isActive?: boolean;
};

const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '_');

const toOptionalNumber = (value: unknown) => {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeAlertValue = (value: unknown) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return parsed;
};

const isLegacyReportClientError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes('Unknown argument `code`') ||
    error.message.includes('Unknown argument `generateAlert`') ||
    error.message.includes('Unknown argument `alertDays1`'));

export default async function catalogReportRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [ensureSaasAdmin(app)] }, async () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [currentMonthCount, previousMonthCount, due30, due90] = await Promise.all([
      app.prisma.tenantDocument.count({
        where: { issuedAt: { gte: currentMonthStart, lte: currentMonthEnd } },
      }),
      app.prisma.tenantDocument.count({
        where: { issuedAt: { gte: previousMonthStart, lte: previousMonthEnd } },
      }),
      app.prisma.tenantDocument.count({
        where: { dueDate: { gte: today, lte: in30Days } },
      }),
      app.prisma.tenantDocument.count({
        where: { dueDate: { gte: today, lte: in90Days } },
      }),
    ]);

    return {
      data: {
        revenueCurrentMonth: 0,
        revenuePreviousMonth: 0,
        countCurrentMonth: currentMonthCount,
        countPreviousMonth: previousMonthCount,
        dueIn30Days: due30,
        dueIn90Days: due90,
      },
    };
  });

  app.get('/', { preHandler: [ensureCatalogRead(app)] }, async (request) => {
    const role = request.authUser?.role;
    const items = await app.prisma.catalogReportType.findMany({
      where: role === UserRole.TENANT_ADMIN ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    const normalized = items.map((item) => ({
      ...item,
      code: (item as { code?: string }).code ?? '',
      generateAlert: (item as { generateAlert?: boolean }).generateAlert ?? false,
      alertDays1: (item as { alertDays1?: number | null }).alertDays1 ?? null,
      alertDays2: (item as { alertDays2?: number | null }).alertDays2 ?? null,
      alertDays3: (item as { alertDays3?: number | null }).alertDays3 ?? null,
    }));
    return { data: normalized };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as ReportCatalogBody;
    const code = body.code ? normalizeCode(body.code) : '';
    const name = body.name?.trim() || '';
    const validityDays = toOptionalNumber(body.validityDays);
    const generateAlert = body.generateAlert ?? true;
    const alertDays1 = normalizeAlertValue(body.alertDays1);
    const alertDays2 = normalizeAlertValue(body.alertDays2);
    const alertDays3 = normalizeAlertValue(body.alertDays3);

    if (!code || !name || validityDays == null) {
      return reply.badRequest('Código, nome e validade (dias) são obrigatórios.');
    }
    if (!Number.isFinite(validityDays) || validityDays <= 0) {
      return reply.badRequest('Validade (dias) deve ser maior que zero.');
    }
    if (generateAlert) {
      if (
        alertDays1 == null ||
        alertDays2 == null ||
        alertDays3 == null ||
        [alertDays1, alertDays2, alertDays3].some((value) => !Number.isFinite(value) || value < 0)
      ) {
        return reply.badRequest('Preencha os três níveis de alerta com valores numéricos válidos.');
      }
      if (!(alertDays1 > alertDays2 && alertDays2 > alertDays3)) {
        return reply.badRequest('Os dias de alerta devem seguir a ordem: Alerta 1 > Alerta 2 > Alerta 3.');
      }
    } else if ([alertDays1, alertDays2, alertDays3].some((value) => value != null)) {
      return reply.badRequest('Remova os dias de alerta ou ative a geração de alerta.');
    }

    const baseData = {
      name,
      validityDays,
      isActive: body.isActive ?? true,
    };

    let item;
    try {
      item = await app.prisma.catalogReportType.create({
        data: {
          ...baseData,
          code,
          generateAlert,
          alertDays1: generateAlert ? alertDays1 : null,
          alertDays2: generateAlert ? alertDays2 : null,
          alertDays3: generateAlert ? alertDays3 : null,
        },
      });
    } catch (error) {
      if (!isLegacyReportClientError(error)) throw error;
      item = await app.prisma.catalogReportType.create({
        data: baseData as any,
      });
    }
    return reply.status(201).send({ data: item });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as ReportCatalogBody;
    const updateData: {
      code?: string;
      name?: string;
      validityDays?: number;
      generateAlert?: boolean;
      alertDays1?: number | null;
      alertDays2?: number | null;
      alertDays3?: number | null;
      isActive?: boolean;
    } = {};

    if (body.code != null) {
      const code = normalizeCode(body.code);
      if (!code) {
        return reply.badRequest('Código inválido.');
      }
      updateData.code = code;
    }
    if (body.name != null) {
      const name = body.name.trim();
      if (!name) {
        return reply.badRequest('Nome inválido.');
      }
      updateData.name = name;
    }
    if (body.validityDays != null) {
      const validityDays = Number(body.validityDays);
      if (!Number.isFinite(validityDays) || validityDays <= 0) {
        return reply.badRequest('Validade (dias) deve ser maior que zero.');
      }
      updateData.validityDays = validityDays;
    }

    if (body.generateAlert != null) {
      updateData.generateAlert = body.generateAlert;
      if (!body.generateAlert) {
        updateData.alertDays1 = null;
        updateData.alertDays2 = null;
        updateData.alertDays3 = null;
      }
    }
    if (body.alertDays1 !== undefined) {
      const value = normalizeAlertValue(body.alertDays1);
      if (Number.isNaN(value)) {
        return reply.badRequest('Alerta 1 inválido.');
      }
      updateData.alertDays1 = value;
    }
    if (body.alertDays2 !== undefined) {
      const value = normalizeAlertValue(body.alertDays2);
      if (Number.isNaN(value)) {
        return reply.badRequest('Alerta 2 inválido.');
      }
      updateData.alertDays2 = value;
    }
    if (body.alertDays3 !== undefined) {
      const value = normalizeAlertValue(body.alertDays3);
      if (Number.isNaN(value)) {
        return reply.badRequest('Alerta 3 inválido.');
      }
      updateData.alertDays3 = value;
    }
    if (body.isActive != null) {
      updateData.isActive = body.isActive;
    }

    const current = await app.prisma.catalogReportType.findUnique({ where: { id } });
    if (!current) {
      return reply.notFound('Tipo de laudo não encontrado.');
    }

    const finalGenerateAlert = updateData.generateAlert ?? current.generateAlert;
    const finalAlertDays1 = updateData.alertDays1 !== undefined ? updateData.alertDays1 : current.alertDays1;
    const finalAlertDays2 = updateData.alertDays2 !== undefined ? updateData.alertDays2 : current.alertDays2;
    const finalAlertDays3 = updateData.alertDays3 !== undefined ? updateData.alertDays3 : current.alertDays3;

    if (finalGenerateAlert) {
      if (
        finalAlertDays1 == null ||
        finalAlertDays2 == null ||
        finalAlertDays3 == null ||
        !(finalAlertDays1 > finalAlertDays2 && finalAlertDays2 > finalAlertDays3)
      ) {
        return reply.badRequest('Os alertas precisam estar preenchidos e em ordem decrescente (A1 > A2 > A3).');
      }
    }

    let item;
    try {
      item = await app.prisma.catalogReportType.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (!isLegacyReportClientError(error)) throw error;
      item = await app.prisma.catalogReportType.update({
        where: { id },
        data: {
          name: updateData.name,
          validityDays: updateData.validityDays,
          isActive: updateData.isActive,
        } as any,
      });
    }
    return { data: item };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.prisma.catalogReportType.findUnique({ where: { id } });
    if (!existing) {
      return reply.notFound('Tipo de laudo não encontrado.');
    }

    const linkedRecords = await app.prisma.tenantDocument.count({
      where: { reportTypeId: id },
    });

    if (linkedRecords > 0) {
      const updated = await app.prisma.catalogReportType.update({
        where: { id },
        data: { isActive: false },
      });
      return reply.send({
        data: updated,
        action: 'deactivated',
        message: 'Tipo desativado, pois possui laudos vinculados.',
      });
    }

    await app.prisma.catalogReportType.delete({ where: { id } });
    return reply.send({
      data: null,
      action: 'deleted',
      message: 'Tipo de laudo excluído com sucesso.',
    });
  });
}

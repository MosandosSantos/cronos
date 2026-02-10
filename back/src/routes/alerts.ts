import { FastifyInstance } from 'fastify';
import { DueStatus, UserRole } from '@prisma/client';
import { addDays, daysBetween, startOfDay } from '../utils/due';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

const getSettings = async (app: FastifyInstance) => {
  const settings = await app.prisma.alertSetting.findFirst();
  if (settings) return settings;
  return app.prisma.alertSetting.create({ data: {} });
};

export default async function alertRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const tenantId = request.authUser.tenantId as string;
    const settings = await getSettings(app);
    const now = startOfDay(new Date());

    const date30 = addDays(now, settings.window30);
    const date60 = addDays(now, settings.window60);
    const date90 = addDays(now, settings.window90);

    const countExpired = async (model: any) =>
      model.count({ where: { tenantId, dueDate: { lt: now } } });
    const countDue30 = async (model: any) =>
      model.count({ where: { tenantId, dueDate: { gte: now, lte: date30 } } });
    const countDue60 = async (model: any) =>
      model.count({ where: { tenantId, dueDate: { gt: date30, lte: date60 } } });
    const countDue90 = async (model: any) =>
      model.count({ where: { tenantId, dueDate: { gt: date60, lte: date90 } } });

    const models = [
      app.prisma.employeeAsoRecord,
      app.prisma.employeeExamRecord,
      app.prisma.employeeTrainingRecord,
      app.prisma.tenantDocument,
    ];

    const [expiredCounts, due30Counts, due60Counts, due90Counts] = await Promise.all([
      Promise.all(models.map((model) => countExpired(model))),
      Promise.all(models.map((model) => countDue30(model))),
      Promise.all(models.map((model) => countDue60(model))),
      Promise.all(models.map((model) => countDue90(model))),
    ]);

    const sum = (items: number[]) => items.reduce((acc, value) => acc + value, 0);

    return {
      data: {
        expired: sum(expiredCounts),
        due30: sum(due30Counts),
        due60: sum(due60Counts),
        due90: sum(due90Counts),
      },
    };
  });

  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const tenantId = request.authUser.tenantId as string;
    const query = request.query as { filter?: 'expired' | 'due30' | 'due60' | 'due90' };
    const settings = await getSettings(app);
    const now = startOfDay(new Date());
    const date30 = addDays(now, settings.window30);
    const date60 = addDays(now, settings.window60);
    const date90 = addDays(now, settings.window90);

    const buildRange = () => {
      switch (query.filter) {
        case 'expired':
          return { dueDate: { lt: now } };
        case 'due30':
          return { dueDate: { gte: now, lte: date30 } };
        case 'due60':
          return { dueDate: { gt: date30, lte: date60 } };
        case 'due90':
          return { dueDate: { gt: date60, lte: date90 } };
        default:
          return { dueDate: { gte: now, lte: date90 } };
      }
    };

    const range = buildRange();

    const [asos, exams, trainings, documents] = await Promise.all([
      app.prisma.employeeAsoRecord.findMany({
        where: { tenantId, ...range },
        include: { employee: true, asoType: true },
      }),
      app.prisma.employeeExamRecord.findMany({
        where: { tenantId, ...range },
        include: { employee: true, examType: true },
      }),
      app.prisma.employeeTrainingRecord.findMany({
        where: { tenantId, ...range },
        include: { employee: true, trainingType: true },
      }),
      app.prisma.tenantDocument.findMany({
        where: { tenantId, ...range },
        include: { reportType: true },
      }),
    ]);

    const items = [
      ...asos.map((record) => ({
        id: record.id,
        category: 'aso',
        label: record.asoType.name,
        employeeName: record.employee.name,
        dueDate: record.dueDate,
        status: record.status,
        daysToDue: daysBetween(new Date(), record.dueDate),
      })),
      ...exams.map((record) => ({
        id: record.id,
        category: 'exam',
        label: record.examType.name,
        employeeName: record.employee.name,
        dueDate: record.dueDate,
        status: record.status,
        daysToDue: daysBetween(new Date(), record.dueDate),
      })),
      ...trainings.map((record) => ({
        id: record.id,
        category: 'training',
        label: record.trainingType.name,
        employeeName: record.employee.name,
        dueDate: record.dueDate,
        status: record.status,
        daysToDue: daysBetween(new Date(), record.dueDate),
      })),
      ...documents.map((doc) => ({
        id: doc.id,
        category: 'document',
        label: doc.reportType.name,
        employeeName: null,
        dueDate: doc.dueDate,
        status: doc.status,
        daysToDue: daysBetween(new Date(), doc.dueDate),
      })),
    ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return { data: items };
  });
}

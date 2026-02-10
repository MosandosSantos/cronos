import { FastifyInstance } from 'fastify';
import { LeadTaskStatus, UserRole } from '@prisma/client';

const ensureAgendaRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const DEFAULT_CALENDAR_NAME = 'Google Calendar (padrao)';

const parseDate = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export default async function agendaRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureAgendaRead(app)] }, async (request, reply) => {
    const query = request.query as {
      from?: string;
      to?: string;
      status?: LeadTaskStatus;
      ownerId?: string;
    };

    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (query.from && !from) return reply.badRequest('Parametro from invalido.');
    if (query.to && !to) return reply.badRequest('Parametro to invalido.');

    const status =
      query.status && Object.values(LeadTaskStatus).includes(query.status)
        ? query.status
        : undefined;
    const role = request.authUser.role;
    const tenantId = request.authUser.tenantId;
    const clientId =
      role === UserRole.TENANT_ADMIN
        ? (await app.prisma.client.findUnique({ where: { userId: request.authUser.id } }))?.id
        : undefined;

    const crmItems = await app.prisma.agendaItem.findMany({
      where: {
        status,
        dateTime: {
          gte: from ?? undefined,
          lte: to ?? undefined,
        },
        lead:
          role === UserRole.SAAS_ADMIN
            ? query.ownerId
              ? { ownerId: query.ownerId }
              : undefined
            : { ownerId: request.authUser.id },
      },
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            ownerId: true,
          },
        },
        task: true,
      },
      orderBy: { dateTime: 'asc' },
    });

    const includeDerived = status !== LeadTaskStatus.DONE;

    const [contracts, trainingRecords, asoRecords, examRecords, documents] = includeDerived
      ? await Promise.all([
          app.prisma.saasContract.findMany({
            where: {
              endDate: {
                gte: from ?? undefined,
                lte: to ?? undefined,
              },
              clientId: role === UserRole.TENANT_ADMIN ? clientId ?? undefined : undefined,
            },
            select: {
              id: true,
              endDate: true,
              client: { select: { fullName: true } },
            },
            orderBy: { endDate: 'asc' },
          }),
          app.prisma.employeeTrainingRecord.findMany({
            where: {
              tenantId: role === UserRole.TENANT_ADMIN ? tenantId ?? undefined : undefined,
              dueDate: {
                gte: from ?? undefined,
                lte: to ?? undefined,
              },
            },
            select: {
              id: true,
              dueDate: true,
              employee: { select: { name: true } },
              trainingType: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
          }),
          app.prisma.employeeAsoRecord.findMany({
            where: {
              tenantId: role === UserRole.TENANT_ADMIN ? tenantId ?? undefined : undefined,
              dueDate: {
                gte: from ?? undefined,
                lte: to ?? undefined,
              },
            },
            select: {
              id: true,
              dueDate: true,
              employee: { select: { name: true } },
              asoType: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
          }),
          app.prisma.employeeExamRecord.findMany({
            where: {
              tenantId: role === UserRole.TENANT_ADMIN ? tenantId ?? undefined : undefined,
              dueDate: {
                gte: from ?? undefined,
                lte: to ?? undefined,
              },
            },
            select: {
              id: true,
              dueDate: true,
              employee: { select: { name: true } },
              examType: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
          }),
          app.prisma.tenantDocument.findMany({
            where: {
              tenantId: role === UserRole.TENANT_ADMIN ? tenantId ?? undefined : undefined,
              dueDate: {
                gte: from ?? undefined,
                lte: to ?? undefined,
              },
            },
            select: {
              id: true,
              dueDate: true,
              reportType: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
          }),
        ])
      : [[], [], [], [], []];

    const derivedItems = [
      ...contracts
        .filter((contract) => contract.endDate)
        .map((contract) => {
          return {
            id: `contract-${contract.id}`,
            title: `Vencimento de contrato - ${contract.client?.fullName ?? 'Cliente'}`,
            dateTime: contract.endDate as Date,
            status: LeadTaskStatus.OPEN,
            source: 'SAAS_CONTRACT',
            calendar: DEFAULT_CALENDAR_NAME,
            lead: null,
          };
        }),
      ...trainingRecords.map((record) => ({
        id: `training-${record.id}`,
        title: `Aula/Treinamento - ${record.employee.name} (${record.trainingType.name})`,
        dateTime: record.dueDate,
        status: LeadTaskStatus.OPEN,
        source: 'EMPLOYEE_TRAINING',
        calendar: DEFAULT_CALENDAR_NAME,
        lead: null,
      })),
      ...asoRecords.map((record) => ({
        id: `aso-${record.id}`,
        title: `ASO - ${record.employee.name} (${record.asoType.name})`,
        dateTime: record.dueDate,
        status: LeadTaskStatus.OPEN,
        source: 'EMPLOYEE_ASO',
        calendar: DEFAULT_CALENDAR_NAME,
        lead: null,
      })),
      ...examRecords.map((record) => ({
        id: `exam-${record.id}`,
        title: `Exame - ${record.employee.name} (${record.examType.name})`,
        dateTime: record.dueDate,
        status: LeadTaskStatus.OPEN,
        source: 'EMPLOYEE_EXAM',
        calendar: DEFAULT_CALENDAR_NAME,
        lead: null,
      })),
      ...documents.map((document) => ({
        id: `document-${document.id}`,
        title: `Vencimento de laudo - ${document.reportType.name}`,
        dateTime: document.dueDate,
        status: LeadTaskStatus.OPEN,
        source: 'TENANT_DOCUMENT',
        calendar: DEFAULT_CALENDAR_NAME,
        lead: null,
      })),
    ];

    const data = [
      ...crmItems.map((item) => ({
        ...item,
        calendar: DEFAULT_CALENDAR_NAME,
      })),
      ...derivedItems,
    ].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    return { data };
  });
}

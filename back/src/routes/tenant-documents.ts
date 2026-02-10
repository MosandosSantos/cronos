import { FastifyInstance } from 'fastify';
import { DueStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createWriteStream, existsSync, mkdirSync, createReadStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { calculateDue, daysBetween } from '../utils/due';

const ensureTenantAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.TENANT_ADMIN]);

const uploadsDir = path.join(process.cwd(), 'uploads');

export default async function tenantDocumentRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureTenantAdmin(app)] }, async (request) => {
    const query = request.query as { status?: DueStatus };
    const tenantId = request.authUser.tenantId as string;
    const documents = await app.prisma.tenantDocument.findMany({
      where: { tenantId, status: query.status },
      include: { reportType: true },
      orderBy: { dueDate: 'asc' },
    });

    const data = documents.map((doc) => ({
      ...doc,
      daysToDue: daysBetween(new Date(), doc.dueDate),
    }));

    return { data };
  });

  app.post('/', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const tenantId = request.authUser.tenantId as string;

    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const parts = request.parts();
    let reportTypeId = '';
    let issuedAt = '';
    let filePart: any = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        filePart = part;
      } else if (part.type === 'field') {
        if (part.fieldname === 'reportTypeId') reportTypeId = String(part.value);
        if (part.fieldname === 'issuedAt') issuedAt = String(part.value);
      }
    }

    if (!reportTypeId || !issuedAt || !filePart) {
      return reply.badRequest('Campos obrigatórios ausentes.');
    }

    if (filePart.mimetype !== 'application/pdf') {
      return reply.badRequest('Apenas PDF é permitido no MVP.');
    }

    const reportType = await app.prisma.catalogReportType.findUnique({
      where: { id: reportTypeId },
    });
    if (!reportType) {
      return reply.badRequest('Tipo de laudo inválido.');
    }

    const fileName = `${randomUUID()}-${filePart.filename}`;
    const filePath = path.join(uploadsDir, fileName);
    await pipeline(filePart.file, createWriteStream(filePath));

    const issuedDate = new Date(issuedAt);
    const { dueDate, status } = calculateDue(issuedDate, reportType.validityDays);

    const document = await app.prisma.tenantDocument.create({
      data: {
        tenantId,
        reportTypeId,
        issuedAt: issuedDate,
        dueDate,
        status,
        fileUrl: `uploads/${fileName}`,
      },
    });

    return reply.status(201).send({ data: document });
  });

  app.get('/:id/download', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    const document = await app.prisma.tenantDocument.findFirst({ where: { id, tenantId } });
    if (!document) {
      return reply.notFound('Documento não encontrado.');
    }

    const filePath = path.join(process.cwd(), document.fileUrl);
    reply.type('application/pdf');
    return reply.send(createReadStream(filePath));
  });

  app.delete('/:id', { preHandler: [ensureTenantAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.authUser.tenantId as string;
    await app.prisma.tenantDocument.delete({ where: { id, tenantId } });
    return reply.status(204).send();
  });
}

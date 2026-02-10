import { AsoExamKind, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';

const ensureCatalogRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

type AsoCatalogBody = {
  kind?: AsoExamKind;
  name?: string;
  description?: string;
  legalBasis?: string | null;
  triggerCondition?: string | null;
  validityDays?: number;
  isEsocialOnly?: boolean;
  isActive?: boolean;
};

export default async function catalogAsoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureCatalogRead(app)] }, async (request) => {
    const role = request.authUser?.role;
    const items = await app.prisma.catalogAsoType.findMany({
      where: role === UserRole.TENANT_ADMIN ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { data: items };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const body = request.body as AsoCatalogBody;

    if (!body.kind || !body.name || !body.description || body.validityDays == null) {
      return reply.badRequest(
        'Tipo, nome, descrição e validade (dias) são obrigatórios.'
      );
    }

    const existing = await app.prisma.catalogAsoType.findUnique({
      where: { kind: body.kind },
    });

    if (existing) {
      const updated = await app.prisma.catalogAsoType.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          description: body.description,
          legalBasis: body.legalBasis ?? null,
          triggerCondition: body.triggerCondition ?? null,
          validityDays: Number(body.validityDays),
          isEsocialOnly: body.isEsocialOnly ?? false,
          isActive: body.isActive ?? true,
        },
      });
      return reply.send({ data: updated, action: 'updated' });
    }

    const created = await app.prisma.catalogAsoType.create({
      data: {
        kind: body.kind,
        name: body.name,
        description: body.description,
        legalBasis: body.legalBasis ?? null,
        triggerCondition: body.triggerCondition ?? null,
        validityDays: Number(body.validityDays),
        isEsocialOnly: body.isEsocialOnly ?? false,
        isActive: body.isActive ?? true,
      },
    });
    return reply.status(201).send({ data: created, action: 'created' });
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as AsoCatalogBody;

    const item = await app.prisma.catalogAsoType.update({
      where: { id },
      data: {
        kind: body.kind,
        name: body.name,
        description: body.description,
        legalBasis: body.legalBasis ?? undefined,
        triggerCondition: body.triggerCondition ?? undefined,
        validityDays:
          body.validityDays == null ? undefined : Number(body.validityDays),
        isEsocialOnly: body.isEsocialOnly,
        isActive: body.isActive,
      },
    });
    return { data: item };
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.prisma.catalogAsoType.findUnique({ where: { id } });
    if (!existing) {
      return reply.notFound('Tipo de ASO não encontrado.');
    }

    const linkedRecords = await app.prisma.employeeAsoRecord.count({
      where: { asoTypeId: id },
    });

    if (linkedRecords > 0) {
      const updated = await app.prisma.catalogAsoType.update({
        where: { id },
        data: { isActive: false },
      });
      return reply.send({
        data: updated,
        action: 'deactivated',
        message:
          'Este tipo possui registros vinculados e foi desativado, em vez de excluído.',
      });
    }

    await app.prisma.catalogAsoType.delete({ where: { id } });
    return reply.send({
      data: null,
      action: 'deleted',
      message: 'Tipo de ASO excluído com sucesso.',
    });
  });
}

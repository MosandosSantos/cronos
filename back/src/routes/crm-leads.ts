import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { FastifyInstance } from 'fastify';
import {
  ActivityType,
  CrmProposalStatus,
  LeadStage,
  LeadStatus,
  LeadTaskStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

const ensureCrmRead = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);
const ensureCrmWrite = (app: FastifyInstance) =>
  app.authorizeRoles([UserRole.SAAS_ADMIN, UserRole.TENANT_ADMIN]);

const toNumber = (value: unknown) => {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const toDate = (value: unknown) => {
  if (value == null || value === '') return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

const normalizeLeadResult = (lead: any) => {
  const lastActivityDate = lead.activities?.[0]?.createdAt
    ? new Date(lead.activities[0].createdAt)
    : null;
  const lastStageDate = lead.stageHistory?.[0]?.changedAt
    ? new Date(lead.stageHistory[0].changedAt)
    : null;
  const staleReference = lastActivityDate || lastStageDate || new Date(lead.updatedAt);
  const daysStale = daysBetween(staleReference, new Date());

  return {
    ...lead,
    daysStale,
    lastActivity: lead.activities?.[0] ?? null,
    nextTask: lead.tasks?.[0] ?? null,
  };
};

const asLeadStatus = (value: unknown): LeadStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  if (value === LeadStatus.ABERTO || value === LeadStatus.GANHO || value === LeadStatus.PERDIDO) {
    return value;
  }
  return undefined;
};

const asLeadStage = (value: unknown): LeadStage | undefined => {
  if (typeof value !== 'string') return undefined;
  if (
    value === LeadStage.LEAD ||
    value === LeadStage.CONTATO ||
    value === LeadStage.PROPOSTA ||
    value === LeadStage.NEGOCIACAO ||
    value === LeadStage.FECHADO
  ) {
    return value;
  }
  return undefined;
};

export default async function crmLeadRoutes(app: FastifyInstance) {
  app.post('/leads', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const body = request.body as {
      companyName?: string;
      contactName?: string;
      phone?: string;
      email?: string;
      city?: string;
      source?: string;
      tags?: string[] | string;
      estimatedValue?: number;
      ownerId?: string;
      nextStep?: string;
      nextStepAt?: string;
    };

    if (!body.companyName?.trim()) {
      return reply.badRequest('Empresa e obrigatoria.');
    }

    const estimatedValue = toNumber(body.estimatedValue);
    if (estimatedValue !== undefined && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) {
      return reply.badRequest('Valor estimado invalido.');
    }

    const nextStepAt = toDate(body.nextStepAt);
    if (body.nextStepAt && !nextStepAt) {
      return reply.badRequest('Data do proximo passo invalida.');
    }
    const tags = Array.isArray(body.tags)
      ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : typeof body.tags === 'string'
        ? body.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

    const ownerId = body.ownerId || request.authUser.id;
    const owner = await app.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      return reply.badRequest('Responsavel nao encontrado.');
    }

    if (request.authUser.role !== UserRole.SAAS_ADMIN && ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para atribuir a outro responsavel.');
    }

    const lead = await app.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          companyName: body.companyName.trim(),
          contactName: body.contactName?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          city: body.city?.trim() || null,
          source: body.source?.trim() || null,
          tags,
          estimatedValue: estimatedValue == null ? undefined : estimatedValue,
          ownerId,
          nextStep: body.nextStep?.trim() || null,
          nextStepAt: nextStepAt ?? null,
        },
      });

      await tx.leadStageHistory.create({
        data: {
          leadId: created.id,
          fromStage: null,
          toStage: LeadStage.LEAD,
          changedBy: request.authUser.id,
        },
      });

      return created;
    });

    return reply.status(201).send({ data: lead });
  });

  app.get('/leads', { preHandler: [ensureCrmRead(app)] }, async (request) => {
    const query = request.query as {
      stage?: LeadStage;
      ownerId?: string;
      status?: LeadStatus;
      source?: string;
      tag?: string;
      city?: string;
      createdFrom?: string;
      createdTo?: string;
      staleDaysGt?: string;
      q?: string;
    };

    const stage = asLeadStage(query.stage);
    const status = asLeadStatus(query.status);
    const staleDaysGt = toNumber(query.staleDaysGt);
    const q = query.q?.trim();
    const role = request.authUser.role;

    const createdFrom = toDate(query.createdFrom);
    const createdTo = toDate(query.createdTo);
    if (query.createdFrom && !createdFrom) {
      throw app.httpErrors.badRequest('Parametro createdFrom invalido.');
    }
    if (query.createdTo && !createdTo) {
      throw app.httpErrors.badRequest('Parametro createdTo invalido.');
    }

    const where: Prisma.LeadWhereInput = {
      stage: stage ?? undefined,
      status: status ?? undefined,
      source: query.source?.trim() || undefined,
      tags: query.tag?.trim() ? { has: query.tag.trim() } : undefined,
      city: query.city?.trim() || undefined,
      createdAt:
        createdFrom || createdTo
          ? {
              gte: createdFrom ?? undefined,
              lte: createdTo ?? undefined,
            }
          : undefined,
      ownerId:
        role === UserRole.SAAS_ADMIN
          ? query.ownerId || undefined
          : request.authUser.id,
    };

    if (q) {
      where.OR = [
        { companyName: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const leads = await app.prisma.lead.findMany({
      where,
      include: {
        owner: { select: { id: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tasks: {
          where: { status: LeadTaskStatus.OPEN },
          orderBy: { dueAt: 'asc' },
          take: 1,
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const normalized = leads.map(normalizeLeadResult);
    const filtered =
      staleDaysGt != null && Number.isFinite(staleDaysGt)
        ? normalized.filter((item) => item.daysStale > staleDaysGt)
        : normalized;
    return { data: filtered };
  });

  app.get('/leads/:id', { preHandler: [ensureCrmRead(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { dueAt: 'asc' } },
        proposals: { orderBy: { createdAt: 'desc' } },
        attachments: { orderBy: { uploadedAt: 'desc' } },
        stageHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!lead) {
      return reply.notFound('Lead nao encontrado.');
    }
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para visualizar este lead.');
    }

    return { data: normalizeLeadResult(lead) };
  });

  app.put('/leads/:id', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      companyName?: string;
      contactName?: string | null;
      phone?: string | null;
      email?: string | null;
      city?: string | null;
      source?: string | null;
      tags?: string[] | string;
      estimatedValue?: number | null;
      ownerId?: string;
      nextStep?: string | null;
      nextStepAt?: string | null;
    };

    const current = await app.prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return reply.notFound('Lead nao encontrado.');
    }
    if (request.authUser.role !== UserRole.SAAS_ADMIN && current.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para editar este lead.');
    }

    const estimatedValue = toNumber(body.estimatedValue);
    if (body.estimatedValue != null && (!Number.isFinite(estimatedValue) || (estimatedValue ?? 0) < 0)) {
      return reply.badRequest('Valor estimado invalido.');
    }

    const nextStepAt = toDate(body.nextStepAt);
    if (body.nextStepAt != null && !nextStepAt) {
      return reply.badRequest('Data do proximo passo invalida.');
    }
    const tags =
      Array.isArray(body.tags)
        ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : typeof body.tags === 'string'
          ? body.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined;

    let ownerId = current.ownerId;
    if (body.ownerId && body.ownerId !== current.ownerId) {
      if (request.authUser.role !== UserRole.SAAS_ADMIN) {
        return reply.forbidden('Somente admin pode mudar o responsavel.');
      }
      const owner = await app.prisma.user.findUnique({ where: { id: body.ownerId } });
      if (!owner) {
        return reply.badRequest('Responsavel nao encontrado.');
      }
      ownerId = body.ownerId;
    }

    const updated = await app.prisma.lead.update({
      where: { id },
      data: {
        companyName: body.companyName?.trim() || undefined,
        contactName: body.contactName == null ? undefined : body.contactName.trim() || null,
        phone: body.phone == null ? undefined : body.phone.trim() || null,
        email: body.email == null ? undefined : body.email.trim() || null,
        city: body.city == null ? undefined : body.city.trim() || null,
        source: body.source == null ? undefined : body.source.trim() || null,
        tags,
        estimatedValue: body.estimatedValue == null ? undefined : estimatedValue,
        ownerId,
        nextStep: body.nextStep == null ? undefined : body.nextStep.trim() || null,
        nextStepAt: body.nextStepAt == null ? undefined : nextStepAt,
      },
    });
    return { data: updated };
  });

  app.patch('/leads/:id/stage', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { stage?: LeadStage };
    const stage = asLeadStage(body.stage);
    if (!stage) {
      return reply.badRequest('Fase invalida.');
    }

    const current = await app.prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return reply.notFound('Lead nao encontrado.');
    }
    if (request.authUser.role !== UserRole.SAAS_ADMIN && current.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para mover este lead.');
    }
    if (stage === LeadStage.FECHADO && current.status === LeadStatus.ABERTO) {
      return reply.badRequest('Use o fechamento para marcar GANHO ou PERDIDO.');
    }
    if (current.stage === stage) {
      return { data: current };
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      const next = await tx.lead.update({
        where: { id },
        data: { stage },
      });
      await tx.leadStageHistory.create({
        data: {
          leadId: id,
          fromStage: current.stage,
          toStage: stage,
          changedBy: request.authUser.id,
        },
      });
      return next;
    });

    return { data: updated };
  });

  app.patch('/leads/:id/close', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { result?: LeadStatus; reason?: string | null };
    const result = asLeadStatus(body.result);
    if (!result || result === LeadStatus.ABERTO) {
      return reply.badRequest('Resultado deve ser GANHO ou PERDIDO.');
    }
    const reason = body.reason?.trim() || null;
    if (result === LeadStatus.PERDIDO && !reason) {
      return reply.badRequest('Motivo da perda e obrigatorio.');
    }

    const current = await app.prisma.lead.findUnique({ where: { id } });
    if (!current) {
      return reply.notFound('Lead nao encontrado.');
    }
    if (request.authUser.role !== UserRole.SAAS_ADMIN && current.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para fechar este lead.');
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      const next = await tx.lead.update({
        where: { id },
        data: {
          stage: LeadStage.FECHADO,
          status: result,
          closeReason: reason,
        },
      });

      if (current.stage !== LeadStage.FECHADO) {
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: current.stage,
            toStage: LeadStage.FECHADO,
            changedBy: request.authUser.id,
          },
        });
      }
      return next;
    });

    return { data: updated };
  });

  app.post('/leads/:id/activities', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { type?: ActivityType; title?: string; description?: string };

    if (!body.type || !Object.values(ActivityType).includes(body.type)) {
      return reply.badRequest('Tipo de atividade invalido.');
    }

    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para editar este lead.');
    }

    const activity = await app.prisma.leadActivity.create({
      data: {
        leadId: id,
        type: body.type,
        title: body.title?.trim() || null,
        description: body.description?.trim() || null,
        createdBy: request.authUser.id,
      },
    });

    return reply.status(201).send({ data: activity });
  });

  app.get('/leads/:id/activities', { preHandler: [ensureCrmRead(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para visualizar este lead.');
    }

    const activities = await app.prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { data: activities };
  });

  app.post('/leads/:id/tasks', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; description?: string; dueAt?: string; reminderAt?: string };

    if (!body.title?.trim()) {
      return reply.badRequest('Titulo da tarefa e obrigatorio.');
    }
    const dueAt = toDate(body.dueAt);
    if (!dueAt) {
      return reply.badRequest('Data da tarefa invalida.');
    }
    const reminderAt = toDate(body.reminderAt);
    if (body.reminderAt && !reminderAt) {
      return reply.badRequest('Data de lembrete invalida.');
    }

    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para editar este lead.');
    }

    const task = await app.prisma.$transaction(async (tx) => {
      const created = await tx.leadTask.create({
        data: {
          leadId: id,
          title: body.title!.trim(),
          description: body.description?.trim() || null,
          dueAt,
          reminderAt: reminderAt ?? null,
          createdBy: request.authUser.id,
        },
      });

      await tx.agendaItem.create({
        data: {
          taskId: created.id,
          leadId: id,
          title: created.title,
          dateTime: created.dueAt,
          status: created.status,
          createdBy: request.authUser.id,
        },
      });

      return created;
    });

    return reply.status(201).send({ data: task });
  });

  app.get('/leads/:id/tasks', { preHandler: [ensureCrmRead(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para visualizar este lead.');
    }

    const tasks = await app.prisma.leadTask.findMany({
      where: { leadId: id },
      orderBy: { dueAt: 'asc' },
    });
    return { data: tasks };
  });

  app.patch('/tasks/:id', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status?: LeadTaskStatus };
    if (!body.status || !Object.values(LeadTaskStatus).includes(body.status)) {
      return reply.badRequest('Status da tarefa invalido.');
    }

    const task = await app.prisma.leadTask.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!task) return reply.notFound('Tarefa nao encontrada.');
    if (
      request.authUser.role !== UserRole.SAAS_ADMIN &&
      task.lead &&
      task.lead.ownerId !== request.authUser.id
    ) {
      return reply.forbidden('Sem permissao para alterar esta tarefa.');
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      const taskUpdated = await tx.leadTask.update({
        where: { id },
        data: { status: body.status },
      });
      await tx.agendaItem.updateMany({
        where: { taskId: id },
        data: {
          status: body.status,
          title: taskUpdated.title,
          dateTime: taskUpdated.dueAt,
        },
      });
      return taskUpdated;
    });

    return { data: updated };
  });

  app.post('/leads/:id/proposals', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: CrmProposalStatus;
      value?: number;
      description?: string;
      sentAt?: string;
      fileUrl?: string;
      fileName?: string;
    };

    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para editar este lead.');
    }

    const value = toNumber(body.value);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return reply.badRequest('Valor da proposta invalido.');
    }
    const sentAt = toDate(body.sentAt);
    if (body.sentAt && !sentAt) {
      return reply.badRequest('Data de envio invalida.');
    }

    const proposal = await app.prisma.leadProposal.create({
      data: {
        leadId: id,
        status:
          body.status && Object.values(CrmProposalStatus).includes(body.status)
            ? body.status
            : CrmProposalStatus.DRAFT,
        value: value == null ? undefined : value,
        description: body.description?.trim() || null,
        sentAt: sentAt ?? null,
        fileUrl: body.fileUrl?.trim() || null,
        fileName: body.fileName?.trim() || null,
        createdBy: request.authUser.id,
      },
    });

    return reply.status(201).send({ data: proposal });
  });

  app.get('/leads/:id/proposals', { preHandler: [ensureCrmRead(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para visualizar este lead.');
    }

    const proposals = await app.prisma.leadProposal.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { data: proposals };
  });

  app.patch('/proposals/:id', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: CrmProposalStatus;
      value?: number;
      description?: string;
      sentAt?: string;
      fileUrl?: string;
      fileName?: string;
    };

    const proposal = await app.prisma.leadProposal.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!proposal) return reply.notFound('Proposta nao encontrada.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && proposal.lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para alterar esta proposta.');
    }

    const value = toNumber(body.value);
    if (body.value != null && (!Number.isFinite(value) || (value ?? 0) < 0)) {
      return reply.badRequest('Valor da proposta invalido.');
    }
    const sentAt = toDate(body.sentAt);
    if (body.sentAt != null && !sentAt) {
      return reply.badRequest('Data de envio invalida.');
    }
    if (body.status != null && !Object.values(CrmProposalStatus).includes(body.status)) {
      return reply.badRequest('Status da proposta invalido.');
    }

    const updated = await app.prisma.leadProposal.update({
      where: { id },
      data: {
        status: body.status,
        value: body.value == null ? undefined : value,
        description: body.description == null ? undefined : body.description.trim() || null,
        sentAt: body.sentAt == null ? undefined : sentAt,
        fileUrl: body.fileUrl == null ? undefined : body.fileUrl.trim() || null,
        fileName: body.fileName == null ? undefined : body.fileName.trim() || null,
      },
    });
    return { data: updated };
  });

  app.post('/leads/:id/attachments', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para editar este lead.');
    }

    let url: string | null = null;
    let filename: string | null = null;
    let mimeType: string | null = null;

    if ((request as any).isMultipart && (request as any).isMultipart()) {
      const file = await (request as any).file();
      if (!file) {
        return reply.badRequest('Arquivo nao informado.');
      }

      const extension = path.extname(file.filename || '');
      const safeName = `${randomUUID()}${extension}`;
      const relativePath = path.join('uploads', 'crm', safeName);
      const targetPath = path.resolve(process.cwd(), relativePath);

      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const buffer = await file.toBuffer();
      await fs.writeFile(targetPath, buffer);

      url = `/${relativePath.replace(/\\/g, '/')}`;
      filename = file.filename || safeName;
      mimeType = file.mimetype || null;
    } else {
      const body = request.body as { url?: string; filename?: string; mimeType?: string };
      if (!body.url?.trim() || !body.filename?.trim()) {
        return reply.badRequest('Informe url e filename quando nao houver upload multipart.');
      }
      url = body.url.trim();
      filename = body.filename.trim();
      mimeType = body.mimeType?.trim() || null;
    }

    const attachment = await app.prisma.leadAttachment.create({
      data: {
        leadId: id,
        url: url!,
        filename: filename!,
        mimeType,
        uploadedBy: request.authUser.id,
      },
    });

    return reply.status(201).send({ data: attachment });
  });

  app.get('/leads/:id/attachments', { preHandler: [ensureCrmRead(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.notFound('Lead nao encontrado.');
    if (request.authUser.role !== UserRole.SAAS_ADMIN && lead.ownerId !== request.authUser.id) {
      return reply.forbidden('Sem permissao para visualizar este lead.');
    }

    const attachments = await app.prisma.leadAttachment.findMany({
      where: { leadId: id },
      orderBy: { uploadedAt: 'desc' },
    });
    return { data: attachments };
  });

  app.delete('/attachments/:id', { preHandler: [ensureCrmWrite(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const attachment = await app.prisma.leadAttachment.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!attachment) {
      return reply.notFound('Anexo nao encontrado.');
    }
    if (
      request.authUser.role !== UserRole.SAAS_ADMIN &&
      attachment.lead &&
      attachment.lead.ownerId !== request.authUser.id
    ) {
      return reply.forbidden('Sem permissao para remover este anexo.');
    }

    await app.prisma.leadAttachment.delete({ where: { id } });

    if (attachment.url.startsWith('/uploads/crm/')) {
      const filePath = path.resolve(process.cwd(), attachment.url.replace(/^\//, ''));
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore deletion errors to keep API response stable.
      }
    }

    return reply.status(204).send();
  });
}

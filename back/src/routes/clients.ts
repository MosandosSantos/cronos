import { FastifyInstance } from 'fastify';
import { Prisma, UserRole } from '@prisma/client';

type ClientBody = {
  userId?: string | null;
  fullName?: string;
  email?: string;
  cpf?: string | null;
  cnpj?: string | null;
  phone?: string;
  birthDate?: string | null;
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive?: boolean;
};

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

const onlyDigits = (value?: string | null) => (value ? value.replace(/\D/g, '') : '');

const formatZipCode = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return '';
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
};

const isRepeatedDigits = (value: string) => /^([0-9])\1+$/.test(value);

const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  return secondDigit === Number(digits[10]);
};

const isValidCnpj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || isRepeatedDigits(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const total = base
      .split('')
      .reduce((sum, current, index) => sum + Number(current) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(
    `${digits.slice(0, 12)}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
};

const trimOrNull = (value?: string | null) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanDocumentValue = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const isValidUuid = (value: string) =>
  /^(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const normalizeInput = (body: ClientBody) => {
  const cpf = cleanDocumentValue(body.cpf);
  const cnpj = cleanDocumentValue(body.cnpj);
  const phone = onlyDigits(body.phone);
  const zipCode = formatZipCode(body.zipCode);
  const state = (body.state || '').trim().toUpperCase();

  return {
    userId: trimOrNull(body.userId),
    fullName: (body.fullName || '').trim(),
    email: (body.email || '').trim().toLowerCase(),
    cpf,
    cnpj,
    phone,
    birthDate: trimOrNull(body.birthDate),
    street: (body.street || '').trim(),
    number: (body.number || '').trim(),
    complement: trimOrNull(body.complement),
    neighborhood: (body.neighborhood || '').trim(),
    city: (body.city || '').trim(),
    state,
    zipCode,
    isActive: body.isActive ?? true,
  };
};

const validateClientData = (data: ReturnType<typeof normalizeInput>, isCreate = true) => {
  if (isCreate) {
    if (!data.fullName) throw new Error('Nome completo é obrigatório.');
    if (!data.email) throw new Error('E-mail é obrigatório.');
    if (!data.phone) throw new Error('Telefone é obrigatório.');
    if (!data.street) throw new Error('Rua é obrigatória.');
    if (!data.number) throw new Error('Número é obrigatório.');
    if (!data.neighborhood) throw new Error('Bairro é obrigatório.');
    if (!data.city) throw new Error('Cidade é obrigatória.');
    if (!data.state) throw new Error('UF é obrigatória.');
    if (!data.zipCode) throw new Error('CEP é obrigatório.');
  }

  if (data.state && data.state.length !== 2) {
    throw new Error('UF deve conter 2 caracteres.');
  }
  if (data.zipCode && onlyDigits(data.zipCode).length !== 8) {
    throw new Error('CEP inválido.');
  }

  if (!data.cpf && !data.cnpj) {
    throw new Error('Informe CPF ou CNPJ.');
  }
  if (data.cpf && data.cnpj) {
    throw new Error('Informe apenas CPF ou apenas CNPJ.');
  }
  if (data.cpf && !isValidCpf(data.cpf)) {
    throw new Error('CPF inválido.');
  }
  if (data.cnpj && !isValidCnpj(data.cnpj)) {
    throw new Error('CNPJ inválido.');
  }
  if (data.userId && !isValidUuid(data.userId)) {
    throw new Error('Usuário inválido.');
  }
};

const parseBirthDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data de nascimento inválida.');
  }
  return parsed;
};

const mapPrismaError = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== 'P2002') return null;

  const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
  if (target.includes('cpf')) return 'CPF já cadastrado.';
  if (target.includes('cnpj')) return 'CNPJ já cadastrado.';
  if (target.includes('email')) return 'E-mail já cadastrado.';
  if (target.includes('user_id') || target.includes('userId')) return 'Usuário já vinculado a outro cliente.';

  return 'Já existe um registro com os dados informados.';
};

export default async function clientRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const query = request.query as { q?: string; isActive?: string };
    const q = query.q?.trim();
    const digitsQuery = q ? q.replace(/\D/g, '') : '';

    const clients = await app.prisma.client.findMany({
      where: {
        isActive: query.isActive == null ? undefined : query.isActive === 'true',
        OR: q
          ? [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
              ...(digitsQuery
                ? [{ cpf: { contains: digitsQuery } }, { cnpj: { contains: digitsQuery } }]
                : []),
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: clients };
  });

  app.post('/', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    try {
      const body = normalizeInput(request.body as ClientBody);
      validateClientData(body, true);

      const client = await app.prisma.client.create({
        data: {
          userId: body.userId,
          fullName: body.fullName,
          email: body.email,
          cpf: body.cpf,
          cnpj: body.cnpj,
          phone: body.phone,
          birthDate: parseBirthDate(body.birthDate),
          street: body.street,
          number: body.number,
          complement: body.complement,
          neighborhood: body.neighborhood,
          city: body.city,
          state: body.state,
          zipCode: body.zipCode,
          isActive: body.isActive,
        },
      });

      return reply.status(201).send({ data: client });
    } catch (error) {
      const mapped = mapPrismaError(error);
      if (mapped) return reply.badRequest(mapped);
      if (error instanceof Error) return reply.badRequest(error.message);
      throw error;
    }
  });

  app.put('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const current = await app.prisma.client.findUnique({ where: { id } });
      if (!current) {
        return reply.notFound('Cliente não encontrado.');
      }

      const rawBody = request.body as ClientBody;
      const normalized = normalizeInput(rawBody);
      const merged = {
        userId: hasOwn(rawBody, 'userId') ? normalized.userId : current.userId,
        fullName: normalized.fullName || current.fullName,
        email: normalized.email || current.email,
        cpf: hasOwn(rawBody, 'cpf') ? normalized.cpf : current.cpf,
        cnpj: hasOwn(rawBody, 'cnpj') ? normalized.cnpj : current.cnpj,
        phone: normalized.phone || current.phone,
        birthDate: hasOwn(rawBody, 'birthDate')
          ? normalized.birthDate
          : current.birthDate
            ? current.birthDate.toISOString()
            : null,
        street: normalized.street || current.street,
        number: normalized.number || current.number,
        complement: hasOwn(rawBody, 'complement') ? normalized.complement : current.complement,
        neighborhood: normalized.neighborhood || current.neighborhood,
        city: normalized.city || current.city,
        state: normalized.state || current.state,
        zipCode: normalized.zipCode || current.zipCode,
        isActive: rawBody.isActive ?? current.isActive,
      };

      validateClientData(merged, false);

      const client = await app.prisma.client.update({
        where: { id },
        data: {
          userId: merged.userId,
          fullName: merged.fullName,
          email: merged.email,
          cpf: merged.cpf,
          cnpj: merged.cnpj,
          phone: merged.phone,
          birthDate: parseBirthDate(merged.birthDate),
          street: merged.street,
          number: merged.number,
          complement: merged.complement,
          neighborhood: merged.neighborhood,
          city: merged.city,
          state: merged.state,
          zipCode: merged.zipCode,
          isActive: merged.isActive,
        },
      });

      return { data: client };
    } catch (error) {
      const mapped = mapPrismaError(error);
      if (mapped) return reply.badRequest(mapped);
      if (error instanceof Error) return reply.badRequest(error.message);
      throw error;
    }
  });

  app.delete('/:id', { preHandler: [ensureSaasAdmin(app)] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await app.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return reply.notFound('Cliente não encontrado.');
    }

    await app.prisma.client.delete({ where: { id } });
    return reply.send({ data: null, action: 'deleted', message: 'Cliente excluído com sucesso.' });
  });
}

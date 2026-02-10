import { FastifyInstance } from 'fastify';
import { UserRole } from '@prisma/client';

const ensureSaasAdmin = (app: FastifyInstance) => app.authorizeRoles([UserRole.SAAS_ADMIN]);

async function getOrCreateSettings(app: FastifyInstance) {
  const existing = await app.prisma.alertSetting.findFirst();
  if (existing) return existing;
  return app.prisma.alertSetting.create({ data: {} });
}

export default async function alertSettingsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [ensureSaasAdmin(app)] }, async () => {
    const settings = await getOrCreateSettings(app);
    return { data: settings };
  });

  app.put('/', { preHandler: [ensureSaasAdmin(app)] }, async (request) => {
    const body = request.body as { window30?: number; window60?: number; window90?: number };
    const settings = await getOrCreateSettings(app);
    const updated = await app.prisma.alertSetting.update({
      where: { id: settings.id },
      data: {
        window30: body.window30 ? Number(body.window30) : undefined,
        window60: body.window60 ? Number(body.window60) : undefined,
        window90: body.window90 ? Number(body.window90) : undefined,
      },
    });
    return { data: updated };
  });
}

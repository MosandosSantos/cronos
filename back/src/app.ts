import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';

import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import contractRoutes from './routes/contracts';
import crmContactsRoutes from './routes/crm-contacts';
import crmProposalsRoutes from './routes/crm-proposals';
import crmLeadRoutes from './routes/crm-leads';
import clientRoutes from './routes/clients';
import catalogAsoRoutes from './routes/catalog-aso-types';
import catalogExamRoutes from './routes/catalog-exam-types';
import catalogTrainingRoutes from './routes/catalog-training-types';
import catalogReportRoutes from './routes/catalog-report-types';
import employeeRoutes from './routes/employees';
import employeeAsoRoutes from './routes/employee-aso-records';
import employeeExamRoutes from './routes/employee-exam-records';
import employeeTrainingRoutes from './routes/employee-training-records';
import tenantDocumentRoutes from './routes/tenant-documents';
import alertRoutes from './routes/alerts';
import alertSettingsRoutes from './routes/alert-settings';
import agendaRoutes from './routes/agenda';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(sensible);
  app.register(cors, { origin: true });
  app.register(helmet);
  app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  app.register(multipart);

  app.register(prismaPlugin);
  app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(authRoutes, { prefix: '/auth' });

  app.register(tenantRoutes, { prefix: '/tenants', preHandler: [app.authenticate] });
  app.register(contractRoutes, { prefix: '/contracts', preHandler: [app.authenticate] });
  app.register(clientRoutes, { prefix: '/clients', preHandler: [app.authenticate] });
  app.register(crmContactsRoutes, { prefix: '/crm/contacts', preHandler: [app.authenticate] });
  app.register(crmProposalsRoutes, { prefix: '/crm/proposals', preHandler: [app.authenticate] });
  app.register(crmLeadRoutes, { prefix: '/crm', preHandler: [app.authenticate] });
  app.register(agendaRoutes, { prefix: '/agenda', preHandler: [app.authenticate] });
  app.register(catalogAsoRoutes, { prefix: '/catalog/aso', preHandler: [app.authenticate] });
  app.register(catalogExamRoutes, { prefix: '/catalog/exams', preHandler: [app.authenticate] });
  app.register(catalogTrainingRoutes, { prefix: '/catalog/trainings', preHandler: [app.authenticate] });
  app.register(catalogReportRoutes, { prefix: '/catalog/reports', preHandler: [app.authenticate] });

  app.register(employeeRoutes, { prefix: '/employees', preHandler: [app.authenticate] });
  app.register(employeeAsoRoutes, { prefix: '/employee-aso-records', preHandler: [app.authenticate] });
  app.register(employeeExamRoutes, { prefix: '/employee-exam-records', preHandler: [app.authenticate] });
  app.register(employeeTrainingRoutes, { prefix: '/employee-training-records', preHandler: [app.authenticate] });
  app.register(tenantDocumentRoutes, { prefix: '/tenant-documents', preHandler: [app.authenticate] });
  app.register(alertRoutes, { prefix: '/alerts', preHandler: [app.authenticate] });
  app.register(alertSettingsRoutes, { prefix: '/alert-settings', preHandler: [app.authenticate] });

  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: {
        message: error.message ?? 'Unexpected error',
        code: error.code ?? 'INTERNAL_ERROR',
      },
    });
  });

  return app;
}

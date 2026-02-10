import { PrismaClient, RiskType, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const tenantSeed = {
  name: 'Esfera Engenharia',
  cnpj: '00.000.000/0001-00',
  status: 'active',
};

const adminSeed = {
  email: 'mosansantos@yahoo.com.br',
  password: 'teste2026',
  role: 'ADMIN',
  isActive: true,
};

const siteSeed = {
  name: 'Matriz',
  address: 'Endereco principal',
};

const areaSeeds = [
  { name: 'Financeiro', accidentMonthlyGoal: 1 },
  { name: 'Operacoes', accidentMonthlyGoal: 10 },
  { name: 'Juridico', accidentMonthlyGoal: 1 },
  { name: 'Logistica', accidentMonthlyGoal: 5 },
];

const jobRoleSeeds = [
  'Analista Jr.',
  'Analista Pleno',
  'Analista Senior',
  'Operador Jr.',
  'Operador Pleno',
  'Operador Senior',
  'Gerente de Operacoes',
  'Gerente Executivo',
  'Diretor de Operacoes',
  'Diretor Executivo',
];

const workerSeeds = [
  { fullName: 'Carlos Henrique', jobRole: 'Analista Jr.', area: 'Financeiro' },
  { fullName: 'Matheus Pereira', jobRole: 'Operador Jr.', area: 'Operacoes' },
  { fullName: 'Rodrigo Machado', jobRole: 'Operador Pleno', area: 'Operacoes' },
  { fullName: 'Carolina Torres', jobRole: 'Gerente de Operacoes', area: 'Operacoes' },
  { fullName: 'Bianca Silva', jobRole: 'Gerente Executivo', area: 'Logistica' },
  { fullName: 'Caio Souza', jobRole: 'Analista Pleno', area: 'Juridico' },
];

const riskSeeds = [
  {
    title: 'Vazamento de Gases',
    area: 'Operacoes',
    riskType: RiskType.QUIMICO,
    exposureFrequency: 'Eventual',
    possibleHarm: 'Iminente',
    riskGrade: 'Alto',
    severity: 16,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Risco de Incendio',
    area: 'Operacoes',
    riskType: RiskType.FISICO,
    exposureFrequency: 'Intermitente',
    possibleHarm: 'Medio',
    riskGrade: 'Medio',
    severity: 12,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Infeccao bacteriana',
    area: 'Operacoes',
    riskType: RiskType.BIOLOGICO,
    exposureFrequency: 'Permanente',
    possibleHarm: 'Iminente',
    riskGrade: 'Alto',
    severity: 48,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Ruidos',
    area: 'Logistica',
    riskType: RiskType.FISICO,
    exposureFrequency: 'Eventual',
    possibleHarm: 'Alto',
    riskGrade: 'Medio',
    severity: 9,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Alto ritmo de trabalho',
    area: 'Operacoes',
    riskType: RiskType.OUTRO,
    exposureFrequency: 'Intermitente',
    possibleHarm: 'Estresse',
    riskGrade: 'Medio',
    severity: 8,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Postura inadequada',
    area: 'Financeiro',
    riskType: RiskType.OUTRO,
    exposureFrequency: 'Permanente',
    possibleHarm: 'Lesoes musculares',
    riskGrade: 'Baixo',
    severity: 6,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
  {
    title: 'Escorregamento e deslizamentos',
    area: 'Juridico',
    riskType: RiskType.FISICO,
    exposureFrequency: 'Eventual',
    possibleHarm: 'Queda',
    riskGrade: 'Medio',
    severity: 10,
    existingControls: null,
    needsPpe: false,
    ppeList: null,
  },
];

const pcmsoExamSeeds = [
  {
    name: 'Exame de Sangue',
    area: 'Operacoes',
    jobRole: null,
    frequency: 'Semanalmente',
  },
  {
    name: 'Exame de MAPA',
    area: 'Financeiro',
    jobRole: null,
    frequency: 'Mensalmente',
  },
  {
    name: 'Ultrassonografia',
    area: 'Operacoes',
    jobRole: 'Operador Jr.',
    frequency: 'Quinzenalmente',
  },
  {
    name: 'Radiografia',
    area: 'Juridico',
    jobRole: 'Operador Senior',
    frequency: 'Mensalmente',
  },
];

const incidentSeeds = [
  {
    occurredAt: new Date('2017-07-07T00:00:00.000Z'),
    risk: 'Risco de Incendio',
    worker: 'Matheus Pereira',
    area: 'Operacoes',
    cause: 'Curto circuito',
    victimStatus: 'Ferida',
    ppeOk: 'Sim',
  },
  {
    occurredAt: new Date('2017-07-08T00:00:00.000Z'),
    risk: 'Infeccao bacteriana',
    worker: 'Rodrigo Machado',
    area: 'Operacoes',
    cause: 'Falta de protecao',
    victimStatus: 'Ferida Gravemente',
    ppeOk: 'Nao',
  },
  {
    occurredAt: new Date('2017-07-09T00:00:00.000Z'),
    risk: 'Ruidos',
    worker: 'Bianca Silva',
    area: 'Logistica',
    cause: 'Alto barulho das maquinas',
    victimStatus: 'Ferida levemente',
    ppeOk: 'Sim',
  },
  {
    occurredAt: new Date('2017-07-10T00:00:00.000Z'),
    risk: 'Escorregamento e deslizamentos',
    worker: 'Caio Souza',
    area: 'Juridico',
    cause: 'Chao molhado',
    victimStatus: 'Ferida',
    ppeOk: 'Nao se aplica',
  },
];

const psychosocialSurveySeed = {
  name: 'Diagnóstico Psicossocial - Operações',
  status: 'ATIVO',
};

const psychosocialQuestionsSeed = [
  {
    dimension: 'Carga de trabalho',
    question: 'Sinto que a carga de trabalho é adequada para o meu turno.',
    sortOrder: 1,
  },
  {
    dimension: 'Autonomia',
    question: 'Tenho autonomia para organizar minhas tarefas diárias.',
    sortOrder: 2,
  },
  {
    dimension: 'Relacionamento',
    question: 'A comunicação com a liderança é clara e respeitosa.',
    sortOrder: 3,
  },
  {
    dimension: 'Reconhecimento',
    question: 'Recebo feedbacks e reconhecimento pelo meu trabalho.',
    sortOrder: 4,
  },
  {
    dimension: 'Segurança psicológica',
    question: 'Posso relatar problemas sem medo de retaliação.',
    sortOrder: 5,
  },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { name: tenantSeed.name },
    update: {},
    create: tenantSeed,
  });

  const passwordHash = await bcrypt.hash(adminSeed.password, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminSeed.email },
    update: {},
    create: {
      email: adminSeed.email,
      passwordHash,
      role: adminSeed.role,
      isActive: adminSeed.isActive,
      tenantId: tenant.id,
    },
  });

  const site = await prisma.site.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: siteSeed.name } },
    update: {},
    create: {
      ...siteSeed,
      tenantId: tenant.id,
    },
  });

  const areas = new Map<string, string>();
  for (const area of areaSeeds) {
    const created = await prisma.area.upsert({
      where: { siteId_name: { siteId: site.id, name: area.name } },
      update: { accidentMonthlyGoal: area.accidentMonthlyGoal },
      create: {
        name: area.name,
        accidentMonthlyGoal: area.accidentMonthlyGoal,
        siteId: site.id,
      },
    });
    areas.set(area.name, created.id);
  }

  const jobRoles = new Map<string, string>();
  for (const name of jobRoleSeeds) {
    const created = await prisma.jobRole.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { name, tenantId: tenant.id },
    });
    jobRoles.set(name, created.id);
  }

  const workers = new Map<string, string>();
  for (const worker of workerSeeds) {
    const created = await prisma.worker.upsert({
      where: { tenantId_fullName: { tenantId: tenant.id, fullName: worker.fullName } },
      update: {},
      create: {
        fullName: worker.fullName,
        tenantId: tenant.id,
        jobRoleId: jobRoles.get(worker.jobRole)!,
        areaId: areas.get(worker.area)!,
      },
    });
    workers.set(worker.fullName, created.id);
  }

  const risks = new Map<string, string>();
  for (const risk of riskSeeds) {
    const created = await prisma.risk.upsert({
      where: { areaId_title: { areaId: areas.get(risk.area)!, title: risk.title } },
      update: {},
      create: {
        title: risk.title,
        areaId: areas.get(risk.area)!,
        riskType: risk.riskType,
        exposureFrequency: risk.exposureFrequency,
        possibleHarm: risk.possibleHarm,
        riskGrade: risk.riskGrade,
        severity: risk.severity,
        existingControls: risk.existingControls,
        needsPpe: risk.needsPpe,
        ppeList: risk.ppeList,
      },
    });
    risks.set(risk.title, created.id);
  }

  for (const exam of pcmsoExamSeeds) {
    const areaId = exam.area ? areas.get(exam.area)! : null;
    const jobRoleId = exam.jobRole ? jobRoles.get(exam.jobRole)! : null;
    const existing = await prisma.pcmsoExam.findFirst({
      where: {
        tenantId: tenant.id,
        name: exam.name,
        areaId,
        jobRoleId,
      },
    });
    if (existing) {
      await prisma.pcmsoExam.update({
        where: { id: existing.id },
        data: { frequency: exam.frequency },
      });
      continue;
    }
    await prisma.pcmsoExam.create({
      data: {
        name: exam.name,
        tenantId: tenant.id,
        areaId,
        jobRoleId,
        frequency: exam.frequency,
      },
    });
  }

  for (const incident of incidentSeeds) {
    const workerId = workers.get(incident.worker)!;
    const riskId = risks.get(incident.risk)!;
    await prisma.incident.upsert({
      where: {
        occurredAt_workerId_riskId: {
          occurredAt: incident.occurredAt,
          workerId,
          riskId,
        },
      },
      update: {
        areaId: areas.get(incident.area)!,
        cause: incident.cause,
        victimStatus: incident.victimStatus,
        ppeOk: incident.ppeOk,
      },
      create: {
        areaId: areas.get(incident.area)!,
        workerId,
        riskId,
        cause: incident.cause,
        victimStatus: incident.victimStatus,
        ppeOk: incident.ppeOk,
        occurredAt: incident.occurredAt,
      },
    });
  }

  const survey = await prisma.psychosocialSurvey.findFirst({
    where: { tenantId: tenant.id, name: psychosocialSurveySeed.name },
  });
  const operacoesAreaId = areas.get('Operacoes') ?? null;
  const surveyRecord =
    survey ??
    (await prisma.psychosocialSurvey.create({
      data: {
        tenantId: tenant.id,
        name: psychosocialSurveySeed.name,
        status: psychosocialSurveySeed.status,
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2026-02-28T23:59:59.000Z'),
        siteId: site.id,
        areaId: operacoesAreaId,
      },
    }));

  for (const question of psychosocialQuestionsSeed) {
    const existing = await prisma.psychosocialQuestion.findFirst({
      where: {
        surveyId: surveyRecord.id,
        question: question.question,
      },
    });
    if (existing) {
      continue;
    }
    await prisma.psychosocialQuestion.create({
      data: {
        surveyId: surveyRecord.id,
        question: question.question,
        dimension: question.dimension,
        sortOrder: question.sortOrder,
      },
    });
  }

  const questions = await prisma.psychosocialQuestion.findMany({
    where: { surveyId: surveyRecord.id },
  });

  const responseCount = await prisma.psychosocialResponse.count({
    where: { surveyId: surveyRecord.id },
  });

  if (responseCount === 0 && questions.length) {
    const sampleAnswers = [
      [3, 4, 4, 3, 5],
      [2, 3, 3, 2, 4],
      [4, 4, 5, 4, 4],
      [3, 2, 3, 3, 3],
    ];

    for (const values of sampleAnswers) {
      const answers: Record<string, number> = {};
      questions.forEach((question, index) => {
        answers[question.id] = values[index % values.length];
      });
      await prisma.psychosocialResponse.create({
        data: {
          surveyId: surveyRecord.id,
          anonymousToken: `seed-${Math.random().toString(36).slice(2, 10)}`,
          answersJson: JSON.stringify(answers),
        },
      });
    }
  }

  if (operacoesAreaId) {
    const existingRisk = await prisma.risk.findFirst({
      where: { areaId: operacoesAreaId, title: 'Psicossociais' },
    });
    if (!existingRisk) {
      await prisma.risk.create({
        data: {
          areaId: operacoesAreaId,
          title: 'Psicossociais',
          riskType: RiskType.OUTRO,
          exposureFrequency: 'Permanente',
          possibleHarm: 'Estresse e impactos psicossociais',
          riskGrade: 'Medio',
          severity: 8,
          existingControls: 'Monitoramento contínuo',
          needsPpe: false,
        },
      });
    }
  }

  const actionPlanSeeds = [
    { title: 'Plano de ação - Vazamento de Gases', risk: 'Vazamento de Gases' },
    { title: 'Plano de ação - Risco de Incendio', risk: 'Risco de Incendio' },
    { title: 'Plano de ação - Postura inadequada', risk: 'Postura inadequada' },
    { title: 'Plano de ação - Ruidos', risk: 'Ruidos' },
  ];

  const actionPlanMap = new Map<string, string>();
  for (const plan of actionPlanSeeds) {
    const existing = await prisma.actionPlan.findFirst({
      where: {
        title: plan.title,
        riskId: risks.get(plan.risk)!,
      },
    });
    const created = existing
      ? existing
      : await prisma.actionPlan.create({
          data: {
            title: plan.title,
            riskId: risks.get(plan.risk)!,
          },
        });
    actionPlanMap.set(plan.title, created.id);
  }

  const actionTaskSeeds = [
    {
      title: 'Revisar exaustão local e sinalizar área',
      plan: 'Plano de ação - Vazamento de Gases',
      status: TaskStatus.IN_PROGRESS,
      dueDate: '2026-02-18',
      slaDays: 7,
      recurrenceRule: 'FREQ=MONTHLY',
      evidenceRequired: true,
    },
    {
      title: 'Atualizar checklist de ruído',
      plan: 'Plano de ação - Ruidos',
      status: TaskStatus.OPEN,
      dueDate: '2026-02-12',
      slaDays: 5,
      recurrenceRule: 'FREQ=QUARTERLY',
      evidenceRequired: true,
    },
    {
      title: 'Inspeção ergonômica no financeiro',
      plan: 'Plano de ação - Postura inadequada',
      status: TaskStatus.IN_PROGRESS,
      dueDate: '2026-02-20',
      slaDays: 10,
      recurrenceRule: 'FREQ=SEMIANNUAL',
      evidenceRequired: true,
    },
    {
      title: 'Treinamento de incêndio e evacuação',
      plan: 'Plano de ação - Risco de Incendio',
      status: TaskStatus.OPEN,
      dueDate: '2026-02-28',
      slaDays: 15,
      recurrenceRule: 'FREQ=YEARLY',
      evidenceRequired: true,
    },
    {
      title: 'Atualizar plano de EPI por área',
      plan: 'Plano de ação - Risco de Incendio',
      status: TaskStatus.IN_PROGRESS,
      dueDate: '2026-02-25',
      slaDays: 12,
      recurrenceRule: 'FREQ=QUARTERLY',
      evidenceRequired: false,
    },
    {
      title: 'Inspeção de escorregamentos e piso',
      plan: 'Plano de ação - Ruidos',
      status: TaskStatus.OPEN,
      dueDate: '2026-02-10',
      slaDays: 3,
      recurrenceRule: 'FREQ=MONTHLY',
      evidenceRequired: true,
    },
  ];

  for (const task of actionTaskSeeds) {
    const actionPlanId = actionPlanMap.get(task.plan)!;
    const existing = await prisma.actionTask.findFirst({
      where: {
        title: task.title,
        actionPlanId,
      },
    });
    if (existing) {
      continue;
    }
    await prisma.actionTask.create({
      data: {
        title: task.title,
        actionPlanId,
        assigneeUserId: adminUser.id,
        status: task.status,
        dueDate: new Date(task.dueDate),
        slaDays: task.slaDays,
        recurrenceRule: task.recurrenceRule,
        evidenceRequired: task.evidenceRequired,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

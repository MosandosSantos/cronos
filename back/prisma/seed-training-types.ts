import { PrismaClient, TrainingModality } from '@prisma/client';

const prisma = new PrismaClient();

const trainingTypeSeeds: Array<{
  name: string;
  legacyNames?: string[];
  description: string;
  targetAudience: string;
  durationHours: number;
  isMandatory: boolean;
  price: number;
  didacticMaterial: string;
  modality: TrainingModality;
  validityDays: number;
}> = [
  {
    name: 'Integração de segurança',
    legacyNames: ['Integracao de seguranca'],
    description: 'Treinamento inicial de segurança, conduta e regras internas de SST.',
    targetAudience: 'Todos os novos colaboradores',
    durationHours: 4,
    isMandatory: true,
    price: 0,
    didacticMaterial: 'Apostila interna e checklist de integração',
    modality: TrainingModality.PRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-01 - GRO e PGR',
    description: 'Fundamentos de gerenciamento de riscos ocupacionais e programa de gerenciamento de riscos.',
    targetAudience: 'Lideranças, SESMT e CIPA',
    durationHours: 4,
    isMandatory: true,
    price: 180,
    didacticMaterial: 'Apostila digital e estudo de caso',
    modality: TrainingModality.EAD,
    validityDays: 365,
  },
  {
    name: 'NR-05 - CIPA',
    description: 'Capacitação de membros da CIPA para atuação preventiva em SST.',
    targetAudience: 'Membros eleitos e designados da CIPA',
    durationHours: 20,
    isMandatory: true,
    price: 450,
    didacticMaterial: 'Apostila, slides e exercícios práticos',
    modality: TrainingModality.SEMIPRESENCIAL,
    validityDays: 730,
  },
  {
    name: 'NR-06 - Uso de EPI',
    description: 'Seleção, uso correto, guarda e conservação de equipamentos de proteção individual.',
    targetAudience: 'Todos os colaboradores expostos a risco',
    durationHours: 4,
    isMandatory: true,
    price: 120,
    didacticMaterial: 'Manual de EPI e demonstração prática',
    modality: TrainingModality.PRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-10 - Segurança em eletricidade',
    legacyNames: ['NR-10 - Seguranca em eletricidade'],
    description: 'Capacitação básica de segurança para trabalhos com instalações e serviços em eletricidade.',
    targetAudience: 'Eletricistas e manutenção elétrica',
    durationHours: 40,
    isMandatory: true,
    price: 850,
    didacticMaterial: 'Apostila oficial e avaliação teórico-prática',
    modality: TrainingModality.SEMIPRESENCIAL,
    validityDays: 730,
  },
  {
    name: 'NR-11 - Operação de empilhadeira',
    legacyNames: ['NR-11 - Operacao de empilhadeira'],
    description: 'Direção segura, checklist operacional e prevenção de acidentes na movimentação de cargas.',
    targetAudience: 'Operadores de empilhadeira e logística',
    durationHours: 16,
    isMandatory: true,
    price: 690,
    didacticMaterial: 'Cartilha técnica e prática supervisionada',
    modality: TrainingModality.PRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-12 - Segurança em máquinas e equipamentos',
    legacyNames: ['NR-12 - Seguranca em maquinas e equipamentos'],
    description: 'Requisitos de segurança para operação e manutenção de máquinas e equipamentos.',
    targetAudience: 'Operadores e manutenção industrial',
    durationHours: 8,
    isMandatory: true,
    price: 320,
    didacticMaterial: 'Apostila NR-12 e checklists de bloqueio',
    modality: TrainingModality.PRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-23 - Prevenção e combate a incêndio',
    legacyNames: ['NR-23 - Prevencao e combate a incendio'],
    description: 'Noções de prevenção, abandono de área e resposta inicial a princípios de incêndio.',
    targetAudience: 'Brigadistas e público geral da empresa',
    durationHours: 8,
    isMandatory: true,
    price: 280,
    didacticMaterial: 'Cartilha de brigada e simulação prática',
    modality: TrainingModality.PRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-33 - Espaços confinados',
    legacyNames: ['NR-33 - Espacos confinados'],
    description: 'Capacitação para trabalhador autorizado e vigia em atividades com espaço confinado.',
    targetAudience: 'Operações, manutenção e segurança',
    durationHours: 16,
    isMandatory: true,
    price: 790,
    didacticMaterial: 'Manual NR-33 e simulação de entrada segura',
    modality: TrainingModality.SEMIPRESENCIAL,
    validityDays: 365,
  },
  {
    name: 'NR-35 - Trabalho em altura',
    description: 'Requisitos mínimos e medidas de proteção para atividades executadas acima de 2 metros.',
    targetAudience: 'Equipes operacionais e manutenção',
    durationHours: 8,
    isMandatory: true,
    price: 380,
    didacticMaterial: 'Apostila NR-35 e prática com linha de vida',
    modality: TrainingModality.SEMIPRESENCIAL,
    validityDays: 365,
  },
];

async function main() {
  for (const type of trainingTypeSeeds) {
    const namesToMatch = [type.name, ...(type.legacyNames ?? [])];

    const existing = await prisma.catalogTrainingType.findFirst({
      where: { name: { in: namesToMatch } },
      select: { id: true },
    });

    if (existing) {
      await prisma.catalogTrainingType.update({
        where: { id: existing.id },
        data: {
          name: type.name,
          description: type.description,
          targetAudience: type.targetAudience,
          durationHours: type.durationHours,
          isMandatory: type.isMandatory,
          price: type.price,
          didacticMaterial: type.didacticMaterial,
          modality: type.modality,
          validityDays: type.validityDays,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.catalogTrainingType.create({
      data: {
        name: type.name,
        description: type.description,
        targetAudience: type.targetAudience,
        durationHours: type.durationHours,
        isMandatory: type.isMandatory,
        price: type.price,
        didacticMaterial: type.didacticMaterial,
        modality: type.modality,
        validityDays: type.validityDays,
        isActive: true,
      },
    });
  }

  console.log(`Seed de treinamentos concluído com ${trainingTypeSeeds.length} tipos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

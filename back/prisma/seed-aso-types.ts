import { AsoExamKind, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const asoTypeSeeds: Array<{
  kind: AsoExamKind;
  name: string;
  description: string;
  legalBasis: string;
  triggerCondition: string;
  validityDays: number;
  isEsocialOnly?: boolean;
}> = [
  {
    kind: AsoExamKind.ADMISSIONAL,
    name: 'Admissional',
    description:
      'Exame ocupacional realizado antes de o trabalhador assumir suas atividades.',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition:
      'Obrigatório antes do início das atividades laborais.',
    validityDays: 365,
  },
  {
    kind: AsoExamKind.PERIODICO,
    name: 'Periódico',
    description:
      'Exame ocupacional periódico com intervalo definido pela NR-7/PCMSO, conforme riscos e critério médico.',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition:
      'Realizado em intervalos definidos pelo médico responsável do PCMSO.',
    validityDays: 365,
  },
  {
    kind: AsoExamKind.RETORNO_TRABALHO,
    name: 'Retorno ao trabalho',
    description:
      'Exame ocupacional antes do retorno do empregado afastado por 30 dias ou mais, por doença ou acidente.',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition:
      'Obrigatório quando houver afastamento >= 30 dias (ocupacional ou não).',
    validityDays: 30,
  },
  {
    kind: AsoExamKind.MUDANCA_FUNCAO,
    name: 'Mudança de função / riscos',
    description:
      'Exame ocupacional para mudança de função ou alteração de riscos ocupacionais.',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition:
      'Obrigatório antes da mudança de função e da exposição a novos riscos.',
    validityDays: 365,
  },
  {
    kind: AsoExamKind.DEMISSIONAL,
    name: 'Demissional',
    description:
      'Exame ocupacional de desligamento, realizado até 10 dias após o término do contrato, com possibilidade de dispensa conforme exame recente.',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition:
      'Realizado no desligamento contratual, observadas regras de dispensa.',
    validityDays: 10,
  },
  {
    kind: AsoExamKind.MONITORACAO_PONTUAL,
    name: 'Monitoração pontual (eSocial S-2220)',
    description:
      'Avaliação clínica específica que não se enquadra nos demais tipos ocupacionais.',
    legalBasis: 'eSocial S-2220',
    triggerCondition:
      'Utilizado quando houver necessidade de monitoração pontual.',
    validityDays: 30,
    isEsocialOnly: true,
  },
];

async function main() {
  for (const type of asoTypeSeeds) {
    await prisma.catalogAsoType.upsert({
      where: { kind: type.kind },
      update: {
        name: type.name,
        description: type.description,
        legalBasis: type.legalBasis,
        triggerCondition: type.triggerCondition,
        validityDays: type.validityDays,
        isEsocialOnly: type.isEsocialOnly ?? false,
        isActive: true,
      },
      create: {
        kind: type.kind,
        name: type.name,
        description: type.description,
        legalBasis: type.legalBasis,
        triggerCondition: type.triggerCondition,
        validityDays: type.validityDays,
        isEsocialOnly: type.isEsocialOnly ?? false,
        isActive: true,
      },
    });
  }

  console.log(`ASO seed concluído com ${asoTypeSeeds.length} tipos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


INSERT INTO "CatalogAsoType" (
  "id",
  "kind",
  "name",
  "description",
  "legal_basis",
  "trigger_condition",
  "validity_days",
  "is_esocial_only",
  "is_active",
  "created_at",
  "updated_at"
)
VALUES
  (
    gen_random_uuid(),
    'ADMISSIONAL',
    'Admissional',
    'Exame ocupacional realizado antes de o trabalhador assumir suas atividades.',
    'NR-7 / PCMSO',
    'Obrigatório antes do início das atividades laborais.',
    365,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'PERIODICO',
    'Periódico',
    'Exame ocupacional periódico com intervalo definido pela NR-7/PCMSO, conforme riscos e critério médico.',
    'NR-7 / PCMSO',
    'Realizado em intervalos definidos pelo médico responsável do PCMSO.',
    365,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'RETORNO_TRABALHO',
    'Retorno ao trabalho',
    'Exame ocupacional antes do retorno do empregado afastado por 30 dias ou mais, por doença ou acidente.',
    'NR-7 / PCMSO',
    'Obrigatório quando houver afastamento >= 30 dias (ocupacional ou não).',
    30,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'MUDANCA_FUNCAO',
    'Mudança de função / riscos',
    'Exame ocupacional para mudança de função ou alteração de riscos ocupacionais.',
    'NR-7 / PCMSO',
    'Obrigatório antes da mudança de função e da exposição a novos riscos.',
    365,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'DEMISSIONAL',
    'Demissional',
    'Exame ocupacional de desligamento, realizado até 10 dias após o término do contrato, com possibilidade de dispensa conforme exame recente.',
    'NR-7 / PCMSO',
    'Realizado no desligamento contratual, observadas regras de dispensa.',
    10,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'MONITORACAO_PONTUAL',
    'Monitoração pontual (eSocial S-2220)',
    'Avaliação clínica específica que não se enquadra nos demais tipos ocupacionais.',
    'eSocial S-2220',
    'Utilizado quando houver necessidade de monitoração pontual.',
    30,
    true,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT ("kind") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "legal_basis" = EXCLUDED."legal_basis",
  "trigger_condition" = EXCLUDED."trigger_condition",
  "validity_days" = EXCLUDED."validity_days",
  "is_esocial_only" = EXCLUDED."is_esocial_only",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = NOW();

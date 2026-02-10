WITH training_data AS (
  SELECT * FROM (
    VALUES
      ('Integração de segurança', 'Integracao de seguranca', 'Treinamento inicial de segurança, conduta e regras internas de SST.', 'Todos os novos colaboradores', 4, true, 0.00, 'Apostila interna e checklist de integração', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-01 - GRO e PGR', NULL, 'Fundamentos de gerenciamento de riscos ocupacionais e programa de gerenciamento de riscos.', 'Lideranças, SESMT e CIPA', 4, true, 180.00, 'Apostila digital e estudo de caso', 'EAD'::"TrainingModality", 365),
      ('NR-05 - CIPA', NULL, 'Capacitação de membros da CIPA para atuação preventiva em SST.', 'Membros eleitos e designados da CIPA', 20, true, 450.00, 'Apostila, slides e exercícios práticos', 'SEMIPRESENCIAL'::"TrainingModality", 730),
      ('NR-06 - Uso de EPI', NULL, 'Seleção, uso correto, guarda e conservação de equipamentos de proteção individual.', 'Todos os colaboradores expostos a risco', 4, true, 120.00, 'Manual de EPI e demonstração prática', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-10 - Segurança em eletricidade', 'NR-10 - Seguranca em eletricidade', 'Capacitação básica de segurança para trabalhos com instalações e serviços em eletricidade.', 'Eletricistas e manutenção elétrica', 40, true, 850.00, 'Apostila oficial e avaliação teórico-prática', 'SEMIPRESENCIAL'::"TrainingModality", 730),
      ('NR-11 - Operação de empilhadeira', 'NR-11 - Operacao de empilhadeira', 'Direção segura, checklist operacional e prevenção de acidentes na movimentação de cargas.', 'Operadores de empilhadeira e logística', 16, true, 690.00, 'Cartilha técnica e prática supervisionada', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-12 - Segurança em máquinas e equipamentos', 'NR-12 - Seguranca em maquinas e equipamentos', 'Requisitos de segurança para operação e manutenção de máquinas e equipamentos.', 'Operadores e manutenção industrial', 8, true, 320.00, 'Apostila NR-12 e checklists de bloqueio', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-23 - Prevenção e combate a incêndio', 'NR-23 - Prevencao e combate a incendio', 'Noções de prevenção, abandono de área e resposta inicial a princípios de incêndio.', 'Brigadistas e público geral da empresa', 8, true, 280.00, 'Cartilha de brigada e simulação prática', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-33 - Espaços confinados', 'NR-33 - Espacos confinados', 'Capacitação para trabalhador autorizado e vigia em atividades com espaço confinado.', 'Operações, manutenção e segurança', 16, true, 790.00, 'Manual NR-33 e simulação de entrada segura', 'SEMIPRESENCIAL'::"TrainingModality", 365),
      ('NR-35 - Trabalho em altura', NULL, 'Requisitos mínimos e medidas de proteção para atividades executadas acima de 2 metros.', 'Equipes operacionais e manutenção', 8, true, 380.00, 'Apostila NR-35 e prática com linha de vida', 'SEMIPRESENCIAL'::"TrainingModality", 365)
  ) AS t(
    name,
    legacy_name,
    description,
    target_audience,
    duration_hours,
    is_mandatory,
    price,
    didactic_material,
    modality,
    validity_days
  )
)
UPDATE "CatalogTrainingType" ctt
SET
  "name" = td.name,
  "description" = td.description,
  "target_audience" = td.target_audience,
  "duration_hours" = td.duration_hours,
  "is_mandatory" = td.is_mandatory,
  "price" = td.price::numeric(12,2),
  "didactic_material" = td.didactic_material,
  "modality" = td.modality,
  "validity_days" = td.validity_days,
  "is_active" = true,
  "updated_at" = NOW()
FROM training_data td
WHERE ctt."name" = td.name OR ctt."name" = td.legacy_name;

WITH training_data AS (
  SELECT * FROM (
    VALUES
      ('Integração de segurança', 'Integracao de seguranca', 'Treinamento inicial de segurança, conduta e regras internas de SST.', 'Todos os novos colaboradores', 4, true, 0.00, 'Apostila interna e checklist de integração', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-01 - GRO e PGR', NULL, 'Fundamentos de gerenciamento de riscos ocupacionais e programa de gerenciamento de riscos.', 'Lideranças, SESMT e CIPA', 4, true, 180.00, 'Apostila digital e estudo de caso', 'EAD'::"TrainingModality", 365),
      ('NR-05 - CIPA', NULL, 'Capacitação de membros da CIPA para atuação preventiva em SST.', 'Membros eleitos e designados da CIPA', 20, true, 450.00, 'Apostila, slides e exercícios práticos', 'SEMIPRESENCIAL'::"TrainingModality", 730),
      ('NR-06 - Uso de EPI', NULL, 'Seleção, uso correto, guarda e conservação de equipamentos de proteção individual.', 'Todos os colaboradores expostos a risco', 4, true, 120.00, 'Manual de EPI e demonstração prática', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-10 - Segurança em eletricidade', 'NR-10 - Seguranca em eletricidade', 'Capacitação básica de segurança para trabalhos com instalações e serviços em eletricidade.', 'Eletricistas e manutenção elétrica', 40, true, 850.00, 'Apostila oficial e avaliação teórico-prática', 'SEMIPRESENCIAL'::"TrainingModality", 730),
      ('NR-11 - Operação de empilhadeira', 'NR-11 - Operacao de empilhadeira', 'Direção segura, checklist operacional e prevenção de acidentes na movimentação de cargas.', 'Operadores de empilhadeira e logística', 16, true, 690.00, 'Cartilha técnica e prática supervisionada', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-12 - Segurança em máquinas e equipamentos', 'NR-12 - Seguranca em maquinas e equipamentos', 'Requisitos de segurança para operação e manutenção de máquinas e equipamentos.', 'Operadores e manutenção industrial', 8, true, 320.00, 'Apostila NR-12 e checklists de bloqueio', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-23 - Prevenção e combate a incêndio', 'NR-23 - Prevencao e combate a incendio', 'Noções de prevenção, abandono de área e resposta inicial a princípios de incêndio.', 'Brigadistas e público geral da empresa', 8, true, 280.00, 'Cartilha de brigada e simulação prática', 'PRESENCIAL'::"TrainingModality", 365),
      ('NR-33 - Espaços confinados', 'NR-33 - Espacos confinados', 'Capacitação para trabalhador autorizado e vigia em atividades com espaço confinado.', 'Operações, manutenção e segurança', 16, true, 790.00, 'Manual NR-33 e simulação de entrada segura', 'SEMIPRESENCIAL'::"TrainingModality", 365),
      ('NR-35 - Trabalho em altura', NULL, 'Requisitos mínimos e medidas de proteção para atividades executadas acima de 2 metros.', 'Equipes operacionais e manutenção', 8, true, 380.00, 'Apostila NR-35 e prática com linha de vida', 'SEMIPRESENCIAL'::"TrainingModality", 365)
  ) AS t(
    name,
    legacy_name,
    description,
    target_audience,
    duration_hours,
    is_mandatory,
    price,
    didactic_material,
    modality,
    validity_days
  )
)
INSERT INTO "CatalogTrainingType" (
  "id",
  "name",
  "description",
  "target_audience",
  "duration_hours",
  "is_mandatory",
  "price",
  "didactic_material",
  "modality",
  "validity_days",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  td.name,
  td.description,
  td.target_audience,
  td.duration_hours,
  td.is_mandatory,
  td.price::numeric(12,2),
  td.didactic_material,
  td.modality,
  td.validity_days,
  true,
  NOW(),
  NOW()
FROM training_data td
WHERE NOT EXISTS (
  SELECT 1
  FROM "CatalogTrainingType" ctt
  WHERE ctt."name" = td.name OR ctt."name" = td.legacy_name
);

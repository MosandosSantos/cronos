# Deploy Treinamentos - Catalogo de Tipos

Este guia aplica a carga inicial de tipos de treinamento no catalogo global.

## Opcao 1 - Aplicar via script TypeScript (ambiente da aplicacao)

1. Entre na pasta do backend:

```bash
cd back
```

2. Rode a carga:

```bash
npm run seed:training:types
```

## Opcao 2 - Aplicar diretamente no Postgres (producao)

1. Entre na pasta do backend:

```bash
cd back
```

2. Execute o SQL idempotente:

```bash
psql "$DATABASE_URL" -f prisma/sql/seed_training_types.sql
```

## Arquivos envolvidos

- `prisma/seed-training-types.ts` (carga via Prisma)
- `prisma/sql/seed_training_types.sql` (carga direta para producao)

# Deploy ASO - Tipos Ocupacionais (NR-7 / PCMSO)

## 1) Aplicar mudanças de schema

```bash
npx prisma migrate deploy
```

Se você usa `db push` no ambiente:

```bash
npx prisma db push
```

## 2) Cadastrar/atualizar os tipos padrão de ASO

Opção recomendada (idempotente):

```bash
npm run seed:aso:types
```

Opção SQL direta:

```bash
psql "$DATABASE_URL" -f prisma/sql/seed_aso_types.sql
```

## Tipos incluídos

- Admissional
- Periódico
- Retorno ao trabalho
- Mudança de função / riscos ocupacionais
- Demissional
- Monitoração pontual (eSocial S-2220)


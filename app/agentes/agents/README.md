# Agents - Esfera NR1

Indice dos agentes de IA para producao de codigo no projeto. Cada agente e especialista na stack e no dominio do projeto.

## Regras de ferramentas
- Agentes de implementacao tecnica devem usar o MCP server context7 para consultar a documentacao oficial da stack antes de escrever codigo.
- O agente de QA/Testes deve usar o MCP server playwright para acessar o sistema e validar fluxos e layout.

## Como usar
- Escolha o agente pela responsabilidade principal.
- Se o assunto cruzar areas, use primeiro o agente mais tecnico do fluxo.

## Agentes

### Backend Fastify
- APIs REST, auth JWT, multi-tenant, regras de negocio.
- Use para criar endpoints, validacoes, uploads e jobs.

### Frontend Next.js
- UI em PT-BR, Tailwind, componentes e paginas.
- Use para telas do dashboard, layout base e integracao com APIs.

### PWA Offline / Campo
- Offline-first, IndexedDB, sync e checklists no mobile.
- Use para funcionalidades de campo, QR e sincronizacao confiavel.

### Banco de Dados PostgreSQL
- Modelagem, migrations, indices e performance.
- Use ao criar entidades, ajustar schema ou otimizar consultas.

### QA / Testes
- Planos de teste, regressao e criterios de aceite.
- Use antes de releases e ao validar sprints.

### Revisao PT-BR (Gramatica e UX)
- Gramatica, ortografia e microcopy em portugues do Brasil.
- Use para revisar paginas com interacao do usuario.

### Estatistica e BI / Dashboards
- KPIs, agregacoes e visualizacoes para dashboards.
- Use para definir indicadores e relatorios.

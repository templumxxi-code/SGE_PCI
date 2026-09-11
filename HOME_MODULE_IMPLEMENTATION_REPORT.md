# Implementação da aba Início

## Evolução institucional

A aba foi ampliada de uma lista de atalhos para uma página institucional de apresentação do módulo Gestão de Processos, mantendo o padrão visual claro do dashboard.

- Banner inicial com descrição institucional e ação para iniciar processo.
- Seção “O que você pode fazer neste módulo” com cinco cards explicativos.
- Fluxo visual em cinco etapas: criar, definir responsáveis, executar, monitorar e melhorar.
- Indicadores reais preservados, sem valores fictícios.
- Seção “Sobre a Gestão de Processos” com os benefícios institucionais.

## Arquivos alterados

- `public/index.html`: banner, cards institucionais, fluxo, resumo e seção de benefícios.
- `public/js/home.js`: navegação dos cards e carregamento dos indicadores (mantido).
- `public/css/home.css`: layout responsivo e visual institucional da página.
- `public/js/app.js`: aba inicial padrão, navegação e carregamento do resumo.
- `public/js/access-control.js`: inclusão de Início para os perfis existentes.
- `src/routes/dashboard.js`: proteção dos endpoints de dashboard pelo módulo Gestão de Processos.

## API utilizada

A página reutiliza `GET /api/dashboard/summary` para processos e atividades e `GET /api/notifications/unread-count` para alertas. Não foi criada migration, tabela ou dado fictício.

## Componentes

Foram criados seis cards de navegação, a trilha “Como começar?” e quatro indicadores reais: Processos Ativos, Processos Concluídos, Atividades Pendentes e Alertas.

## Segurança e impacto

A aba respeita as abas já liberadas pelo RBAC. Os endpoints do dashboard agora também exigem `PROCESS_MANAGEMENT`; as demais abas e funcionalidades permanecem inalteradas.

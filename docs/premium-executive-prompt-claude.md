# Prompt sênior para Claude — Evolução da Premium Executive ponta a ponta

Use o texto abaixo como instrução de execução. Disponibilize junto o arquivo `premium-executive-demanda-evolucao.md` no repositório correto da Premium Executive.

---

Você é responsável técnico sênior pela evolução da Premium Executive. Conduza diagnóstico, planejamento, implementação incremental, testes, revisão e documentação até concluir os itens aplicáveis da demanda anexa. Entregue alterações reais e verificáveis; não pare apenas em um plano.

## Contexto obrigatório

A demanda foi elaborada em 14/10/2026, no fuso America/Sao_Paulo. A análise inicial não teve acesso ao repositório da Premium Executive: o workspace disponível era o site Pedro Henrique. As oito frentes são hipóteses priorizadas, não um diagnóstico comprovado.

Primeiro confirme que você está no repositório correto da Premium Executive, usando README, configuração, módulos e instruções locais. Não implemente esta demanda no Pedro Henrique. Se não tiver acesso ao projeto correto, informe a evidência da divergência e solicite o caminho. Não invente o código ou uma plataforma substituta.

Leia integralmente `premium-executive-demanda-evolucao.md`, além das instruções aplicáveis do repositório. Preserve alterações de outras pessoas. Não reverta, descarte ou sobrescreva trabalho existente.

## Resultado esperado

Melhorar a fluidez, confiabilidade, clareza e produtividade da plataforma preservando suas regras de negócio, permissões e identidade. Implemente backend, frontend, persistência e testes quando necessários para cada comportamento; não entregue controles visuais sem funcionamento real.

## Etapa 1 — Investigar e estabelecer evidências

1. Inspecione estado do Git, branch, estrutura, dependências, scripts, instruções e documentação.
2. Examine commits e mudanças locais de 14/10/2026 considerando o fuso indicado. Inclua mudanças ainda não commitadas. Se essa data não tiver alterações, declare isso e use o histórico relevante sem chamá-lo de mudanças de hoje.
3. Mapeie perfis, jornadas, permissões, entidades, integrações, padrões de UI, estados e armazenamento.
4. Execute as verificações existentes adequadas ao projeto e diferencie falhas prévias das introduzidas pelo seu trabalho.
5. Inspecione a aplicação em execução quando o ambiente permitir. Não trate leitura de código como validação visual.
6. Identifique problemas concretos e itens já atendidos. Cite caminhos de arquivos e comportamentos observados.
7. Se as instruções locais pedirem agentes especializados, delegue planejamento, revisão e outras frentes pertinentes, com responsabilidades claras e sem edições conflitantes.

Registre uma matriz de rastreabilidade com as colunas:

`ID | prioridade | evidência | comportamento atual | comportamento esperado | arquivos/camadas | dependências | aceite | teste | situação`

Use IDs estáveis para conectar requisitos, implementação e verificação. Coloque o registro na estrutura de documentação existente; evite arquivos duplicados.

## Etapa 2 — Planejar a execução

Ordene o trabalho por benefício, risco e dependências:

1. P0: simplificação de até três jornadas principais e prevenção de perda de trabalho.
2. P1: início por perfil, busca/navegação, experiência móvel e desempenho.
3. P2: status/notificações e indicadores com detalhamento.
4. P3: preferências e automações com necessidade comprovada.

Para cada conjunto, descreva a menor mudança completa, seus critérios de aceite e como reverter quando necessário. Reaproveite o que já existe. Marque itens atendidos ou não aplicáveis com justificativa verificável.

Resolva escolhas técnicas reversíveis com base no código e nas convenções. Pergunte apenas por informações indispensáveis que não possam ser inferidas com segurança, como uma regra de negócio ausente. Continue tarefas independentes enquanto houver bloqueios parciais. Não peça confirmação a cada fase.

## Etapa 3 — Implementar em incrementos completos

Para cada incremento:

1. Escreva testes que expressem o comportamento necessário e confirme a falha inicial para regras novas ou corrigidas.
2. Implemente a solução mínima em todas as camadas necessárias.
3. Cubra estados de carregamento, vazio, sucesso, erro e acesso negado relevantes.
4. Verifique permissões e isolamento no servidor; ocultar um botão não substitui autorização.
5. Preserve trabalho do usuário, contexto de navegação e recuperação de falhas conforme os critérios da demanda.
6. Trate repetição de submissões, concorrência e respostas fora de ordem quando aplicáveis.
7. Refatore sem ampliar o escopo e execute as verificações adequadas ao incremento.
8. Revise o diff, corrija problemas críticos ou de alta gravidade e atualize a matriz com evidências.

Mantenha componentes focados, nomes claros, validação nas fronteiras e alterações de estado compatíveis com as convenções de imutabilidade do projeto. Evite dependências novas quando os recursos existentes forem suficientes.

## Critérios técnicos obrigatórios

- **Formulários:** erros próximos aos campos, valores preservados e feedback verdadeiro de persistência.
- **Rascunhos:** definir armazenamento, expiração, descarte, isolamento e tratamento de logout antes de implementar. Não guardar dados sensíveis no navegador por padrão.
- **Listagens:** filtros combináveis, paginação coerente, retorno ao contexto anterior e tratamento de respostas antigas.
- **Início por perfil:** informações reais e autorização consistente com o backend.
- **Celular:** executar jornadas nas larguras suportadas, incluindo 360 px se aplicável; corrigir ações ocultas, sobreposições e rolagem horizontal indevida.
- **Acessibilidade:** teclado, foco visível, rótulos, mensagens acessíveis e ausência de dependência exclusiva de cor.
- **Desempenho:** medir antes/depois em condições documentadas e otimizar gargalos observados. Não inventar ganhos.
- **Notificações:** mensagens acionáveis, destino correto, permissões e controle de duplicação; usar canais existentes.
- **Indicadores:** cálculo, fonte, período e atualização explícitos; totais conciliados e acesso aos registros de origem.
- **Automações:** gatilhos claros, autorização, prevenção de duplicidade, rastreabilidade e recuperação de falhas.
- **Segurança:** nenhum segredo no código; entradas validadas; logs sem conteúdo sensível; isolamento entre usuários e organizações; migrações compatíveis e reversíveis quando possível.

Não crie APIs fictícias, métricas simuladas em produção, botões sem ação, permissões apenas no frontend ou mensagens que afirmem sucesso sem confirmação. Não inclua IA, serviços pagos ou canais externos sem escopo explícito.

## Etapa 4 — Verificar a entrega completa

Execute os comandos reais disponíveis de build, lint, análise de tipos e testes. Cubra:

- Regras e cálculos com testes unitários.
- Persistência, contratos, autorização e isolamento com integração.
- Jornadas prioritárias com E2E, incluindo recuperação de falhas e uso móvel.
- Navegação lista/detalhe com preservação de contexto.
- Rascunhos, falhas de rede e prevenção de duplicidade quando implementados.
- Estados visuais e uso por teclado com revisão manual.

Siga as metas de cobertura do repositório, incluindo mínimo de 80% se exigido. Não manipule exclusões para atingir a meta. Diferencie cobertura do código alterado de cobertura global e registre limitações anteriores.

Se faltar infraestrutura, credencial ou serviço, informe exatamente quais testes ficaram bloqueados e por quê. Execute as demais verificações possíveis. Não substitua testes de integração por mocks e declare validação ponta a ponta.

Revise o diff final quanto a regressões, segurança, mudanças acidentais e inconsistências. Não faça push, deploy, migração destrutiva ou envio de mensagens externas sem autorização correspondente. Prepare uma entrega local revisável.

## Etapa 5 — Documentar e apresentar o resultado

Atualize a documentação existente apenas onde necessário. Entregue:

1. Resumo das melhorias e dos fluxos beneficiados.
2. Matriz de requisitos com situação: implementado, já atendido, não aplicável ou bloqueado.
3. Arquivos relevantes e decisões técnicas que afetam manutenção ou comportamento.
4. Comandos executados e resultados reais, incluindo falhas prévias.
5. Evidências das jornadas, responsividade e medições antes/depois quando disponíveis.
6. Migrações, configuração, verificação manual e reversão quando necessárias.
7. Pendências reais, com causa e ação necessária para resolver.

Continue até concluir o escopo aplicável. Se um bloqueio externo impedir parte da entrega, não declare a demanda inteira concluída. Diferencie claramente implementação, verificação e publicação.

Comece agora validando o repositório e produzindo o diagnóstico baseado em evidências.

# Premium Executive — Demanda de evolução de usabilidade e produto

Data: 14/10/2026  
Status: proposta para diagnóstico e implementação incremental  
Documento de execução: `premium-executive-prompt-claude.md`

## 1. Contexto e limite da análise

Esta demanda consolida oito frentes de melhoria para a Premium Executive, ordenadas pelo benefício esperado para a experiência de uso.

A priorização é preliminar. O workspace disponível na elaboração era o projeto Pedro Henrique, cujo commit de 14/10/2026 trata do jogo Pedro Flash. Não foi possível verificar o código, as funcionalidades nem as alterações de hoje da Premium Executive. Portanto, os itens abaixo são propostas a validar, não defeitos comprovados nem funcionalidades reconhecidamente ausentes.

Estes arquivos foram salvos no workspace atual por solicitação do usuário. Isso não autoriza implementar as mudanças da Premium Executive no projeto Pedro Henrique.

Antes da implementação, localizar o repositório correto, ler suas instruções e confrontar esta demanda com os fluxos existentes e com os diffs de 14/10/2026 no fuso America/Sao_Paulo. Se o repositório não estiver disponível, solicitar seu caminho e interromper somente o trabalho dependente desse acesso. Não inventar um produto substituto.

## 2. Objetivo

Elevar a qualidade percebida e a produtividade da plataforma por meio de tarefas mais simples, proteção do trabalho do usuário, navegação previsível e informações que orientem ações.

O resultado deve preservar regras de negócio, permissões, identidade visual e funcionalidades existentes. Não inclui uma reformulação visual integral por padrão.

## 3. Diagnóstico obrigatório

Antes de editar código:

1. Confirmar repositório, branch, instruções locais e estado do Git, preservando alterações existentes.
2. Mapear perfis de usuário, jornadas principais, módulos, integrações e regras de autorização.
3. Revisar commits e alterações locais de 14/10/2026; distinguir mudanças verificadas de hipóteses.
4. Executar as verificações existentes e registrar problemas anteriores à implementação.
5. Percorrer os fluxos prioritários em desktop e celular, incluindo carregamento, vazio, erro, acesso negado e sucesso.
6. Identificar os componentes e serviços reutilizáveis, o sistema visual e a estratégia de persistência.
7. Produzir uma matriz com: problema, evidência, frequência, impacto, solução proposta, esforço, dependências e critério de aceite.

Usar evidências do código, testes, execução e métricas disponíveis. Não atribuir comportamento a usuários sem dados. Ausência de métricas deve ser registrada como limitação.

## 4. Backlog por prioridade

### P0.1 — Simplificar os fluxos mais utilizados

**Problema a investigar:** etapas desnecessárias, campos repetidos, ações pouco claras e excesso de esforço para concluir tarefas recorrentes.

**Entregas:**

- Selecionar até três jornadas principais com base em evidências disponíveis.
- Mapear passos e campos atuais; eliminar redundâncias sem remover validações necessárias.
- Definir uma ação principal clara por etapa, com rótulos específicos.
- Aplicar preenchimento prévio somente quando a origem e a validade dos dados forem confiáveis.
- Exibir validações próximas ao campo, mantendo os valores já preenchidos.
- Tornar o resultado de cada ação perceptível e indicar o próximo passo quando houver.

**Aceite:** jornadas selecionadas são concluídas com sucesso nos perfis autorizados; os passos removidos são documentados; erros não apagam dados; submissões repetidas não criam registros duplicados; navegação por teclado funciona.

**Medição:** quantidade de passos, tempo de conclusão e taxa de conclusão, comparando a mesma jornada antes e depois. Se não houver dados reais, registrar apenas medições de teste como tal.

### P0.2 — Prevenir perda de trabalho e facilitar recuperação

**Problema a investigar:** perda de formulários, filtros ou contexto após navegação, falha de rede e atualização de página.

**Entregas:**

- Identificar formulários longos ou de maior custo de preenchimento.
- Implementar rascunhos onde houver benefício comprovado, respeitando a estratégia de armazenamento e a sensibilidade dos dados.
- Mostrar estados de salvamento quando existir salvamento automático.
- Preservar filtros e contexto de listagens conforme a navegação esperada.
- Oferecer nova tentativa segura após falhas recuperáveis.
- Tratar mudanças concorrentes se o fluxo permitir edição por várias pessoas.

**Aceite:** cenários de falha de rede e retorno à tela preservam o trabalho conforme a política definida; o sistema nunca informa que salvou antes da confirmação; rascunhos não vazam entre usuários ou organizações; logout, expiração e descarte têm comportamento definido; conflitos não sobrescrevem alterações silenciosamente.

**Dependência:** definir persistência, expiração, descarte e sincronização antes de implementar. Não armazenar dados sensíveis no navegador por conveniência.

### P1.1 — Organizar a tela inicial por perfil

**Problema a investigar:** início genérico que exige navegação extensa para encontrar tarefas relevantes.

**Entregas:** pendências, próximos compromissos quando aplicáveis, atalhos frequentes e continuidade de tarefas, organizados pelos perfis já existentes.

**Aceite:** cada perfil vê somente dados autorizados; indicadores usam fontes reais; pendências abrem o contexto correto; estados vazios orientam a primeira ação; os conteúdos prioritários permanecem acessíveis em telas pequenas.

**Limite:** não criar novos perfis, compromissos ou conceitos de negócio sem evidência de que pertencem ao produto.

### P1.2 — Melhorar busca e navegação

**Problema a investigar:** dificuldade para localizar registros e perda de contexto ao alternar entre lista e detalhe.

**Entregas:**

- Revisar busca, filtros, ordenação e paginação nas listagens relevantes.
- Exibir filtros ativos e uma ação clara para limpá-los.
- Preservar contexto ao abrir um registro e voltar.
- Introduzir itens recentes somente quando úteis e seguros.
- Adotar URLs compartilháveis para filtros quando compatível com o produto e sem expor dados sensíveis.

**Aceite:** busca e filtros funcionam em conjunto; paginação e totais são coerentes; respostas antigas não substituem consultas novas; voltar preserva o contexto definido; resultados vazios permitem recuperação; registros sem permissão não aparecem.

### P1.3 — Melhorar experiência no celular e desempenho

**Problema a investigar:** formulários desconfortáveis, ações inacessíveis, rolagem horizontal e demora nos fluxos principais.

**Entregas:** corrigir problemas responsivos verificados; adequar entradas e áreas de toque; melhorar feedback de carregamento; otimizar gargalos medidos; tratar redes lentas e falhas de carregamento.

**Aceite:** fluxos selecionados funcionam nas larguras suportadas pelo projeto, incluindo referência de 360 px se aplicável; não há sobreposição que impeça ações; foco é visível; conteúdo funcional não depende apenas de cor; carregamentos têm feedback; operações bloqueiam repetição indevida.

**Medição:** registrar ambiente, dados e valores antes/depois. Definir metas a partir da linha de base; não prometer percentuais arbitrários nem instalar bibliotecas pesadas sem necessidade.

### P2.1 — Tornar status e notificações acionáveis

**Problema a investigar:** mensagens vagas e necessidade de acompanhamento manual para entender pendências.

**Entregas:** padronizar rótulos de status; explicar o ocorrido e a próxima ação; mostrar responsável quando houver esse conceito; ligar notificações ao registro correto; controlar duplicação e excesso de alertas.

**Aceite:** transições refletem regras reais de negócio; mensagens são compreensíveis; notificações respeitam permissões; itens já resolvidos não convidam a ações inválidas; alertas não expõem conteúdo sensível em canais externos.

**Limite:** não adicionar e-mail, WhatsApp ou outro canal externo sem escopo e autorização específicos. Começar pelos canais existentes.

### P2.2 — Criar indicadores que orientem decisões

**Problema a investigar:** números sem definição clara, sem contexto ou sem acesso aos registros que os compõem.

**Entregas:** selecionar indicadores úteis para os perfis existentes; definir cálculo, fonte, período e atualização; permitir detalhamento preservando filtros; distinguir zero de indisponibilidade.

**Aceite:** totais conciliam com os registros; datas e fuso são consistentes; filtros se propagam ao detalhe; cálculos e autorização são testados; fontes indisponíveis não produzem números fictícios.

### P3 — Automatizar tarefas repetitivas e personalizar a experiência

**Problema a investigar:** repetição de configurações e ações previsíveis que continuam consumindo tempo após as melhorias anteriores.

**Entregas:** preferências úteis, atalhos e automações limitadas a casos demonstrados no diagnóstico. Definir gatilho, condições, resultado, permissões, rastreabilidade e tratamento de falha para cada automação.

**Aceite:** configurações são isoladas por usuário e organização quando aplicável; automações não executam em duplicidade; alterações relevantes são rastreáveis; ações de impacto têm proteção compatível com o fluxo; falhas ficam visíveis e permitem recuperação.

**Dependência:** concluir ou estabilizar as jornadas de base. IA não é requisito desta demanda.

## 5. Requisitos transversais

- Reutilizar arquitetura, componentes, tokens visuais e convenções existentes.
- Preservar contratos de API ou evoluí-los de forma compatível e documentada.
- Validar entradas no servidor e aplicar autorização por operação e recurso, quando houver backend.
- Evitar vazamento de dados entre contas, equipes ou organizações.
- Não incluir segredos, dados pessoais ou conteúdo de formulários em logs e telemetria.
- Considerar teclado, foco, leitores de tela, contraste e preferências de movimento nos componentes alterados.
- Padronizar estados vazio, carregando, erro, sucesso e acesso negado.
- Tratar erros com mensagens úteis para o usuário e diagnóstico técnico seguro.
- Prever migração e reversão quando o modelo persistido mudar.
- Instrumentar eventos somente com ferramentas existentes e respeitando a política de privacidade do produto.

## 6. Plano de entrega

| Fase | Escopo | Condição de saída |
| --- | --- | --- |
| 0 | Diagnóstico e linha de base | Repositório correto validado, evidências e backlog ajustado |
| 1 | P0: jornadas e proteção do trabalho | Fluxos prioritários testados, recuperação validada |
| 2 | P1: início, navegação, celular e desempenho | Fluxos consistentes entre perfis e dispositivos |
| 3 | P2: status, notificações e indicadores | Regras e números conciliados com dados reais |
| 4 | P3: automação e preferências | Casos de uso comprovados e execução segura |

Itens já resolvidos devem ser marcados como atendidos, com evidência, sem reimplementação. A ordem pode mudar por dependência técnica ou impacto comprovado, registrando o motivo. Não estimar prazos sem conhecer o repositório.

## 7. Verificação e testes

Seguir as instruções de testes do projeto. Para regras novas ou corrigidas, usar TDD: teste que reproduz a necessidade, implementação mínima e refatoração.

- Unitários: validações, estados, filtros, cálculos e regras de persistência alteradas.
- Integração: contratos, persistência, autorização, isolamento e falhas recuperáveis.
- E2E: jornadas prioritárias, retorno lista/detalhe, recuperação de formulário e experiência móvel.
- Revisão manual: textos, foco, teclado, responsividade e feedback visual.
- Executar build, lint, análise de tipos e testes disponíveis; registrar os comandos e resultados reais.
- Atender à cobertura mínima de 80% quando exigida pelas instruções aplicáveis. Informar separadamente a cobertura do escopo alterado e eventuais limitações da cobertura global.

Não declarar checks não executados como aprovados. Não adicionar testes sem relação com riscos ou comportamento relevante.

## 8. Definição de concluído

A demanda só está concluída quando os itens aplicáveis têm implementação e evidência de aceite; itens não aplicáveis têm justificativa; não há regressões conhecidas introduzidas; checks obrigatórios passaram; riscos restantes e limitações estão documentados.

A entrega deve incluir arquivos alterados, evidências dos fluxos, resultados de testes, mudanças de contrato ou migração, instruções de verificação e reversão quando necessárias. Bloqueios reais devem ser explicitados, sem transformar trabalho incompleto em conclusão.

## 9. Fora de escopo por padrão

- Implementar esta demanda no site Pedro Henrique.
- Reescrever toda a plataforma ou trocar sua stack.
- Criar regras de negócio, perfis, dados ou integrações sem validação.
- Adicionar inteligência artificial, canais externos ou serviços pagos automaticamente.
- Publicar em produção, enviar mensagens externas ou executar migrações destrutivas sem autorização correspondente.


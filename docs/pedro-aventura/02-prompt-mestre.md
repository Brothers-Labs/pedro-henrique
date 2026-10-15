# Prompt mestre — Temporada do Pedro 3D

> Prompt original entregue por Pedro Felipe em 14/10/2026, guardado sem alterações para servir de
> referência às próximas demandas. A interpretação aplicada a este repositório está em
> [01-analise.md](01-analise.md) e o plano de execução em [03-plano-de-desenvolvimento.md](03-plano-de-desenvolvimento.md).
>
> Contexto adicional dado junto com o prompt:
>
> - O jogo novo abre em uma rota própria: `https://pedro-henrique-seven.vercel.app/pedro-aventura`.
> - Deve abrir uma tela nova, totalmente separada.
> - O projeto antigo (Pedro Maker, Kart, Flash e o restante do site) continua como antes.
> - Referência visual: quatro mocks (lobby, mapa de seis regiões, gameplay e passe de temporada).

---

# MASTER PROMPT — TEMPORADA DO PEDRO 3D
## Principal Game Architect · AAA Web Game Engineering · Multi-Agent Orchestration

Você é o **Principal Game Architect, Staff Software Engineer, Game Director e Coordenador Técnico** do projeto TEMPORADA DO PEDRO.

Sua missão é transformar os quatro mocks visuais fornecidos em um jogo 3D real, completo, moderno, divertido, responsivo e persistente, com experiência premium de qualidade comercial.

**IMPORTANTE:** não desenvolver apenas uma landing page, protótipo visual, apresentação ou telas estáticas.

Desenvolver um jogo de verdade, com personagem controlável, mapa interativo, fases jogáveis, física, animações, colisões, desafios, missões, recompensas e progressão persistente.

Os quatro mocks são a referência principal de identidade visual:

1. Lobby 3D e tela inicial.
2. Mapa de aventura com seis regiões.
3. Gameplay 3D com obstáculos, moedas e missões.
4. Passe de temporada com recompensas gratuitas, VIP e Luxo.

A experiência final deve preservar a identidade visual: preto, azul neon, dourado, cenários cinematográficos, personagem Pedro, cachorro companheiro, carros e elementos de aventura.

---

# 1. PRINCÍPIOS INEGOCIÁVEIS

- Trabalhar como uma equipe sênior especializada em desenvolvimento de jogos.
- Priorizar gameplay real, estabilidade, desempenho e diversão.
- Nunca substituir mecânicas reais por botões decorativos.
- Nunca criar funcionalidades falsas ou dados simulados apresentados como reais.
- Respeitar integralmente a arquitetura existente.
- Inspecionar o repositório antes de escolher ferramentas ou bibliotecas.
- Reutilizar soluções já implementadas.
- Não sobrescrever trabalho existente.
- Não remover funcionalidades sem justificativa e aprovação.
- Garantir experiência desktop e mobile.
- Manter a aplicação acessível e utilizável.
- Criar código modular, testável, escalável e documentado.
- Não usar imagens estáticas para fingir gameplay 3D.
- Utilizar assets 3D com licença apropriada.
- Não utilizar personagens ou assets protegidos de outros jogos sem autorização.

Qualquer decisão arquitetural importante deve considerar manutenção, desempenho, compatibilidade, segurança e evolução futura.

---

# 2. EQUIPE DE SUBAGENTES

Você é o ORQUESTRADOR PRINCIPAL.

Crie e coordene subagentes especializados, conforme as capacidades disponíveis no ambiente.

## AGENT 01 — Principal Game Architect

Responsabilidades:
- Inspecionar o projeto existente.
- Definir arquitetura de alto nível.
- Avaliar dependências e riscos.
- Definir módulos e contratos.
- Definir padrões de implementação.
- Identificar gargalos técnicos.
- Validar compatibilidade entre sistemas.

Arquivos permitidos:
- Documentação de arquitetura.
- ADRs.
- Diagramas.
- Especificações técnicas.

Não editar código de gameplay.

## AGENT 02 — Senior Game Engine Engineer

Responsabilidades:
- Configuração da engine 3D.
- Game loop.
- Renderização.
- Câmeras.
- Iluminação.
- Física e colisões.
- Controle do personagem.
- Otimização de cenas.
- Sistema de carregamento de assets.

Escopo exclusivo:
- Engine.
- Rendering.
- Physics.
- Camera.
- Scene management.

## AGENT 03 — Senior Gameplay Engineer

Responsabilidades:
- Mecânicas de movimentação.
- Corrida.
- Saltos.
- Obstáculos.
- Coleta de moedas.
- Dano e vidas.
- Checkpoints.
- Condições de vitória e derrota.
- Reinício de fases.
- Sistema de pontuação.

Escopo exclusivo:
- Gameplay.
- Mechanics.
- Levels.
- Player controller.

Contratos de engine devem ser acordados antes da implementação.

## AGENT 04 — Senior Game UI/UX Designer

Responsabilidades:
- Lobby.
- Navegação.
- HUD.
- Menus.
- Feedback visual.
- Animações de interface.
- Responsividade.
- Experiência mobile.
- Acessibilidade.
- Estados de carregamento, erro e sucesso.

Escopo exclusivo:
- Componentes visuais.
- Estilos.
- Design system.
- Interface de usuário.

## AGENT 05 — Senior 3D World Designer

Responsabilidades:
- Estrutura do mapa.
- Ambientes.
- Terrenos.
- Cenários.
- Iluminação artística.
- Objetos interativos.
- Posicionamento de obstáculos.
- Transições entre regiões.
- Otimização dos ambientes.

Escopo exclusivo:
- World.
- Environment.
- Level data.
- Scene assets.

## AGENT 06 — Senior Character & Animation Engineer

Responsabilidades:
- Personagem Pedro.
- Cachorro companheiro.
- Rigging e animações.
- Idle, caminhada, corrida e salto.
- Transições de animação.
- Reações a colisões.
- Personalização de personagens.
- Animações de vitória e derrota.

Escopo exclusivo:
- Characters.
- Animation.
- Character assets.

## AGENT 07 — Senior Backend Architect

Responsabilidades:
- API.
- Banco de dados.
- Autenticação.
- Persistência.
- Histórico de progresso.
- Controle de temporada.
- Economia virtual.
- Ranking.
- Segurança.
- Auditoria.

Escopo exclusivo:
- Backend.
- Database.
- API.
- Migrations.

## AGENT 08 — Game Economy & Progression Designer

Responsabilidades:
- Progressão de níveis.
- XP.
- Moedas.
- Diamantes.
- Missões.
- Recompensas.
- Passe gratuito.
- Passe VIP.
- Passe Luxo.
- Balanceamento.
- Conquistas.
- Eventos especiais.

Escopo exclusivo:
- Game design data.
- Progression rules.
- Economy configuration.

Não editar diretamente o backend sem coordenação.

## AGENT 09 — Senior QA Automation Engineer

Responsabilidades:
- Testes unitários.
- Testes de integração.
- Testes E2E.
- Testes de gameplay.
- Testes de persistência.
- Testes de regressão.
- Testes mobile.
- Testes de desempenho.
- Verificação de CI.

Escopo exclusivo:
- Testes.
- Fixtures.
- QA documentation.

## AGENT 10 — Senior DevOps & Performance Engineer

Responsabilidades:
- Pipeline de CI.
- Build de produção.
- GitHub Actions.
- Staging.
- Verificação de deploy.
- Otimização de bundle.
- Compressão de assets.
- Observabilidade.
- Monitoramento de erros.

Escopo exclusivo:
- CI/CD.
- Infraestrutura.
- Build configuration.
- Performance tooling.

## AGENT 11 — Security & Code Review Engineer

Responsabilidades:
- Revisar implementações.
- Identificar vulnerabilidades.
- Verificar validação de dados.
- Auditar transações de recompensas.
- Revisar concorrência e duplicidade.
- Identificar regressões.
- Revisar segurança de pagamentos.
- Validar conformidade arquitetural.

Este agente atua preferencialmente em modo de leitura e revisão.

## AGENT 12 — Game Product Director

Responsabilidades:
- Avaliar diversão.
- Identificar fricções.
- Analisar jornada.
- Propor melhorias.
- Priorizar backlog.
- Verificar consistência entre os quatro mocks.
- Validar experiência premium.

Não editar arquivos de implementação.

---

# 3. POLÍTICA DE CONCORRÊNCIA

Antes de iniciar qualquer tarefa:

1. Identificar os arquivos afetados.
2. Registrar o agente responsável.
3. Definir arquivos e diretórios permitidos.
4. Identificar dependências entre agentes.
5. Impedir edições simultâneas no mesmo arquivo.
6. Impedir alterações concorrentes em arquivos compartilhados de configuração.
7. Separar contratos de interfaces antes da implementação paralela.
8. Centralizar integração no orquestrador.

O orquestrador é o único responsável por:

- Atualizar CLAUDE_QUEUE.md.
- Alterar status de demandas.
- Coordenar merges.
- Resolver conflitos.
- Executar integração final.
- Realizar commits.
- Executar push.
- Validar CI.
- Marcar demandas como DONE.

Os agentes devem entregar relatórios objetivos contendo arquivos alterados, decisões, testes executados e riscos.

---

# 4. ARQUITETURA DO JOGO

Inspecionar o repositório e preservar a stack existente quando tecnicamente adequada.

Caso o projeto esteja sendo iniciado do zero, avaliar esta arquitetura de referência:

Frontend:
- Angular com TypeScript.
- Babylon.js para renderização 3D.
- Componentes standalone.
- Gerenciamento de estado reativo.
- Lazy loading.
- Design system próprio.

Backend:
- Node.js.
- API tipada e validada.
- Prisma.
- PostgreSQL.
- Autenticação segura.
- Persistência transacional.

Qualidade:
- TypeScript strict.
- ESLint.
- Testes unitários.
- Testes E2E com Playwright.
- CI com GitHub Actions.
- Monitoramento de erros.
- Documentação técnica.

Não instalar bibliotecas desnecessárias.

O jogo deve ter separação clara entre:

- Rendering.
- Game state.
- Gameplay.
- Input.
- Physics.
- UI.
- Audio.
- Progression.
- Economy.
- Persistence.
- Networking.

---

# 5. LOBBY 3D — TELA INICIAL

Criar a experiência principal do jogador.

Elementos obrigatórios:

- Personagem Pedro em 3D.
- Cachorro companheiro.
- Cenário premium.
- Animações de idle.
- Câmera cinematográfica.
- Interface navegável.
- Nível atual.
- Barra de XP.
- Saldo de moedas.
- Saldo de diamantes.
- Contagem regressiva da temporada.
- Missões diárias.
- Evento especial.
- Botão Jogar Agora.
- Botão Explorar Mapa.
- Acesso ao passe.
- Loja.
- Ranking.
- Personalização.
- Configurações.

Todos os botões devem executar ações reais.

A navegação deve preservar estado, não provocar carregamentos desnecessários e funcionar em dispositivos móveis.

---

# 6. MAPA DE AVENTURA 3D

Construir um mapa interativo com seis regiões:

REGIÃO 1 — ILHA INICIAL
- Fases introdutórias.
- Tutoriais.
- Coleta de moedas.
- Saltos básicos.
- Obstáculos simples.

REGIÃO 2 — ZONA URBANA
- Corridas.
- Trânsito.
- Obstáculos urbanos.
- Desafios de tempo.

REGIÃO 3 — MONTANHA RADICAL
- Trilhas.
- Plataformas.
- Saltos.
- Terrenos inclinados.
- Desafios de precisão.

REGIÃO 4 — CIDADE DO LUXO
- Ambientes premium.
- Desafios avançados.
- Veículos especiais.
- Recompensas raras.

REGIÃO 5 — DESERTO XTREME
- Corridas em dunas.
- Obstáculos dinâmicos.
- Desafios de resistência.
- Fases de dificuldade elevada.

REGIÃO 6 — EVENTOS ESPECIAIS
- Desafios temporários.
- Corridas especiais.
- Missões exclusivas.
- Recompensas sazonais.

Cada região deve possuir:

- Identidade visual.
- Estado bloqueado/desbloqueado.
- Número de fases.
- Estrelas conquistadas.
- Progresso persistente.
- Prévia do cenário.
- Condições claras de desbloqueio.

Criar sistema de progressão orientado a dados para permitir novas regiões sem reescrever a engine.

---

# 7. GAMEPLAY REAL

Implementar o primeiro modo de jogo como um runner/parkour 3D com câmera em terceira pessoa.

Mecânicas mínimas:

- Movimentação do personagem.
- Corrida.
- Salto.
- Colisões.
- Coleta de moedas.
- Coleta de itens especiais.
- Obstáculos.
- Sistema de vidas.
- Checkpoints.
- Cronômetro.
- Objetivos.
- Linha de chegada.
- Vitória.
- Derrota.
- Reiniciar fase.
- Próxima fase.

Desktop:
- Teclado.
- Mouse quando aplicável.
- Suporte opcional a gamepad.

Mobile:
- Controles por toque.
- Botões de ação.
- Interface adaptativa.

Criar estados formais:

LOADING
READY
PLAYING
PAUSED
VICTORY
DEFEAT
ERROR

Garantir transições consistentes e limpeza de recursos ao sair da fase.

---

# 8. SISTEMA DE MISSÕES

Implementar um sistema orientado a eventos de gameplay.

Missões iniciais:

- Completar uma fase.
- Completar dez fases.
- Coletar dez corações.
- Coletar cem moedas.
- Saltar cinco rampas.
- Concluir uma fase sem perder vidas.
- Finalizar abaixo do tempo-alvo.
- Desbloquear uma nova região.

Cada missão deve possuir:

- Identificador único.
- Tipo.
- Objetivo.
- Valor-alvo.
- Progresso atual.
- Recompensa.
- Estado.
- Data de expiração quando aplicável.

Categorias:

- Diárias.
- Semanais.
- Temporada.
- Especiais.

Progresso deve ser validado pelo servidor conforme eventos confiáveis, evitando aceitar diretamente valores arbitrários enviados pelo cliente.

---

# 9. PASSE DE TEMPORADA

Implementar três trilhas:

PASSE GRATUITO
- Disponível para todos.
- Moedas.
- XP.
- Itens básicos.

PASSE VIP — R$ 1,99
- Recompensas adicionais.
- Skins especiais.
- Itens cosméticos.
- Baús exclusivos.

PASSE LUXO — R$ 4,90
- Benefícios do VIP.
- Skins lendárias.
- Veículos especiais.
- Pets cosméticos.
- Recompensas exclusivas.

Os valores são referências do conceito e devem ser configuráveis.

Não implementar cobrança real sem integração aprovada, requisitos legais e confirmação do proprietário.

O jogo deve permitir desenvolver e testar as três trilhas em ambiente de desenvolvimento sem pagamentos reais.

Implementar:

- Níveis de temporada.
- XP acumulado.
- Recompensas desbloqueadas.
- Recompensas resgatadas.
- Controle de elegibilidade.
- Histórico de resgates.
- Prevenção de resgates duplicados.
- Encerramento de temporada.
- Criação de novas temporadas.
- Histórico de temporadas anteriores.

Toda concessão de moeda, item ou recompensa deve ser validada pelo backend e persistida de forma transacional e idempotente.

---

# 10. PERSISTÊNCIA COMPLETA

Criar modelos adequados para:

- User.
- PlayerProfile.
- Character.
- Inventory.
- Wallet.
- WalletTransaction.
- Season.
- SeasonLevel.
- SeasonPass.
- Reward.
- RewardClaim.
- Mission.
- MissionProgress.
- World.
- GameLevel.
- LevelAttempt.
- PlayerLevelProgress.
- Achievement.
- PlayerAchievement.
- Cosmetic.
- EquippedCosmetic.

Adaptar nomes e relacionamentos à arquitetura existente.

Requisitos:

- Migrações versionadas.
- Integridade referencial.
- Índices apropriados.
- Operações transacionais.
- Idempotência.
- Controle de concorrência.
- Auditoria.
- Recuperação de progresso.
- Regras de autorização por usuário.

Nunca confiar em moedas, XP, compras ou recompensas informadas diretamente pelo navegador.

---

# 11. EXPERIÊNCIA VISUAL PREMIUM

Seguir os mocks fornecidos.

Direção artística:

- Preto profundo.
- Dourado metálico.
- Azul neon.
- Vidro translúcido.
- Sombras suaves.
- Iluminação cinematográfica.
- Reflexos controlados.
- Partículas.
- Microinterações.
- Animações fluidas.

Priorizar legibilidade.

Não sacrificar FPS para adicionar efeitos visuais.

Implementar configurações de qualidade:

- Baixa.
- Média.
- Alta.
- Automática.

Criar fallback para dispositivos com recursos limitados.

Respeitar preferências de redução de movimento.

---

# 12. AUDIO E FEEDBACK

Implementar arquitetura de áudio para:

- Música de lobby.
- Música de gameplay.
- Coleta de moedas.
- Saltos.
- Colisões.
- Vitória.
- Derrota.
- Desbloqueio.
- Resgate de recompensa.

Respeitar políticas de reprodução automática dos navegadores.

Criar controles de volume, efeitos e música.

Não utilizar músicas comerciais sem licença.

---

# 13. QUALIDADE E TESTES

Implementar testes para:

- Cálculo de XP.
- Desbloqueio de níveis.
- Progressão.
- Conclusão de missões.
- Recompensas.
- Resgates duplicados.
- Transações de moedas.
- Autorização.
- Persistência.
- Retomada de sessão.
- Estados de gameplay.
- Navegação.
- Controles desktop.
- Controles mobile.

Criar smoke tests E2E da jornada:

Entrar → Lobby → Mapa → Fase → Vitória → XP → Missão → Recompensa → Persistência → Retorno ao jogo.

Testar também derrota, desconexão, refresh, timeout e falha de API.

---

# 14. PERFORMANCE

Definir metas iniciais, ajustáveis após medição:

- 60 FPS em desktop de referência.
- 30 FPS ou mais em mobile compatível.
- Carregamento progressivo.
- Texturas otimizadas.
- Assets comprimidos.
- Lazy loading por região.
- Reutilização de materiais.
- Pooling de objetos.
- Descarte correto de recursos GPU.
- Redução de draw calls.
- Controle de memória.
- Tratamento de perda de contexto WebGL.

Criar benchmarks reproduzíveis.

Registrar métricas reais e ambiente utilizado.

Não declarar metas atingidas sem medições.

---

# 15. CLAUDE_QUEUE.MD — FLUXO OBRIGATÓRIO

Antes de implementar:

1. Inspecionar o repositório.
2. Ler CLAUDE.md, CLAUDE_QUEUE.md e instruções locais.
3. Verificar git status.
4. Identificar alterações não commitadas.
5. Verificar branches e remotes.
6. Identificar scripts de teste, verify e vtest.
7. Identificar pipelines existentes.
8. Identificar a próxima demanda elegível.

Se CLAUDE_QUEUE.md não existir, criar um backlog inicial com dependências explícitas.

Se existir, preservar seu conteúdo e convenções.

Apenas o orquestrador pode modificar a fila.

Estados:

PENDING
IN_PROGRESS
BLOCKED
DONE

Executar a primeira demanda PENDING cujas dependências estejam satisfeitas.

Nunca iniciar uma demanda dependente antes de sua predecessora estar validada.

---

# 16. FLUXO DE ENTREGA POR DEMANDA

Para cada demanda:

FASE A — ANÁLISE
- Ler código relacionado.
- Identificar dependências.
- Mapear riscos.
- Definir critérios de aceite.
- Identificar arquivos afetados.

FASE B — PLANEJAMENTO
- Selecionar agentes.
- Distribuir responsabilidades.
- Definir arquivos exclusivos.
- Definir contratos.
- Planejar testes.

FASE C — IMPLEMENTAÇÃO
- Executar implementação.
- Preservar mudanças existentes.
- Não modificar arquivos fora do escopo.
- Criar testes relevantes.

FASE D — REVISÃO
- Revisão cruzada.
- Verificação arquitetural.
- Segurança.
- Performance.
- Usabilidade.
- Regressão.

FASE E — VERIFICAÇÃO
- Instalar dependências conforme lockfile.
- Executar lint.
- Executar typecheck.
- Executar testes unitários.
- Executar testes de integração.
- Executar testes E2E relevantes.
- Executar build.
- Executar vtest, caso exista.
- Executar verify completo.
- Corrigir problemas encontrados.

FASE F — GIT
- Revisar diff.
- Confirmar escopo.
- Criar commit descritivo.
- Atualizar staging com segurança.
- Integrar alterações.
- Resolver conflitos preservando mudanças de terceiros.
- Reexecutar validações após integração.
- Fazer push para staging, conforme política do repositório.

FASE G — CI
- Acompanhar GitHub Actions.
- Aguardar conclusão.
- Verificar resultados.
- Investigar falhas.
- Corrigir falhas relacionadas à demanda.
- Reexecutar validações necessárias.

FASE H — FINALIZAÇÃO
Marcar DONE somente quando:

- Critérios de aceite satisfeitos.
- Código integrado.
- Testes aprovados.
- Verify aprovado.
- vtest aprovado, quando aplicável.
- CI aprovado.
- Staging validada.

Se alguma etapa falhar ou depender de acesso não disponível, manter a demanda como IN_PROGRESS ou BLOCKED e informar claramente.

Nunca simular resultados de testes ou CI.

Nunca utilizar --force para sobrescrever trabalho remoto.

Nunca executar git reset --hard, git clean destrutivo ou descartar alterações existentes sem autorização específica.

Não criar commits contendo alterações não relacionadas.

---

# 17. EVOLUÇÃO CONTÍNUA — PREMIUM GAME LOOP

Após cada demanda validada, realizar uma revisão de produto.

Avaliar:

1. Funcionalidade.
2. Jogabilidade.
3. Diversão.
4. Usabilidade.
5. Performance.
6. Visual.
7. Segurança.
8. Persistência.
9. Acessibilidade.
10. Qualidade do código.

Identificar melhorias e classificá-las em:

P0 — Bloqueador.
P1 — Essencial.
P2 — Alto valor.
P3 — Refinamento.

Priorizar utilizando:

- Impacto para o jogador.
- Gravidade.
- Frequência de uso.
- Risco técnico.
- Esforço.
- Dependências.

Criar demandas objetivas e testáveis.

Não implementar melhorias indiscriminadamente.

Executar ciclos sucessivos de análise → implementação → testes → revisão → integração, respeitando dependências e a fila.

Limites:
- Não criar loops infinitos.
- Não continuar indefinidamente consumindo recursos.
- Não refatorar código estável sem benefício mensurável.
- Não introduzir funcionalidades fora do escopo aprovado.
- Não marcar como concluído algo sem validação.

O ciclo termina quando não existirem demandas elegíveis dentro do escopo aprovado, quando houver bloqueio ou quando o orçamento de execução disponível for atingido.

---

# 18. ROADMAP DE DESENVOLVIMENTO

Organizar o projeto em entregas incrementais.

MARCO 1 — FUNDAÇÃO
- Arquitetura.
- Setup.
- Engine.
- Navegação.
- Banco.
- Autenticação.
- CI.

MARCO 2 — VERTICAL SLICE JOGÁVEL
- Lobby funcional.
- Personagem animado.
- Uma fase 3D completa.
- Física.
- Obstáculos.
- Vitória e derrota.
- Progresso salvo.

MARCO 3 — MAPA E CAMPANHA
- Seis regiões.
- Desbloqueio.
- Fases configuráveis.
- Estrelas.
- Progressão.

MARCO 4 — TEMPORADA
- XP.
- Missões.
- Passe gratuito.
- VIP.
- Luxo.
- Recompensas.
- Inventário.

MARCO 5 — POLIMENTO PREMIUM
- Animações.
- Audio.
- Partículas.
- Transições.
- Responsividade.
- Otimização.

MARCO 6 — QUALIDADE DE PRODUÇÃO
- Testes completos.
- Segurança.
- Observabilidade.
- Staging.
- CI.
- Documentação.
- Release candidate.

Cada marco deve produzir uma entrega verificável.

Não iniciar dezenas de funcionalidades sem concluir uma experiência vertical jogável.

---

# 19. RELATÓRIO OBRIGATÓRIO

Ao finalizar cada demanda, apresentar:

DEMANDA:
STATUS:
OBJETIVO:
AGENTES UTILIZADOS:
ARQUIVOS ALTERADOS:
FUNCIONALIDADES ENTREGUES:
TESTES EXECUTADOS:
RESULTADO DO VERIFY:
RESULTADO DO VTEST:
RESULTADO DO BUILD:
RESULTADO DO GITHUB ACTIONS:
BRANCH:
COMMIT:
STATUS DO STAGING:
RISCOS:
PRÓXIMA DEMANDA:

Informar claramente o que está concluído, parcial, bloqueado ou pendente.

---

# 20. ORDEM FINAL DE EXECUÇÃO

Comece agora.

1. Analise o repositório integralmente.
2. Verifique os quatro mocks.
3. Identifique a arquitetura atual.
4. Leia a fila oficial.
5. Monte a equipe de agentes.
6. Defina responsabilidades e arquivos permitidos.
7. Crie ou atualize o roadmap.
8. Selecione a próxima demanda elegível.
9. Execute a implementação.
10. Revise o resultado integrado.
11. Execute testes.
12. Execute vtest e verify quando disponíveis.
13. Faça commit.
14. Integre com staging atualizada.
15. Faça push.
16. Acompanhe GitHub Actions.
17. Valide a entrega.
18. Atualize a fila.
19. Identifique melhorias prioritárias.
20. Continue com a próxima demanda elegível dentro dos limites estabelecidos.

**MISSÃO FINAL:**

Entregar a TEMPORADA DO PEDRO como um jogo 3D real para navegador, com qualidade visual premium, arquitetura sustentável, mecânicas divertidas, progressão persistente, temporadas configuráveis e pipeline profissional de engenharia.

Não basta parecer um jogo.

**TEM QUE SER UM JOGO COMPLETO, FUNCIONAL E DIVERTIDO.**

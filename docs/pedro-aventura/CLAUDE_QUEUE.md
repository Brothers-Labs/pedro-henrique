# CLAUDE_QUEUE: Pedro Aventura (Temporada do Pedro 3D)

Fila oficial das demandas do jogo em `/pedro-aventura`. Só o orquestrador altera esta fila.

Estados possíveis: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE`.

| ID | Demanda | Depende de | Estado | Observação |
| --- | --- | --- | --- | --- |
| AV-001 | Rota `/pedro-aventura` em tela cheia, separada do site | — | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-002 | Estado do jogo, persistência versionada e saneamento | AV-001 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-003 | Regras puras: carteira, campanha, missões, passe, inventário e aplicação da partida | AV-002 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-004 | Gerador de fases e simulação da corrida, determinísticos e testados | AV-003 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-005 | Motor 3D: palco, modelos procedurais e cena da corrida | AV-004 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-006 | Fase jogável: painel, controles de teclado, toque e gamepad, pausa, vitória e derrota | AV-005 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-007 | Seis regiões, mapa 3D e desbloqueio por estrelas | AV-006 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-008 | Missões diárias, semanais, de temporada e especiais | AV-003 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-009 | Passe Gratuito, VIP e Luxo; comprar níveis; baús de conteúdo visível | AV-008 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-010 | Loja, inventário e personagem (roupa, cachorro, veículo) | AV-009 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-011 | Lobby 3D, áudio, configurações, qualidade e movimento reduzido | AV-007, AV-010 | DONE | Entregue em 14/10/2026; ver 04-relatorio-final.md |
| AV-012 | Backend: API, banco, autenticação e validação de economia no servidor | AV-011 | BLOCKED | Não existe servidor nem infraestrutura de banco (`apiUrl` nulo) |
| AV-013 | GitHub Actions: build e testes em PR e staging | — | BLOCKED | O repositório não tem workflows; precisa de aprovação, porque afeta o site inteiro |
| AV-014 | Playwright E2E da jornada e ESLint | AV-011 | BLOCKED | Dependências novas; precisam de aprovação |
| AV-015 | Benchmarks de FPS em aparelho real (desktop e tablet) | AV-011 | PENDING | Precisa de medição manual no aparelho |

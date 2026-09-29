Quero desenvolver uma NOVA FUNCIONALIDADE PRINCIPAL no site infantil Pedro Henrique:

🗺️ MAPA DA AVENTURA

Essa funcionalidade deve transformar os jogos e atividades existentes em uma grande jornada gamificada, visual e progressiva.

IMPORTANTE:
Não quero simplesmente uma página contendo cards de jogos.

Quero uma experiência parecida com um MAPA DE AVENTURA infantil, onde Pedro e seu mascote avançam por mundos, fases, desafios, recompensas e chefões.

A sensação deve ser:

"Pedro e Foguinho estão vivendo uma grande aventura enquanto aprendem."

========================================================
ANTES DE DESENVOLVER
========================================================

Primeiro analise TODO o projeto atual.

Entenda:

- arquitetura;
- Angular/stack utilizada;
- rotas;
- componentes;
- serviços;
- models/interfaces;
- persistência;
- autenticação/perfil;
- página /jogos;
- sistema de níveis;
- XP;
- pontos;
- sequência;
- conquistas;
- progresso;
- mascote;
- PetProgressService ou equivalente;
- eventos existentes;
- estilos globais;
- responsividade;
- sistema de áudio/animações.

NÃO recrie sistemas que já existem.

Reutilize a arquitetura atual.

Não quebre:

- /jogos;
- mascote;
- níveis;
- pontos;
- progresso;
- conquistas;
- demais funcionalidades.

========================================================
CONCEITO PRINCIPAL
========================================================

Criar uma nova rota:

/aventura

Adicionar ao menu:

🗺️ Aventura

Essa será uma das principais áreas do site.

O mapa terá inicialmente 5 grandes mundos:

1. 🏡 Vila da Matemática
2. 🌲 Floresta da Memória
3. 🏰 Castelo do Inglês
4. 🔬 Laboratório da Ciência
5. 🏝️ Ilha dos Desafios

Cada mundo terá:

- identidade visual própria;
- fases;
- progressão;
- estrelas;
- XP;
- recompensas;
- desafios;
- curiosidades;
- checkpoint;
- fase final;
- chefão/desafio final.

Não usar combate violento.

"Chefão" significa um GRANDE DESAFIO educativo.

========================================================
ESTRUTURA DA JORNADA
========================================================

Fluxo:

VILA DA MATEMÁTICA
        ↓
FLORESTA DA MEMÓRIA
        ↓
CASTELO DO INGLÊS
        ↓
LABORATÓRIO DA CIÊNCIA
        ↓
ILHA DOS DESAFIOS
        ↓
🏆 GRANDE CONQUISTA

Inicialmente, cada mundo poderá possuir 10 fases.

Arquitetura precisa permitir futuramente:

15
20
30+
fases por mundo.

Não hardcodar lógica assumindo exatamente 10 fases.

========================================================
MAPA VISUAL
========================================================

Quero um mapa grande, bonito e infantil.

NÃO quero:

[ Mundo 1 ]
[ Mundo 2 ]
[ Mundo 3 ]

como simples cards.

Quero realmente a aparência de um MAPA.

Exemplo conceitual:

                 🏰
              Castelo
                 ●
                /
          ●────●
         /
      🌲
   Floresta
      ●
       \
        ●
         \
🏡 ●────●────●
Vila

Com:

- caminhos;
- trilhas;
- rios;
- pontes;
- árvores;
- montanhas;
- nuvens;
- estrelas;
- bandeiras;
- checkpoints;
- elementos decorativos.

O mapa deve possuir uma trilha visual indicando o caminho da criança.

========================================================
PERSONAGEM NO MAPA
========================================================

Mostrar Pedro + mascote no ponto atual.

Principalmente o mascote.

Exemplo:

       ⭐
       ● fase 7
      /
🐉 Foguinho
Pedro está aqui!

Adicionar pequena animação idle.

Quando uma fase for concluída:

Foguinho deve caminhar/voar visualmente até o próximo ponto.

Animação curta.

Não exagerar.

Respeitar prefers-reduced-motion.

========================================================
STATUS DAS FASES
========================================================

Cada fase pode estar em:

LOCKED
AVAILABLE
CURRENT
COMPLETED
PERFECT

Representação:

🔒 bloqueada

● disponível

🐉 atual

✓ concluída

⭐ perfeita

Visualmente diferenciar sem depender apenas da cor.

========================================================
ESTRELAS
========================================================

Cada fase pode conceder até:

⭐⭐⭐

Exemplo:

1 estrela:
fase concluída.

2 estrelas:
bom desempenho.

3 estrelas:
excelente desempenho.

Criar regras configuráveis.

Exemplo conceitual:

⭐ concluir
⭐⭐ >= 70%
⭐⭐⭐ >= 90%

Adaptar conforme o tipo de atividade.

Não espalhar esses números pelo código.

Criar configuração central.

========================================================
MUNDO 1
🏡 VILA DA MATEMÁTICA
========================================================

Tema:

cidade/vila alegre.

Elementos:

- casinhas;
- números;
- placas;
- moinho;
- ponte;
- moedas;
- árvores;
- rio.

10 fases iniciais.

Exemplo:

FASE 1
➕ Soma simples

FASE 2
➖ Subtração

FASE 3
➕➖ Misturando contas

FASE 4
🔢 Sequências

FASE 5
🎯 Desafio rápido

FASE 6
✖️ Introdução à multiplicação

FASE 7
✖️ Tabuada simples

FASE 8
🧩 Problemas matemáticos

FASE 9
⚡ Super desafio

FASE 10

👑 DESAFIO FINAL

"O Guardião dos Números"

Não é combate.

O personagem apresenta uma sequência de desafios matemáticos.

Exemplo:

10 perguntas variadas.

Ao completar:

🎉
"VOCÊ SALVOU A VILA DA MATEMÁTICA!"

Recompensas:

+ XP
+ XP mascote
+ medalha
+ acessório
+ mundo seguinte.

========================================================
MUNDO 2
🌲 FLORESTA DA MEMÓRIA
========================================================

Tema:

floresta mágica.

Elementos:

- árvores;
- cogumelos;
- animais;
- vaga-lumes;
- rios;
- pequenas pontes;
- pedras mágicas.

Fases envolvendo:

- memória visual;
- pares;
- sequência;
- cores;
- formas;
- padrões;
- posições;
- atenção.

Exemplo:

1. Encontre os pares
2. Lembre as cores
3. Sequência dos animais
4. Onde estava?
5. Caminho secreto
6. Memória rápida
7. Padrões
8. Super memória
9. Desafio da floresta
10. Guardião da Memória

========================================================
MUNDO 3
🏰 CASTELO DO INGLÊS
========================================================

Tema:

castelo mágico.

Usar inglês como CONTEÚDO EDUCACIONAL, mas toda interface/instrução permanece PT-BR.

Exemplo:

🍎 Apple

🐶 Dog

🏠 House

🌞 Sun

Fases:

1. Animais
2. Cores
3. Números
4. Família
5. Objetos
6. Comidas
7. Casa
8. Frases simples
9. Revisão
10. Desafio do Castelo

Sempre adequado para criança.

========================================================
MUNDO 4
🔬 LABORATÓRIO DA CIÊNCIA
========================================================

Tema:

laboratório divertido.

Elementos:

- tubos;
- planetas;
- microscópios;
- foguetes;
- plantas;
- animais;
- experiências.

Conteúdo:

🌎 planeta
🌱 natureza
🐾 animais
🪐 espaço
💧 água
🌦️ clima
🧍 corpo humano básico
⚡ energia
🔬 experiências

Criar perguntas e atividades visuais.

Adicionar:

"Você sabia?"

Exemplo:

💡 VOCÊ SABIA?

"Um dia em Marte dura aproximadamente 24 horas e 39 minutos."

Essas curiosidades podem futuramente entrar em uma coleção.

========================================================
MUNDO 5
🏝️ ILHA DOS DESAFIOS
========================================================

Esse é o mundo mais especial.

Mistura:

Matemática
+
Memória
+
Inglês
+
Ciência
+
Lógica.

Visual:

ilha tropical misteriosa.

Elementos:

- praia;
- navio;
- palmeiras;
- vulcão;
- cavernas;
- tesouro;
- ruínas;
- mapa do tesouro.

Cada fase mistura habilidades.

FASE FINAL:

🏆 O GRANDE DESAFIO

Misturar perguntas dos mundos anteriores.

Ao concluir:

animação especial.

========================================================
GRANDE FINAL
========================================================

Ao completar os cinco mundos:

Criar uma celebração especial.

Tela fullscreen:

✨🏆✨

PEDRO COMPLETOU
A GRANDE AVENTURA!

Mostrar:

Pedro
+
Foguinho

Confetes.

Estrelas.

Troféu.

Resumo:

🏡 Matemática
30/30 ⭐

🌲 Memória
28/30 ⭐

🏰 Inglês
26/30 ⭐

🔬 Ciência
29/30 ⭐

🏝️ Desafios
30/30 ⭐

TOTAL:

143 / 150 ⭐

Recompensa:

🏆 Troféu Mestre Aventureiro

+ XP
+ acessório exclusivo.

Depois:

"Uma nova aventura está chegando..."

A arquitetura deve permitir adicionar novos mundos posteriormente.

========================================================
INTEGRAÇÃO COM FOGUINHO
========================================================

Essa integração é MUITO importante.

O mascote precisa acompanhar Pedro.

Antes da fase:

🐉
"Pedro, estamos quase chegando!"

Durante:

"Boa!"

"Mandou muito bem!"

"Quase! Tenta outra vez."

Após:

"Conseguimos!"

Ao receber 3 estrelas:

"PERFEITO! ⭐⭐⭐"

Ao liberar mundo:

"Uau! Um lugar novo apareceu no mapa!"

========================================================
XP
========================================================

Integrar ao sistema REAL existente.

Exemplo:

Concluir fase:
+20 XP criança
+10 XP Foguinho

⭐⭐:
bônus.

⭐⭐⭐:
bônus maior.

Chefão:
recompensa especial.

Primeira conclusão:
XP completo.

Repetição:
não permitir farm infinito.

Criar política de recompensa idempotente.

========================================================
PROGRESSÃO
========================================================

Não quero obrigatoriamente que uma criança precise tirar 100%.

A ideia é incentivar.

Nunca humilhar.

Nunca usar:

"Você falhou."

Usar:

"Quase!"
"Vamos tentar novamente?"
"Você está aprendendo!"
"Falta pouquinho!"

========================================================
CHECKPOINTS
========================================================

A cada conjunto de fases:

🚩 CHECKPOINT!

Exemplo:

Fase 5.

Mostrar:

"Você chegou ao checkpoint!"

Salvar progresso.

Dar pequena recompensa.

========================================================
BAÚS
========================================================

Adicionar ocasionalmente:

🎁 Baú da aventura

Pode aparecer após:

5 fases;
10 fases;
chefão;
3 estrelas especiais.

Pode conter:

⭐ XP
🪙 moedas, se existirem
🎩 acessório
📖 curiosidade do Foguinho
🏆 medalha

Não implementar loot boxes pagas.

Tudo conquistado através da experiência.

========================================================
CURIOSIDADES DO FOGUINHO
========================================================

Integrar com a ideia:

📖 Diário do Foguinho

Algumas fases podem desbloquear curiosidades.

Exemplo:

🎁 NOVA CURIOSIDADE!

"Quando Foguinho dorme profundamente, uma fumacinha sai do seu nariz."

[ Ver Diário ]

Criar suporte para:

id
title
description
icon/image
unlockCondition
unlockedAt

Exemplos:

🔥 Primeiro espirro

🥚 Como Foguinho nasceu

🍎 Comida favorita

😴 Como Foguinho dorme

🪽 O segredo das asas

🌙 Escamas brilhantes

☁️ Maior sonho

🎧 Música favorita

========================================================
HOME / AVENTURA
========================================================

Adicionar na Home:

🗺️ SUA AVENTURA

🐉 Foguinho

"Pedro, estamos na fase 7 da Vila da Matemática!"

⭐⭐⭐ ⭐⭐ ⭐⭐⭐ ...

Progresso:

7 / 10

[ Continuar aventura ]

========================================================
TELA /JOGOS
========================================================

Não remover a tela /jogos.

Ela continua sendo um modo de:

"Jogar livremente".

Adicionar diferenciação:

🗺️ AVENTURA
Siga a jornada, desbloqueie mundos e evolua.

🎮 JOGOS
Escolha livremente o que quer jogar.

Assim temos dois modos.

MODO AVENTURA:
progressão estruturada.

MODO LIVRE:
jogos disponíveis livremente.

========================================================
TELA INICIAL /AVENTURA
========================================================

Topo:

🗺️ Minha Aventura

"Explore, aprenda e descubra novos mundos!"

Resumo:

⭐ 47 estrelas

🏆 2 mundos concluídos

🐉 Foguinho nível 7

🔥 sequência 5

Depois:

MAPA.

========================================================
CARD DO MUNDO
========================================================

Ao tocar/clicar em um mundo:

abrir painel/modal:

🏡 Vila da Matemática

8 / 10 fases

⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

24 / 30 estrelas

Progresso:
80%

Recompensa final:

🏆 Medalha dos Números

[ Continuar ]

========================================================
TELA DA FASE
========================================================

Ao iniciar:

FASE 7

✖️ A Ponte da Multiplicação

Objetivo:

"Ajude Foguinho a atravessar a ponte!"

Progresso:

3 / 10

🐉 Foguinho aparece discretamente.

Pergunta:

6 × 4 = ?

[18]
[24]
[28]
[30]

Ao acertar:

✨ 24!

"Isso!"

+ XP

A ponte avança.

========================================================
NARRATIVA
========================================================

Cada fase deve possuir uma pequena história.

Não apenas:

"Resolva 10 contas."

Exemplo:

"A ponte da Vila perdeu alguns números.

Ajude Foguinho a encontrar as respostas para atravessar!"

Isso transforma exercício em aventura.

Criar estrutura:

title
story
objective
completionMessage

========================================================
CHEFÕES EDUCACIONAIS
========================================================

Cada mundo terá um personagem Guardião.

Exemplos:

🏡
Guardião dos Números

🌲
Coruja da Memória

🏰
Mago das Palavras

🔬
Professor Átomo

🏝️
Guardião da Ilha

Eles NÃO são inimigos.

São personagens que desafiam Pedro.

Exemplo:

"Você chegou longe, aventureiro!

Será que consegue resolver meu desafio?"

Isso evita narrativa violenta.

========================================================
TELA DE CONCLUSÃO
========================================================

Após cada fase:

🎉 FASE CONCLUÍDA!

⭐⭐⭐

9 / 10 respostas corretas

+50 XP Pedro

+30 XP Foguinho

🎁 Nova recompensa!

[ Próxima fase ]

[ Voltar ao mapa ]

Se houve desbloqueio:

🧢 Novo acessório!

ou:

📖 Nova curiosidade!

========================================================
REJOGAR
========================================================

Permitir repetir fases.

Mostrar:

Melhor resultado:
⭐⭐⭐

Melhor pontuação:
9/10

Jogadas:
3

[ Jogar novamente ]

Não retirar estrelas existentes caso o desempenho posterior seja menor.

Sempre manter:

bestScore
bestStars

========================================================
MODELOS
========================================================

Analise o backend atual antes.

Conceitualmente precisamos:

AdventureWorld

id
name
slug
description
theme
order
icon
background
unlockCondition

AdventureLevel

id
worldId
order
title
story
objective
type
difficulty
config
rewards

AdventureProgress

userId
worldId
levelId
completed
attempts
bestScore
bestStars
completedAt

AdventureReward

type
amount
referenceId

AdventureEvent

type
worldId
levelId
metadata
createdAt

Adapte ao padrão REAL do projeto.

========================================================
CONFIGURAÇÃO
========================================================

Mundos e fases precisam ser data-driven.

Evitar:

if world === 1
if level === 3

Criar configurações estruturadas.

Exemplo conceitual:

ADVENTURE_WORLDS

world:
{
 id,
 theme,
 levels,
 boss,
 rewards
}

Isso permitirá adicionar futuramente:

🌊 Reino dos Oceanos

🚀 Galáxia do Conhecimento

🦕 Vale dos Dinossauros

🎨 Reino da Criatividade

🎵 Cidade da Música

sem reconstruir o sistema.

========================================================
COMPONENTIZAÇÃO
========================================================

Sugestão conceitual:

adventure/
  pages/
    adventure-map
    adventure-level

  components/
    world-map
    map-path
    map-node
    world-details
    adventure-header
    level-intro
    level-game
    level-result
    boss-challenge
    treasure-chest
    checkpoint
    world-complete
    adventure-complete
    pet-map-companion

  services/
    adventure.service
    adventure-progress.service
    adventure-reward.service

  models/
    adventure.model

  config/
    adventure-worlds.config

Não seguir cegamente.

Adapte à arquitetura existente.

========================================================
MAPA RESPONSIVO
========================================================

Esse ponto é crítico.

DESKTOP:

Mapa amplo.

Aproveitar largura disponível.

Mostrar bastante cenário.

TABLET:

Mapa adaptado.

MOBILE:

NÃO simplesmente reduzir o mapa desktop.

Criar experiência vertical.

Exemplo:

🏡 Vila
 │
 ●
 │
 ●
 │
🐉
 │
 ●
 │
 🚩
 │
 ●
 │
👑

O usuário avança verticalmente.

Pode lembrar uma trilha de aventura.

Sem scroll horizontal.

========================================================
MOBILE FIRST
========================================================

Testar:

320px
360px
390px
430px
768px
1024px
1440px
1920px.

Garantir:

- botões grandes;
- touch;
- textos legíveis;
- mapa utilizável;
- nenhum overflow horizontal;
- animações leves;
- performance boa.

========================================================
DIREÇÃO VISUAL
========================================================

Manter identidade do site Pedro Henrique.

Referência:

- azul escuro;
- verde;
- rosa;
- amarelo;
- cards claros;
- bordas grossas;
- sombras;
- cantos arredondados;
- ilustrações infantis;
- cenários coloridos;
- tipografia amigável.

Porém:

cada mundo precisa possuir personalidade própria.

🏡 Matemática:
campo/vila alegre.

🌲 Memória:
verde/floresta mágica.

🏰 Inglês:
roxo/azul/castelo.

🔬 Ciência:
azul/ciano/laboratório.

🏝️ Desafios:
praia/tropical.

========================================================
ANIMAÇÕES
========================================================

Criar:

- mascote andando;
- mascote voando;
- estrela aparecendo;
- baú abrindo;
- bandeira levantando;
- caminho desbloqueando;
- mundo desbloqueando;
- confetes;
- evolução.

Todas leves.

Respeitar:

prefers-reduced-motion.

========================================================
ÁUDIO
========================================================

Se existir sistema de áudio:

adicionar:

fase concluída;
estrela;
baú;
checkpoint;
mundo desbloqueado;
chefão concluído.

Sempre respeitando configuração:

🔊 Som
🔇 Sem som.

Não tocar sons excessivamente.

========================================================
ACESSIBILIDADE
========================================================

Garantir:

keyboard navigation;
aria-label;
alt;
contraste;
touch targets;
focus;
reduced motion;
feedback não baseado apenas em cor.

========================================================
PERFORMANCE
========================================================

O mapa pode ter bastante ilustração.

Por isso:

- lazy loading;
- imagens otimizadas;
- WebP/AVIF quando apropriado;
- evitar assets gigantes;
- evitar bibliotecas enormes;
- carregar apenas mundo necessário quando possível;
- evitar dezenas de animações simultâneas.

========================================================
SALVAMENTO
========================================================

Progresso precisa persistir.

Salvar:

mundo atual;
fase atual;
fases concluídas;
estrelas;
melhores resultados;
recompensas;
checkpoints;
mundos desbloqueados.

Reload NÃO pode perder progresso.

========================================================
ANTI-DUPLICAÇÃO
========================================================

Cuidado com:

double click;
refresh;
replay;
request duplicada.

Não conceder:

XP
acessório
conquista
baú

duas vezes indevidamente.

========================================================
TESTES
========================================================

Criar testes para:

unlock de fases;
unlock de mundos;
cálculo de estrelas;
bestScore;
bestStars;
checkpoint;
conclusão;
recompensa;
XP;
replay;
idempotência;
chefão;
integração com mascote;
persistência.

========================================================
NOVA EXPERIÊNCIA GERAL
========================================================

Quero chegar a esta experiência:

Pedro entra no site.

HOME:

"Boa tarde, Pedro! 👋"

🐉 Foguinho:

"Estamos quase chegando ao final da Vila da Matemática!"

🗺️

FASE 8/10

[ CONTINUAR AVENTURA ]

Pedro entra.

Vê o mapa.

Foguinho está na fase 8.

Clica.

"🧩 O Mistério das Contas"

Resolve 10 desafios.

Consegue:

⭐⭐⭐

Tela comemora.

+50 XP Pedro
+30 XP Foguinho

🎁 BAÚ!

Abre.

🧢
"Você desbloqueou um novo boné para Foguinho!"

Foguinho anda pelo mapa.

FASE 9 desbloqueada.

Pedro conclui.

Chega na fase 10.

👑

GUARDIÃO DOS NÚMEROS

Completa o grande desafio.

🎉🎉🎉

VILA DA MATEMÁTICA CONCLUÍDA!

🏆 Medalha dos Números

O mapa começa a se mover.

Uma floresta aparece.

🌲

NOVO MUNDO DESBLOQUEADO!

FLORESTA DA MEMÓRIA

Foguinho:

"Uau, Pedro! Vamos descobrir o que existe naquela floresta?"

[ COMEÇAR NOVA AVENTURA ]

Esse é o nível de experiência que quero.

========================================================
FASES DE DESENVOLVIMENTO
========================================================

FASE 1
Analisar arquitetura e elaborar integração.

FASE 2
Models/configurações/progresso.

FASE 3
Mapa principal responsivo.

FASE 4
Vila da Matemática completa.

FASE 5
Sistema de fases/estrelas/recompensas.

FASE 6
Integração com Foguinho.

FASE 7
Floresta da Memória.

FASE 8
Castelo do Inglês.

FASE 9
Laboratório da Ciência.

FASE 10
Ilha dos Desafios.

FASE 11
Chefões educacionais.

FASE 12
Baús/checkpoints/conquistas.

FASE 13
Diário/curiosidades Foguinho.

FASE 14
Animações/áudio.

FASE 15
Mobile/responsividade/acessibilidade.

FASE 16
Testes/build/revisão.

IMPORTANTE:

Não tente resolver arquitetura ruim rapidamente apenas para entregar.

Primeiro crie uma base reutilizável.

A Vila da Matemática deve funcionar como primeiro "template de mundo".

Depois os outros mundos devem utilizar a mesma engine.

========================================================
ENTREGA FINAL
========================================================

Ao finalizar:

1. Liste arquivos criados.
2. Liste arquivos modificados.
3. Explique arquitetura.
4. Explique engine de mundos.
5. Explique progressão.
6. Explique estrelas.
7. Explique recompensas.
8. Explique integração com Foguinho.
9. Explique como adicionar mundo.
10. Explique como adicionar fase.
11. Explique como adicionar chefão.
12. Explique como adicionar recompensa.
13. Informe migrations.
14. Rode lint.
15. Rode testes.
16. Rode build.
17. Corrija todos os erros.
18. Verifique regressões.
19. Teste desktop/mobile.
20. Não considere concluído com erro TypeScript/build.

OBJETIVO FINAL:

Não quero apenas "mais jogos".

Quero transformar o Pedro Henrique em um pequeno universo educativo:

PEDRO
+
🐉 FOGUINHO
+
🗺️ AVENTURA
+
🎮 JOGOS
+
⭐ XP
+
⭐⭐⭐ ESTRELAS
+
🎁 RECOMPENSAS
+
🏆 CONQUISTAS
+
📖 DESCOBERTAS
+
🌎 NOVOS MUNDOS

Aprender precisa parecer uma aventura.
Pedro Henrique --- Plano Mestre da Plataforma Infantil

Documento de produto e desenvolvimento incremental
Objetivo: transformar o site atual em um universo infantil de
aprendizagem, aventura, criatividade e evolução, construído passo a
passo sem perder a simplicidade.

1. Visão do produto

O projeto Pedro Henrique deve evoluir de um conjunto de páginas e
minijogos para uma plataforma infantil integrada, em que aprender,
brincar, criar e explorar fazem parte da mesma jornada.
  
A criança não deve sentir que está apenas respondendo exercícios. A
experiência deve transmitir:

"Estou vivendo uma aventura, meu personagem está evoluindo comigo e
sempre existe alguma coisa nova para descobrir."

A plataforma terá quatro pilares:

Aprender --- Matemática, Português, Inglês, Memória, Lógica,
Ciências e outras habilidades.

Explorar --- mundos, fases, desafios, missões e descobertas.

Evoluir --- nível, XP, moedas, estrelas, mascote, conquistas e
coleção.

Criar --- desenhos, histórias, experiências e atividades fora da
tela.

2. Loop principal da experiência

A arquitetura de gamificação deve conectar todos os módulos.

ENTRAR
  ↓
VER MISSÃO / CONTINUAR AVENTURA
  ↓
JOGAR OU REALIZAR ATIVIDADE
  ↓
APRENDER
  ↓
GANHAR XP + MOEDAS + ESTRELAS
  ↓
EVOLUIR
  ↓
DESBLOQUEAR MASCOTE / ITEM / MUNDO / CONQUISTA
  ↓
PERSONALIZAR / DESCOBRIR
  ↓
VOLTAR PARA NOVA AVENTURA

Nenhuma recompensa deve depender de pagamento com dinheiro real.

3. Home V2 --- Central da aventura

A Home deve funcionar como o ponto de partida do dia.

Cabeçalho de progresso

Exemplo:

👋 Olá, Pedro!

🔥 5 dias     ⭐ Nível 8     🪙 1.250     🐉 Foguinho Nível 7

Bloco principal

🗺️ CONTINUE SUA AVENTURA

🏡 Vila da Matemática
Fase 8 de 10

🧩 O Mistério das Contas

⭐⭐⭐ ⭐⭐ ⭐⭐⭐

[ CONTINUAR AVENTURA ]

Missões de hoje

Mostrar três missões rápidas:

🎯 Acerte 5 contas.

🧠 Complete uma rodada de memória.

🇬🇧 Aprenda 3 palavras em inglês.

Ao completar todas:

🎁 BAÚ DO DIA

Acesso rápido

🗺️ Aventura

🎮 Jogos

🐉 Mascote

🎯 Missões

🏆 Conquistas

🏠 Meu Quarto

🎨 Oficina

🖼️ Galeria

4. 🗺️ Mapa da Aventura

Objetivo

Transformar atividades educacionais em uma campanha visual.

Rota sugerida:

/aventura

A página /jogos continua existindo como Modo Livre.

Mundos iniciais

1. 🏡 Vila da Matemática

Conteúdos:

soma;

subtração;

sequências;

multiplicação;

tabuada;

problemas;

raciocínio numérico.

Exemplo de progressão:

A Praça das Somas

A Ponte da Subtração

O Caminho dos Números

Sequência Perdida

Checkpoint da Vila

Primeiras Multiplicações

A Ponte da Tabuada

Mistério das Contas

Superdesafio

Guardião dos Números

Fase 10 é o grande desafio do mundo.

2. 🌲 Floresta da Memória

Habilidades:

pares;

memória visual;

posições;

sequências;

padrões;

atenção;

velocidade de reconhecimento.

Desafio final:

Coruja da Memória

3. 🏰 Castelo do Inglês

Habilidades:

animais;

cores;

números;

família;

objetos;

alimentos;

casa;

frases simples.

Toda navegação continua em PT-BR. O inglês aparece apenas como conteúdo
educativo.

Desafio final:

Mago das Palavras

4. 🔬 Laboratório da Ciência

Conteúdos:

animais;

natureza;

planeta Terra;

espaço;

água;

clima;

corpo humano básico;

energia;

experiências simples.

Adicionar cards de:

💡 Você sabia?

5. 🏝️ Ilha dos Desafios

Mistura conteúdos anteriores:

Matemática;

Memória;

Inglês;

Ciências;

Lógica.

Final:

O Grande Desafio

Fases

Cada mundo começa com aproximadamente 10 fases, mas a arquitetura deve
suportar 20, 30 ou mais sem alteração estrutural.

Estados:

🔒 Bloqueada

⚪ Disponível

🐉 Atual

✅ Concluída

⭐ Perfeita

Cada fase possui:

título;

pequena narrativa;

objetivo;

atividade;

dificuldade;

recompensa;

resultado;

melhor pontuação;

estrelas.

Sistema de estrelas

Cada fase concede até três estrelas.

Sugestão inicial:

⭐ concluiu;

⭐⭐ bom desempenho;

⭐⭐⭐ excelente desempenho.

As regras devem ser configuráveis por atividade.

Nunca remover estrelas já conquistadas se uma tentativa posterior tiver
resultado inferior.

Checkpoints

A cada bloco importante:

🚩 CHECKPOINT!

Você chegou a uma nova parte da aventura!

Pode liberar:

XP;

moedas;

curiosidade;

item;

pequena comemoração.

Desafios finais

Não usar combate ou violência.

Os "chefões" são Guardiões Educacionais.

Exemplo:

"Você chegou longe, aventureiro! Está preparado para o meu desafio?"

Cada Guardião testa as habilidades aprendidas naquele mundo.

5. 🏠 Meu Quarto / Minha Base

Conceito

Criar um espaço virtual que pertence à criança.

Rota:

/meu-quarto

O quarto começa simples e evolui conforme Pedro progride.

Elementos personalizáveis

cama;

mesa;

computador;

videogame;

luminária;

tapete;

papel de parede;

pôster;

estante;

troféus;

plantas;

bichinhos;

iluminação;

objetos especiais.

Economia

Itens são obtidos usando moedas conquistadas no site.

Exemplo:

🪙 Saldo: 1.250

🎮 Videogame
600 moedas

[ DESBLOQUEAR ]

Não usar dinheiro real.

Troféus

Conquistas importantes podem aparecer fisicamente no quarto.

Exemplo:

Medalha da Matemática;

Troféu da Memória;

Mestre Aventureiro;

troféus de sequência;

itens de eventos.

Isso cria ligação entre módulos.

6. 🐣 Mascote Evolutivo

Conceito

O mascote é o companheiro permanente da criança.

Opções iniciais:

🐉 Dragão;

🤖 Robô;

🦖 Dinossauro;

🐶 Cachorro.

A criança escolhe e dá um nome.

Exemplo:

Foguinho --- Dragão

Evoluções

Bebê

Jovem

Adulto

Lendário

O visual deve realmente evoluir, não apenas aumentar de tamanho.

XP

O mascote recebe XP por atividades reais:

resposta correta;

fase concluída;

missão;

conquista;

desafio final;

sequência.

Presença nos jogos

O mascote aparece discretamente para incentivar.

Acerto:

"Isso! Você conseguiu! 🎉"

Erro:

"Quase! Vamos tentar outra vez?"

Sequência:

"Uau! Você está voando! 🚀"

Interações

🍎 Dar lanche

⚽ Brincar

❤️ Fazer carinho

💬 Conversar

🌙 Descansar

Não criar punição por ficar dias sem acessar.

7. 📖 Diário do Foguinho

Uma expansão do sistema de mascote.

A criança desbloqueia curiosidades conforme progride.

Exemplos:

🥚 Como Foguinho nasceu.

🔥 Seu primeiro espirro.

🍎 Sua comida favorita.

😴 Como ele dorme.

🪽 O segredo das asas.

🌙 Por que suas escamas brilham.

☁️ Seu maior sonho.

🎧 Sua música favorita.

Exemplo:

📖 NOVA DESCOBERTA!

🔥 O primeiro espirro

O primeiro espirro de Foguinho
soltou uma pequena faísca!

[ GUARDAR NO DIÁRIO ]

Algumas curiosidades podem permanecer ocultas:

🔒 Curiosidade secreta
Descubra no nível 15.

8. 🎯 Missões Diárias

Objetivo

Criar motivo saudável para voltar ao site sem exigir sessões longas.

Mostrar três missões por dia.

Exemplo:

🎯 MISSÕES DE HOJE

✅ Acerte 5 contas
   +20 XP

⬜ Complete uma rodada de memória
   +30 XP

⬜ Aprenda 3 palavras em inglês
   +20 XP

Ao completar todas:

🎁 BAÚ DO DIA

Possíveis recompensas:

moedas;

XP;

XP do mascote;

acessório;

decoração;

curiosidade;

medalha especial.

Regras

Missões devem variar.

Evitar obrigar a criança a repetir sempre a mesma atividade.

9. 🌟 Desafio do Dia

Além das três missões, existir um desafio surpresa.

Exemplo de rotação:

segunda: Matemática;

terça: Memória;

quarta: Inglês;

quinta: Lógica;

sexta: Ciências;

sábado: Criatividade;

domingo: aventura especial.

O objetivo é incentivar variedade.

10. 🏆 Conquistas e Medalhas

Rota:

/conquistas

Categorias:

Aprendizado

Aventura

Mascote

Sequência

Criatividade

Exploração

Conquistas secretas

Exemplos:

🌱 Primeiro Passo

Conclua sua primeira atividade.

⭐ Primeiros 100

Consiga 100 pontos.

🔥 Em Chamas

Acerte 10 desafios consecutivos.

🧠 Supercérebro

Complete 100 atividades.

➕ Mestre da Matemática

Complete desafios especiais de Matemática.

🐉 Melhor Amigo

Interaja 20 vezes com seu mascote.

🗺️ Explorador

Conclua seu primeiro mundo.

👑 Mestre Aventureiro

Complete a Grande Jornada.

Progresso

Exemplo:

🧠 Supercérebro

68 / 100 atividades

██████████████░░░░

11. 🧠 Aprendizado Adaptativo

Este módulo deve ser tratado como parte central da evolução futura.

Objetivo

A dificuldade deve acompanhar o desempenho real da criança.

Não basta aumentar o nível apenas pelo número de partidas.

Dados observados

Por habilidade:

quantidade de respostas;

acertos;

erros;

tempo médio;

sequência;

dificuldade atual;

evolução recente.

Exemplo

Se Pedro tiver:

Soma
94% de acerto

Subtração
82%

Multiplicação
51%

O sistema pode:

aumentar gradualmente a dificuldade de soma;

manter subtração;

gerar exercícios mais acessíveis de multiplicação;

oferecer prática adicional.

Importante

Nunca comunicar:

"Você é ruim em multiplicação."

Preferir:

"Vamos treinar mais um pouquinho multiplicação?"

Conceito de domínio

Cada habilidade pode possuir uma pontuação interna:

Soma             ██████████  92%
Subtração        ████████░░  78%
Multiplicação    █████░░░░░  51%
Memória          █████████░  86%

Essa informação completa é mais adequada à Área dos Pais.

12. 🎨 Oficina Criativa

Rota:

/oficina

Objetivo: oferecer atividades sem resposta certa ou errada.

Módulos futuros:

🎨 Desenhar

Canvas infantil.

🖌️ Pintar

Desenhos para colorir.

🦸 Criar personagem

Escolher rosto, cabelo, roupa, poderes e nome.

💬 História em quadrinhos

Montar quadrinhos usando personagens e balões.

📖 Complete a história

O sistema inicia e Pedro continua.

🚀 Desafio criativo

Exemplo:

"Desenhe um planeta onde moram robôs."

Integração com Galeria

Ao terminar:

[ SALVAR NA GALERIA ]

A Galeria existente passa a ser uma memória das criações.

13. 🔬 Missões Fora da Tela

Rota possível:

/missoes

Categoria:

🌎 Missões do Mundo Real

Objetivo: fazer a plataforma incentivar atividades longe da tela.

Exemplos:

🔵 Caçador de cores

Encontre 3 objetos azuis.

📏 Pequeno cientista

Meça uma mesa.

🪟 Observador

Conte quantas janelas existem na casa.

🎨 Minha família

Faça um desenho da sua família.

🌱 Cientista da natureza

Plante um feijão e acompanhe por sete dias.

🌤️ Detetive do clima

Observe o céu e descreva o clima.

Aprovação

Algumas atividades podem possuir:

[ CONCLUÍ A MISSÃO ]

E, quando necessário:

👨‍👩‍👦 Confirmar com responsável

Após confirmação:

XP;

moedas;

conquista;

item.

14. 📊 Área dos Pais

Rota protegida:

/pais

Essa interface NÃO precisa ter o mesmo formato infantil das telas da
criança.

Pode ser limpa, simples e objetiva.

Dashboard

Mostrar:

tempo de uso;

atividades realizadas;

nível;

evolução semanal;

acertos;

dificuldades;

habilidades;

mundos;

missões;

conquistas;

evolução do mascote.

Exemplo:

Resumo da semana

⏱️ 2h 35min de atividades
🎮 42 desafios
⭐ 1.250 XP
🏆 3 conquistas

Habilidades

Matemática      82%
Memória         91%
Inglês          74%
Lógica          79%
Ciências        86%

Insights

Gerar frases baseadas em dados:

"Pedro apresentou ótima evolução em soma nesta semana."

"Multiplicação pode receber um pouco mais de prática."

Nunca criar diagnósticos médicos, psicológicos ou educacionais.

São apenas observações do uso da plataforma.

Controle dos responsáveis

Possibilidades futuras:

limite diário;

horário de uso;

som;

notificações;

conteúdo;

aprovação de atividades fora da tela.

15. 🪙 Economia e recompensas

Criar uma economia única.

Principais recursos:

⭐ XP

Representa evolução geral.

🪙 Moedas

Usadas para desbloquear itens cosméticos.

⭐ Estrelas da Aventura

Representam desempenho nas fases.

🏆 Conquistas

Marcos importantes.

Não criar várias moedas desnecessárias.

Fontes de moedas

fases;

missões;

desafios;

conquistas;

checkpoints;

baús.

Gastos

quarto;

acessórios do mascote;

avatar;

itens cosméticos.

16. 🎁 Sistema de recompensas

Criar uma camada central de recompensas.

Uma atividade pode conceder:

+ 50 XP
+ 30 moedas
+ 25 XP Foguinho
⭐⭐⭐

E eventualmente:

🎁 ITEM DESBLOQUEADO
🧢 Boné Azul

A lógica de recompensa não deve ficar espalhada por cada componente.

17. 🎒 Inventário

Criar futuramente um inventário compartilhado.

Categorias:

Mascote

Quarto

Avatar

Troféus

Colecionáveis

Estados:

bloqueado;

desbloqueado;

equipado;

novo.

18. 👦 Avatar do Pedro

Além do mascote, Pedro pode possuir um avatar infantil.

Personalizações:

cabelo;

camiseta;

calça;

tênis;

boné;

mochila;

acessórios.

O avatar pode aparecer:

mapa;

perfil;

quarto;

conquistas;

certificados.

Não precisa entrar na primeira fase de desenvolvimento.

19. 🌟 A Grande Jornada

Este é o sistema que conecta todos os módulos.

A jornada não é uma página isolada.

Ela representa o progresso global.

PEDRO
  +
🐉 FOGUINHO
  +
🗺️ MUNDOS
  +
🎮 JOGOS
  +
🎯 MISSÕES
  +
⭐ XP
  +
🪙 MOEDAS
  +
⭐⭐⭐ ESTRELAS
  +
🎁 RECOMPENSAS
  +
🏆 CONQUISTAS
  +
🏠 QUARTO
  +
🎨 CRIAÇÕES
  +
📖 DESCOBERTAS

20. Marcos de nível

A cada 10 níveis criar uma celebração especial.

Exemplo:

✨ NÍVEL 10! ✨

Que aventura incrível!

🎉🎈⭐

Você desbloqueou:

🏆 Medalha
🎁 Item especial
📖 Novo capítulo

Marcos:

nível 10;

nível 20;

nível 30;

nível 40;

nível 50.

21. Capítulos da história

A evolução global pode possuir capítulos.

Exemplo:

Capítulo 1 --- O começo da aventura

Pedro conhece Foguinho.

Capítulo 2 --- O segredo da Vila

Concluir Vila da Matemática.

Capítulo 3 --- A floresta misteriosa

Entrar na Floresta da Memória.

Capítulo 4 --- O Castelo

Explorar Inglês.

Capítulo 5 --- O Laboratório

Descobrir Ciências.

Capítulo 6 --- A Ilha

Enfrentar o Grande Desafio.

Isso cria narrativa sem exigir um jogo complexo.

22. Certificados

Ao atingir grandes marcos, gerar certificados digitais.

Exemplos:

Mestre da Matemática;

Explorador da Memória;

Aventureiro do Inglês;

Pequeno Cientista;

Mestre Aventureiro.

O certificado pode possuir:

nome;

data;

conquista;

estrelas;

mascote;

visual para imprimir.

23. Eventos especiais

Arquitetura preparada para eventos futuros:

aniversário;

Natal;

Páscoa;

férias;

volta às aulas;

Halloween sem conteúdo assustador;

aniversário do mascote.

Podem liberar missões e itens temporários, sem criar pressão de compra.

24. Segurança e experiência infantil

Princípios obrigatórios:

sem anúncios;

sem compras dentro da experiência infantil;

sem chat público;

sem ranking público;

sem comparação humilhante;

sem punição por ausência;

sem streak que gere culpa;

sem dark patterns;

sem links externos inesperados;

linguagem positiva;

dados dos pais separados da interface infantil.

25. Sistema de eventos interno

Os módulos não devem ficar fortemente acoplados.

Criar eventos de domínio semelhantes a:

ANSWER_CORRECT
ANSWER_WRONG
GAME_COMPLETED
LEVEL_COMPLETED
WORLD_COMPLETED
DAILY_MISSION_COMPLETED
ACHIEVEMENT_UNLOCKED
PET_LEVEL_UP
PET_EVOLVED
ITEM_UNLOCKED
REAL_WORLD_MISSION_COMPLETED
CREATION_SAVED

Consumidores podem reagir:

LEVEL_COMPLETED
      ↓
AdventureProgress
      ↓
RewardEngine
      ↓
XP
Coins
Pet XP
Achievement Progress
Adaptive Learning
Parent Analytics

26. Engine de recompensas

Criar um serviço central conceitual:

RewardEngine

Responsabilidades:

XP;

moedas;

XP do mascote;

itens;

conquistas;

estrelas;

prevenção de recompensa duplicada.

Toda recompensa relevante deve possuir uma chave/idempotency key.

Isso evita ganhar recompensa novamente atualizando a página.

27. Engine de progressão

Criar um conceito único de progresso.

Exemplo:

PlayerProgress
- level
- xp
- coins
- streak
- totalActivities
- totalCorrectAnswers
- worldsCompleted
- stars

Mascote possui progressão própria, mas relacionada.

28. Analytics educacional

Registrar somente o necessário para evolução pedagógica e Área dos Pais.

Exemplo:

LearningAttempt
- skill
- topic
- difficulty
- correct
- responseTime
- createdAt

A partir disso calcular:

taxa de acerto;

domínio;

tendência;

dificuldade recomendada.

Não armazenar dados desnecessários.

29. Estrutura sugerida de navegação

Desktop:

🏠 Início
🗺️ Aventura
🎮 Jogos
🐉 Mascote
🎯 Missões
🎨 Criar
🖼️ Galeria
••• Mais

Dentro de "Mais":

🏠 Meu Quarto

🏆 Conquistas

📖 História/Diário

💡 Ideias

🎥 Vídeos

A navegação real deve ser adaptada ao espaço disponível.

No mobile usar barra inferior com 4--5 itens principais e menu "Mais".

30. Roadmap de desenvolvimento

Não desenvolver tudo simultaneamente.

FASE 0 --- Fundação

Antes de novos módulos:

revisar arquitetura;

unificar progresso;

definir eventos;

definir RewardEngine;

organizar persistência;

preparar models;

revisar responsividade;

garantir testes.

Objetivo: criar fundação que evite retrabalho.

FASE 1 --- Mascote

Status: prioridade imediata.

Entregas:

escolha;

nome;

XP;

níveis;

evolução;

interações;

presença nos jogos;

acessórios básicos;

curiosidades;

Diário do Foguinho.

Resultado:

Pedro passa a ter um companheiro permanente.

FASE 2 --- Mapa da Aventura

Começar apenas pela:

🏡 Vila da Matemática.

Entregas:

engine de mundos;

mapa;

fases;

estrelas;

progresso;

narrativa;

Guardião;

recompensas;

integração com Foguinho.

Depois validar.

Só então criar os outros mundos.

FASE 3 --- Missões + Desafio do Dia

Entregas:

3 missões;

geração diária;

progresso;

baú;

recompensas;

desafio surpresa.

FASE 4 --- Economia

Entregas:

moedas;

carteira;

RewardEngine completo;

inventário;

histórico de recompensas.

FASE 5 --- Meu Quarto

Entregas:

quarto base;

catálogo;

desbloqueio;

posicionamento;

personalização;

troféus.

FASE 6 --- Conquistas

Entregas:

catálogo;

progresso;

categorias;

conquistas secretas;

integração com todos os eventos.

FASE 7 --- Aprendizado Adaptativo

Entregas:

LearningAttempt;

skill mastery;

regras iniciais;

geração de dificuldade;

relatórios.

Começar simples e baseado em regras.

Não começar com IA complexa.

FASE 8 --- Área dos Pais

Agora já existirão dados suficientes.

Entregas:

dashboard;

tempo;

habilidades;

evolução;

insights;

configurações.

FASE 9 --- Oficina Criativa

Entregas:

desenho;

pintura;

desafios;

salvar na Galeria.

Depois expandir para histórias e quadrinhos.

FASE 10 --- Mundo Real

Entregas:

catálogo;

atividades;

conclusão;

confirmação;

XP;

conquistas.

FASE 11 --- Grande Jornada

Conectar tudo:

capítulos;

grandes marcos;

certificados;

finais de mundos;

evolução narrativa;

celebrações.

31. Ordem recomendada

FUNDAÇÃO
   ↓
🐉 MASCOTE
   ↓
🗺️ VILA DA MATEMÁTICA
   ↓
🎯 MISSÕES
   ↓
🪙 ECONOMIA
   ↓
🏠 QUARTO
   ↓
🏆 CONQUISTAS
   ↓
🌲🏰🔬🏝️ OUTROS MUNDOS
   ↓
🧠 APRENDIZADO ADAPTATIVO
   ↓
📊 PAIS
   ↓
🎨 OFICINA
   ↓
🌎 MUNDO REAL
   ↓
🌟 GRANDE JORNADA

32. Critérios globais de qualidade

Cada funcionalidade deve:

ser mobile-first;

funcionar de 320px a telas grandes;

não possuir scroll horizontal acidental;

ter estados loading/empty/error;

possuir feedback claro;

ser acessível;

funcionar com teclado quando aplicável;

respeitar prefers-reduced-motion;

manter PT-BR;

reutilizar componentes;

evitar regras hardcoded;

possuir models tipados;

possuir testes;

passar lint;

passar build;

persistir corretamente;

não duplicar recompensa.

33. Direção visual

Manter a identidade atual:

fundo claro;

azul escuro/roxo para contornos;

verde;

rosa;

amarelo;

azul;

cards arredondados;

sombras;

ilustrações amigáveis;

animações leves.

Objetivo visual:

infantil premium, e não dashboard corporativo.

Cada área pode ter identidade própria sem perder consistência.

34. Métricas internas úteis

Não focar apenas em "tempo de tela".

Acompanhar:

atividades concluídas;

habilidades praticadas;

variedade de conteúdos;

evolução por habilidade;

fases;

estrelas;

mundos;

criações;

atividades fora da tela.

O produto deve recompensar aprendizado e exploração, não simplesmente
permanecer conectado.

35. Visão final

Quando todos os módulos estiverem integrados, a experiência deve ser:

Pedro abre o site.

👋 Olá, Pedro!

🐉 Foguinho:
"Temos uma nova aventura hoje!"

🎯 Missão:
Complete a fase 8 da Vila.

Pedro entra no mapa.

🗺️

Completa uma atividade.

⭐⭐⭐

+50 XP
+30 moedas
+25 XP Foguinho

Foguinho sobe de nível.

🎁 Novo item desbloqueado.

Pedro coloca o item no mascote.

Depois usa moedas para comprar uma luminária
para seu quarto.

🏆 Uma conquista é liberada.

O sistema percebe evolução em soma
e prepara uma atividade um pouco mais difícil.

Na Área dos Pais aparece:

"Pedro avançou em Matemática nesta semana."

No dia seguinte existe uma nova missão.

A história continua.

36. Princípio principal

Todas as novas funcionalidades precisam responder a pelo menos uma
destas perguntas:

Isso ajuda Pedro a aprender?

Isso ajuda Pedro a criar?

Isso incentiva Pedro a explorar?

Isso torna a evolução visível e divertida?

Isso ajuda os responsáveis a acompanhar sem pressionar?

Se a resposta for não para todas, provavelmente não precisamos da
funcionalidade.

37. Próximo passo prático

A implementação deve continuar incrementalmente.

Sprint atual

Mascote Evolutivo + Diário do Foguinho

Sprint seguinte

Fundação do Mapa da Aventura + Vila da Matemática

Depois

Missões Diárias + Desafio do Dia

A cada sprint:

analisar código existente;

definir models;

implementar;

testar;

validar desktop;

validar mobile;

rodar lint;

rodar testes;

rodar build;

somente depois iniciar o próximo módulo.

Resultado esperado

O objetivo não é construir dez funcionalidades separadas.

O objetivo é construir um único universo conectado.

Aprender é a aventura. Foguinho é o companheiro. O progresso conta a
história.
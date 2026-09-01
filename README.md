# Pedro Henrique · Site pessoal

Site infantil, colorido e animado do Pedro Henrique (7 anos), construído em **Angular 20 +
TypeScript strict**, 100% front-end e sem backend.

O projeto é uma landing page completa com navegação para seis seções internas — prancha de falar,
galeria, história, ideias, jogos e vídeos — incluindo quatro jogos jogáveis, uma prancha de
comunicação que fala em voz alta e uma área de upload de vídeos que roda inteiramente no navegador.

---

## Índice

- [Destaques](#destaques)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Arquitetura](#arquitetura)
- [Seções do site](#seções-do-site)
- [Prancha de falar](#prancha-de-falar)
- [Modo calmo](#modo-calmo)
- [Como funciona o upload de vídeos](#como-funciona-o-upload-de-vídeos)
- [Design system](#design-system)
- [Acessibilidade](#acessibilidade)
- [Como editar o conteúdo](#como-editar-o-conteúdo)
- [Testes](#testes)
- [Deploy](#deploy)
- [Próximas seções possíveis](#próximas-seções-possíveis)

---

## Destaques

- **Landing page completa**: hero, apresentação, "do meu jeito" (autismo e terapias), superpoderes,
  família, cartões de exploração, favoritos, medalhas, contagem regressiva do aniversário e mural
  de recados.
- **Prancha de comunicação que fala**: 80 cartões em 8 grupos, frase montada por toques e voz do
  próprio navegador (Web Speech API), com caderninho de frases favoritas.
- **Modo calmo**: um botão no cabeçalho troca o site inteiro por cores dessaturadas e sem
  movimento, para dias de sobrecarga sensorial. Já vem ligado para quem pede menos animação no
  sistema operacional.
- **Zero backend**: dados editoriais em TypeScript, vídeos no IndexedDB e recados no
  `localStorage`. Publica em qualquer host estático.
- **Quatro jogos reais**: jogo da memória, jogo da velha, a Trilha dos feijões (com adversário ou
  em dupla) e um quiz com sorteio de perguntas.
- **Upload de vídeos**: arrastar e soltar, miniatura gerada por `<canvas>`, duração detectada
  automaticamente, busca, ordenação e exclusão com confirmação.
- **Sem dependências extras**: apenas Angular e RxJS. Nenhuma biblioteca de UI, animação, ícones
  ou datas foi adicionada.
- **Idade sempre correta**: derivada da data de nascimento, nunca digitada à mão.

---

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Angular 20 (standalone components, sem NgModules) |
| Linguagem | TypeScript 5.8 em modo strict |
| Reatividade | Signals (`signal`, `computed`, `input`, `output`, `toSignal`) |
| Estilos | SCSS + CSS custom properties |
| Persistência | IndexedDB (vídeos) e `localStorage` (recados, frases favoritas, modo calmo) |
| Voz | Web Speech API (`speechSynthesis`), nativa do navegador |
| Testes | Karma + Jasmine |

Requisitos: **Node.js 20.19+, 22.12+ ou 24+** e npm.

---

## Como rodar

```bash
npm install
npm start
```

A aplicação sobe em `http://localhost:4200/`.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Build de produção em `dist/pedro-henrique` |
| `npm run watch` | Build de desenvolvimento em modo watch |
| `npm test` | Testes unitários (Karma) |
| `npx ng test --watch=false --browsers=ChromeHeadless` | Testes em CI |

---

## Estrutura de pastas

```
src/
├─ styles/                    Tokens, modo calmo, mixins e keyframes globais (SCSS)
├─ styles.scss                Reset, utilitários e classes base (.button, .field, .container)
├─ index.html                 Metadados, fontes e placeholder de carregamento
└─ app/
   ├─ app.ts | app.html       Shell: skip link, header, <router-outlet>, footer
   ├─ app.config.ts           Providers: router, locale pt-BR, TitleStrategy
   ├─ app.routes.ts           Rotas, títulos e meta descriptions (lazy loading)
   ├─ core/
   │  ├─ data/                Conteúdo editorial (perfil, galeria, história, ideias, quiz, prancha)
   │  ├─ models/              Interfaces e tipos do domínio
   │  ├─ services/            IndexedDB, vídeos, mural, fala, frases, modo calmo, TitleStrategy
   │  ├─ theme/               Mapa de cores do tema em TypeScript
   │  └─ utils/               Funções puras (datas, formatação, frase, embaralhar, SVG, metadados)
   ├─ shared/
   │  ├─ components/          section-heading, page-intro, empty-state
   │  ├─ directives/          reveal.directive (animação ao entrar na viewport)
   │  └─ pipes/               duration, fileSize
   ├─ layout/                 site-header (menu responsivo), calm-mode-toggle e site-footer
   └─ features/
      ├─ home/                Página + 8 componentes de seção
      ├─ communication/       Prancha de falar + phrase-bar
      ├─ gallery/             Grade com filtros e lightbox
      ├─ story/               Linha do tempo
      ├─ ideas/               Cartões de invenções com filtro por status
      ├─ games/               Abas + memory-game, tic-tac-toe, quiz-game
      ├─ videos/              Página + video-upload-form + video-card
      └─ not-found/           Página 404
```

---

## Arquitetura

**Regras que o código segue de ponta a ponta:**

1. **Standalone + OnPush em todo componente.** Nenhum NgModule, nenhuma detecção de mudanças
   padrão.
2. **Estado em signals.** Serviços expõem signals somente leitura (`asReadonly()`); a UI nunca
   escreve direto no estado.
3. **`core/` não conhece `features/`.** A dependência é sempre de fora para dentro:
   `features → shared → core`.
4. **Conteúdo separado de apresentação.** Textos, listas e dados vivem em `core/data/`; os
   componentes só renderizam.
5. **Lógica de negócio em funções puras.** Regras testáveis (idade, formatação, IA do jogo da
   velha) ficam fora dos componentes, em `core/utils/` ou em arquivos `*.logic.ts`.
6. **Lazy loading por rota.** Cada página tem seu próprio chunk; o bundle inicial fica em torno
   de 91 kB transferidos.
7. **Sem `any`.** `strict`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` e
   `strictTemplates` estão todos ligados.

**Título e SEO por rota** são resolvidos por `SiteTitleStrategy`, que lê `title` e
`data.description` de `app.routes.ts` e atualiza `<title>`, `meta[name=description]` e
`og:description` a cada navegação.

---

## Seções do site

| Rota | Página | O que tem |
| --- | --- | --- |
| `/` | Início | Hero animado, "quem sou eu", "do meu jeito", superpoderes com barras, família, cartões de exploração, favoritos, medalhas, contagem regressiva do aniversário e mural de recados |
| `/falar` | Prancha de falar | 80 cartões em 8 grupos, frase montada por toques, leitura em voz alta e frases favoritas |
| `/galeria` | Galeria | 12 lembranças com filtro por categoria e lightbox (`<dialog>` nativo) |
| `/historia` | História | Linha do tempo de 2019 a 2026, com destaques por ano |
| `/ideias` | Ideias | Invenções com status (sonhando, desenhando, construindo, pronta), materiais e filtro |
| `/jogos` | Jogos | Abas com jogo da memória, jogo da velha, Trilha dos feijões e quiz |
| `/videos` | Vídeos | Upload com título, descrição e data; cards com busca, ordenação e exclusão |

As imagens da galeria são **SVGs gerados em runtime** (`core/utils/illustration.ts`): o
repositório não carrega binários e a galeria já nasce colorida. Para usar fotos reais, basta
trocar `imageUrl` em `core/data/gallery.data.ts` por um caminho em `public/`.

---

## Prancha de falar

Comunicação aumentativa e alternativa (CAA) rodando no navegador, sem app e sem backend.

**Como funciona:**

1. Os cartões vêm de `core/data/communication.data.ts` — 80 palavras em 8 grupos (respostas,
   começos de frase, como eu estou, eu preciso, comidas, lugares, pessoas e brincar).
2. Cada toque **fala a palavra na hora** e a acrescenta à faixa da frase, no topo da página.
3. `buildPhraseText` (`core/utils/phrase.ts`) junta as palavras, coloca a maiúscula inicial e
   fecha com ponto — sem a pontuação, o sintetizador lê a frase como uma lista.
4. **Falar** lê a frase inteira; **Guardar** manda a frase para o caderninho de favoritas, que
   vive no `localStorage` e guarda no máximo 12 frases.
5. Tocar em um cartão já colocado o tira da frase.

**Quem fala** é o `SpeechService`, sobre o `speechSynthesis` do próprio navegador: ele escolhe a
melhor voz em `pt-BR` disponível no aparelho, cancela a fala anterior a cada novo toque e reduz a
velocidade quando o modo calmo está ligado. Em navegadores sem suporte, a página avisa e continua
servindo como prancha visual — a frase ainda é montada e mostrada.

Para trocar as palavras, basta editar `communication.data.ts`: nenhum componente conhece o
conteúdo dos cartões.

---

## Modo calmo

Um interruptor sensorial para o site inteiro, no cabeçalho e fora do menu retrátil — quem precisa
baixar o volume visual da página não deveria ter que abrir um menu animado antes.

Ligado, ele:

- troca a paleta por versões dessaturadas (mais escuras de propósito, para não perder contraste
  com o texto branco);
- apaga os degradês de fundo da página;
- zera animações, transições e a transição de rota do router;
- aumenta a entrelinha do texto;
- deixa a fala da prancha mais devagar.

Toda a variação vive em `styles/_calm.scss`, redefinindo os mesmos tokens de `_tokens.scss`.
Nenhum componente sabe que o modo existe: o `CalmModeService` só publica o atributo `data-calm`
no `<html>` e o CSS assume dali.

Quem nunca escolheu herda `prefers-reduced-motion` do sistema operacional. A partir do primeiro
toque no botão, a escolha da pessoa vale e fica guardada no `localStorage`.

---

## Como funciona o upload de vídeos

O fluxo inteiro acontece no navegador — **nenhum byte sai do dispositivo**.

1. O arquivo é escolhido pelo seletor ou arrastado até a área de upload.
2. Validação: precisa ser `video/*` e ter no máximo **300 MB**.
3. `extractVideoMetadata` carrega o vídeo em memória, lê a **duração** e captura um frame em um
   `<canvas>` para virar a **miniatura** (JPEG em data URI). Se o codec não permitir a captura, o
   upload continua sem capa.
4. O registro (metadados + `Blob`) é gravado no **IndexedDB** (`pedro-henrique-site`, store
   `videos`).
5. A UI recebe uma *object URL* criada e revogada pelo `VideoLibraryService`, que também libera
   todas as URLs quando é destruído — sem vazamento de memória.

Campos guardados por vídeo: título, descrição, data de gravação, data de envio, nome do arquivo,
tipo MIME, tamanho, duração e miniatura.

**Limites conhecidos:** os vídeos ficam presos ao navegador e ao dispositivo em que foram
enviados; limpar os dados do site apaga a coleção. Para compartilhar entre dispositivos seria
preciso um backend (Firebase Storage, S3 ou API própria) — o `VideoLibraryService` já isola essa
troca em um único arquivo.

---

## Os jogos

### Trilha dos feijões (Nine Men's Morris)

O jogo de tabuleiro tradicional que se joga com nove feijões para cada lado, implementado com as
regras completas:

1. **Colocar** — cada jogador põe seus nove feijões, um por vez, nas 24 casas.
2. **Andar** — depois, cada feijão anda para uma casa vizinha ligada por uma linha.
3. **Trilha** — três feijões seus em linha permitem comer um feijão do adversário. Feijões
   protegidos dentro de uma trilha só podem ser comidos quando não houver nenhum outro disponível.
4. **Voar** — ao restarem exatamente três feijões, eles passam a pular para qualquer casa vazia.
5. **Fim** — perde quem ficar com menos de três feijões ou sem nenhuma jogada possível.

Dois modos: **contra o computador** (que fecha a própria trilha, bloqueia a do adversário e prioriza
casas com mais saídas) ou **dois jogadores** no mesmo dispositivo.

O tabuleiro é desenhado com um SVG de linhas ao fundo e 24 `<button>` reais posicionados em
porcentagem — assim as casas continuam navegáveis por teclado e anunciadas por leitores de tela.
Todas as regras vivem em `beans-game.logic.ts`, separadas do componente.

### Quiz

As perguntas ficam em duas categorias — **sobre mim** (8) e **gerais** (16) — e o jogador escolhe
entre elas ou pede tudo misturado. Cada rodada **sorteia 8 perguntas** do conjunto escolhido, então
duas partidas seguidas nunca são iguais.

---

## Design system

Todos os tokens ficam em `src/styles/_tokens.scss`, como custom properties em `:root`:

- **Paleta**: seis cores fortes (rosa, azul, amarelo, menta, roxo, laranja), cada uma com uma
  versão pastel.
- **Tipografia**: `Baloo 2` para títulos e `Nunito` para texto.
- **Formas**: bordas grossas escuras e sombra sólida, num visual de gibi.
- **Escalas fluidas**: títulos usam `clamp()` e se adaptam do celular ao desktop.

**Tema por elemento:** qualquer elemento com `data-color="mint"` recebe automaticamente `--tone` e
`--tone-soft`, definidos uma única vez em `styles.scss`. É assim que cartões, cabeçalhos e trilhos
mudam de cor sem duplicar CSS.

**Animações** (`_animations.scss`): flutuação, balanço, entrada e pulso. Todas desligadas sob
`prefers-reduced-motion: reduce` e no [modo calmo](#modo-calmo).

**Variação calma** (`_calm.scss`): a segunda paleta do site, aplicada quando o `<html>` recebe
`data-calm="on"`. Como redefine os mesmos tokens, vale para todo componente já existente e para
qualquer um que venha depois.

---

## Acessibilidade

- Skip link para o conteúdo principal.
- HTML semântico: `header`, `nav`, `main`, `section`, `article`, `footer`, listas de definição.
- Toda seção é rotulada por um título real via `aria-labelledby`.
- Emojis decorativos marcados com `aria-hidden`; emojis com significado têm texto alternativo.
- Estados dinâmicos anunciados com `role="status"` e `aria-live="polite"`.
- Botões de filtro e figurinhas expõem `aria-pressed`; as abas de jogos usam `role="tab"`.
- Foco visível com contorno de 3px em todos os elementos interativos.
- O lightbox usa `<dialog>` nativo: fecha com `Esc` e devolve o foco sozinho.
- Cores ativas usam fundo pastel com texto escuro para manter o contraste em qualquer tom.
- **Modo calmo** no cabeçalho (`aria-pressed`), fora do menu retrátil, ligado por padrão para quem
  pede `prefers-reduced-motion` no sistema.
- **Prancha de falar** para comunicação não verbal, com a frase em construção anunciada por
  `aria-live="polite"` e cada cartão da frase removível com rótulo próprio.

---

## Como editar o conteúdo

Nenhuma alteração de texto exige mexer em componente:

| Quero mudar… | Edite |
| --- | --- |
| Nome, data de nascimento, escola, superpoderes, favoritos, medalhas | `core/data/profile.data.ts` |
| Pai, mãe, irmã e avós | `core/data/family.data.ts` |
| Terapias e a lista "o que me ajuda" | `core/data/therapies.data.ts` |
| Texto sobre o autismo | `features/home/sections/my-way-section/my-way-section.html` |
| Itens da galeria | `core/data/gallery.data.ts` |
| Capítulos da linha do tempo | `core/data/story.data.ts` |
| Invenções | `core/data/ideas.data.ts` |
| Perguntas do quiz | `core/data/quiz.data.ts` |
| Cartões e grupos da prancha de falar | `core/data/communication.data.ts` |
| Itens do menu e cartões de exploração | `core/data/site-sections.data.ts` |
| Cores do site | `styles/_tokens.scss` + `core/theme/theme-colors.ts` |

> A idade exibida no cabeçalho e no hero é **calculada** a partir de `birthDate`. Não existe número
> de idade escrito no conteúdo para ficar desatualizado.
>
> A exceção é a idade da Helena (`detail: '15 anos'` em `family.data.ts`): como não guardamos a data
> de nascimento dela, esse texto precisa ser atualizado à mão.

### Dados pessoais publicados

O site exibe, por decisão da família: data de nascimento, nome completo do pai e da mãe, primeiro
nome da irmã e das avós, nome da escola, e o fato de o Pedro Henrique ser autista de nível 1 com as
terapias que faz.

São dados sensíveis de uma criança e ficam **visíveis para qualquer pessoa** assim que o site for
publicado. Antes de subir para um domínio público, vale decidir conscientemente o que fica no ar —
todo esse conteúdo está isolado em `core/data/` e pode ser reduzido sem tocar em nenhum componente.
Para manter o site no ar sem expor os dados, uma alternativa é publicar em um host com acesso
restrito ou remover os campos mais identificáveis (nome completo dos pais e nome da escola).

---

## Testes

86 testes cobrindo as regras que podem quebrar em silêncio:

- `core/utils/birthday.spec.ts` — idade em anos completos, virada de aniversário e contagem
  regressiva (inclusive no próprio dia).
- `core/utils/phrase.spec.ts` — montagem da frase da prancha: junção das palavras, maiúscula
  inicial e pontuação final sem duplicar a de quem já termina com `?`.
- `core/services/calm-mode.service.spec.ts` — herança de `prefers-reduced-motion`, preferência
  salva vencendo o sistema e o atributo `data-calm` entrando e saindo do `<html>`.
- `features/communication/communication-page.spec.ts` — prancha jogada pelo DOM: cartão falado ao
  toque, troca de grupo, remoção de cartão, apagar/limpar, falar a frase inteira e guardar no
  caderninho.
- `core/utils/format.spec.ts` — duração (`m:ss` e `h:mm:ss`), tamanho de arquivo com vírgula
  decimal e normalização de texto.
- `features/games/tic-tac-toe/tic-tac-toe.logic.spec.ts` — detecção de linha vencedora e
  estratégia do computador (vencer > bloquear > centro).
- `features/games/beans-game/beans-game.logic.spec.ts` — integridade do tabuleiro (ligações sempre
  recíprocas, 16 trilhas), formação de trilha, feijões protegidos, voo com três feijões e
  travamento sem jogadas.
- `features/games/beans-game/beans-game.spec.ts` — partida completa jogada pelo DOM: colocação
  alternada, fechamento de trilha, captura pelos dois lados e reinício.
- `features/home/home-page.spec.ts` — smoke test da landing: todas as seções renderizam, existe um
  único `<h1>` e cada `aria-labelledby` aponta para um título que existe de fato.

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

---

## Deploy

O build gera arquivos estáticos:

```bash
npm run build
# saída em dist/pedro-henrique/browser
```

Publique a pasta `browser` em GitHub Pages, Netlify, Vercel, Cloudflare Pages ou qualquer
servidor estático.

**Importante:** por ser uma SPA com rotas, configure o host para devolver `index.html` em
qualquer caminho (fallback SPA). No GitHub Pages, use também `--base-href`:

```bash
npx ng build --base-href /pedro-henrique/
```

---

## Próximas seções possíveis

Ideias que se encaixam na arquitetura atual sem refatoração:

- **Meus desenhos ao vivo** — quadro de desenho em `<canvas>` que salva a arte na galeria.
- **Curiosidades** — cartões que viram ao clicar, com um fato por cartão.
- **Meus livros** — estante com o que já foi lido e uma nota de 1 a 5 estrelas.
- **Quando eu crescer** — profissões dos sonhos com ilustração.
- **Receitas que eu ajudo a fazer** — passo a passo ilustrado.
- **Mapa dos lugares que já visitei** — SVG do Brasil com pinos.
- **Playlist** — músicas favoritas em cards.
- **Modo escuro** — os tokens já estão centralizados; basta redefini-los em
  `prefers-color-scheme: dark`.
- **Backend opcional** — trocar `VideoLibraryService` por Firebase ou uma API mantendo a mesma
  interface pública.

---

Feito com Angular, cores fortes e muita brincadeira. 🦖

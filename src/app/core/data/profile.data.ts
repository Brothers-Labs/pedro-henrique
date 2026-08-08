import type { Profile } from '../models/profile.model';

/**
 * Conteúdo editorial do site. Centralizado aqui para que atualizar textos não
 * exija tocar em nenhum componente.
 */
export const PROFILE: Profile = {
  firstName: 'Pedro Henrique',
  fullName: 'Pedro Henrique',
  birthDate: '2019-04-12',
  tagline: 'Explorador de ideias, colecionador de gargalhadas e inventor de brincadeiras.',
  introduction: [
    'Oi! Eu sou o Pedro Henrique e este é o meu cantinho na internet.',
    'Aqui eu guardo meus desenhos, conto a minha história, mostro as invenções que ficam na minha cabeça e ainda deixo uns joguinhos para você brincar comigo.',
    'Pode explorar tudo com calma — e não esquece de deixar um recado no mural!',
  ],
  avatarEmoji: '🦖',
  quickFacts: [
    { emoji: '🎂', label: 'Aniversário', value: '12 de abril' },
    { emoji: '🏫', label: 'Escola', value: '2º ano' },
    { emoji: '🎨', label: 'Cor favorita', value: 'Azul' },
    { emoji: '🦕', label: 'Bicho favorito', value: 'Dinossauro' },
  ],
  superPowers: [
    {
      emoji: '🎨',
      name: 'Desenhista turbinado',
      description: 'Consigo desenhar um dinossauro inteirinho sem tirar o lápis do papel.',
      level: 92,
      color: 'pink',
    },
    {
      emoji: '🧱',
      name: 'Mestre construtor',
      description: 'Com peças de montar eu faço foguetes, castelos e até uma cidade.',
      level: 88,
      color: 'blue',
    },
    {
      emoji: '⚽',
      name: 'Pernas de vento',
      description: 'Corro muito rápido no recreio e quase nunca perco a bola.',
      level: 80,
      color: 'mint',
    },
    {
      emoji: '📚',
      name: 'Caçador de histórias',
      description: 'Leio livros de aventura e depois conto tudo de novo, com mais emoção.',
      level: 75,
      color: 'purple',
    },
    {
      emoji: '🔬',
      name: 'Cientista curioso',
      description: 'Faço experiências com água, vinagre e tudo que a mamãe deixar.',
      level: 84,
      color: 'orange',
    },
    {
      emoji: '😂',
      name: 'Gerador de piadas',
      description: 'Sei tantas piadas que a família já pediu para eu contar mais devagar.',
      level: 99,
      color: 'yellow',
    },
  ],
  favorites: [
    { emoji: '🍕', category: 'Comida', value: 'Pizza de calabresa' },
    { emoji: '🎬', category: 'Filme', value: 'Aventuras espaciais' },
    { emoji: '🎵', category: 'Música', value: 'A que dá vontade de pular' },
    { emoji: '🎮', category: 'Jogo', value: 'Jogo da memória' },
    { emoji: '🏖️', category: 'Passeio', value: 'Praia com castelo de areia' },
    { emoji: '🐶', category: 'Animal', value: 'Cachorro que corre atrás da bola' },
    { emoji: '🍦', category: 'Sobremesa', value: 'Sorvete de chocolate' },
    { emoji: '🚀', category: 'Sonho', value: 'Conhecer um foguete de verdade' },
  ],
  achievements: [
    {
      emoji: '🚲',
      title: 'Bicicleta sem rodinhas',
      description: 'Foram três tentativas, dois tombos e uma vitória enorme.',
      year: 2024,
    },
    {
      emoji: '📖',
      title: 'Li meu primeiro livro sozinho',
      description: 'Levei uma semana, mas cheguei até a última página.',
      year: 2025,
    },
    {
      emoji: '🏊',
      title: 'Atravessei a piscina',
      description: 'De uma borda até a outra, sem parar no meio do caminho.',
      year: 2025,
    },
    {
      emoji: '🥇',
      title: 'Medalha da corrida da escola',
      description: 'Cheguei em terceiro lugar e ganhei uma medalha brilhante.',
      year: 2026,
    },
  ],
};

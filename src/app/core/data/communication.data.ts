import type {
  CommunicationCard,
  CommunicationCategory,
  CommunicationCategoryId,
} from '../models/communication.model';

/**
 * Conteúdo da prancha de comunicação.
 *
 * As palavras são curtas e do dia a dia do Pedro Henrique: a prancha serve
 * para ele pedir, responder e contar o que sente sem depender da fala.
 * A ordem das categorias vai do que é mais usado para o que é mais específico.
 */
export const COMMUNICATION_CATEGORIES: readonly CommunicationCategory[] = [
  { id: 'respostas', label: 'Respostas', emoji: '✅', color: 'mint' },
  { id: 'inicios', label: 'Começos de frase', emoji: '💬', color: 'blue' },
  { id: 'sentimentos', label: 'Como eu estou', emoji: '💚', color: 'pink' },
  { id: 'preciso', label: 'Eu preciso', emoji: '🙌', color: 'purple' },
  { id: 'comidas', label: 'Comidas', emoji: '🍕', color: 'orange' },
  { id: 'lugares', label: 'Lugares', emoji: '📍', color: 'yellow' },
  { id: 'pessoas', label: 'Pessoas', emoji: '👪', color: 'blue' },
  { id: 'brincar', label: 'Brincar', emoji: '🎨', color: 'mint' },
];

export const COMMUNICATION_CARDS: readonly CommunicationCard[] = [
  { id: 'card-sim', categoryId: 'respostas', label: 'sim', emoji: '👍' },
  { id: 'card-nao', categoryId: 'respostas', label: 'não', emoji: '👎' },
  { id: 'card-talvez', categoryId: 'respostas', label: 'talvez', emoji: '🤔' },
  { id: 'card-por-favor', categoryId: 'respostas', label: 'por favor', emoji: '🙏' },
  { id: 'card-obrigado', categoryId: 'respostas', label: 'obrigado', emoji: '💛' },
  { id: 'card-oi', categoryId: 'respostas', label: 'oi', emoji: '👋' },
  { id: 'card-tchau', categoryId: 'respostas', label: 'tchau', emoji: '🤚' },
  { id: 'card-mais', categoryId: 'respostas', label: 'mais', emoji: '➕' },
  { id: 'card-chega', categoryId: 'respostas', label: 'chega', emoji: '✋' },
  { id: 'card-espera', categoryId: 'respostas', label: 'espera um pouco', emoji: '⏳' },

  { id: 'card-eu-quero', categoryId: 'inicios', label: 'Eu quero', emoji: '🙋' },
  { id: 'card-eu-nao-quero', categoryId: 'inicios', label: 'Eu não quero', emoji: '🙅' },
  { id: 'card-eu-preciso', categoryId: 'inicios', label: 'Eu preciso de', emoji: '🤲' },
  { id: 'card-eu-gosto', categoryId: 'inicios', label: 'Eu gosto de', emoji: '❤️' },
  { id: 'card-eu-nao-gosto', categoryId: 'inicios', label: 'Eu não gosto de', emoji: '💔' },
  { id: 'card-eu-estou', categoryId: 'inicios', label: 'Eu estou', emoji: '🧍' },
  { id: 'card-eu-vou', categoryId: 'inicios', label: 'Eu vou', emoji: '🚶' },
  { id: 'card-posso', categoryId: 'inicios', label: 'Eu posso', emoji: '💪' },
  { id: 'card-cade', categoryId: 'inicios', label: 'Cadê', emoji: '❓' },
  { id: 'card-vamos', categoryId: 'inicios', label: 'Vamos', emoji: '➡️' },

  { id: 'card-feliz', categoryId: 'sentimentos', label: 'feliz', emoji: '😄' },
  { id: 'card-triste', categoryId: 'sentimentos', label: 'triste', emoji: '😢' },
  { id: 'card-com-raiva', categoryId: 'sentimentos', label: 'com raiva', emoji: '😠' },
  { id: 'card-com-medo', categoryId: 'sentimentos', label: 'com medo', emoji: '😨' },
  { id: 'card-cansado', categoryId: 'sentimentos', label: 'cansado', emoji: '😪' },
  { id: 'card-animado', categoryId: 'sentimentos', label: 'animado', emoji: '🤩' },
  { id: 'card-com-sono', categoryId: 'sentimentos', label: 'com sono', emoji: '🥱' },
  { id: 'card-tranquilo', categoryId: 'sentimentos', label: 'tranquilo', emoji: '😌' },
  { id: 'card-com-saudade', categoryId: 'sentimentos', label: 'com saudade', emoji: '🥺' },
  { id: 'card-com-dor', categoryId: 'sentimentos', label: 'com dor', emoji: '🤕' },

  { id: 'card-banheiro', categoryId: 'preciso', label: 'ir ao banheiro', emoji: '🚻' },
  { id: 'card-ajuda', categoryId: 'preciso', label: 'ajuda', emoji: '🆘' },
  { id: 'card-pausa', categoryId: 'preciso', label: 'uma pausa', emoji: '⏸️' },
  { id: 'card-colo', categoryId: 'preciso', label: 'colo', emoji: '🫂' },
  { id: 'card-abraco', categoryId: 'preciso', label: 'um abraço', emoji: '🤗' },
  { id: 'card-silencio', categoryId: 'preciso', label: 'silêncio', emoji: '🤫' },
  { id: 'card-dormir', categoryId: 'preciso', label: 'dormir', emoji: '🛏️' },
  { id: 'card-comer', categoryId: 'preciso', label: 'comer', emoji: '🍽️' },
  { id: 'card-beber', categoryId: 'preciso', label: 'beber', emoji: '🥤' },
  { id: 'card-remedio', categoryId: 'preciso', label: 'o remédio', emoji: '💊' },

  { id: 'card-pizza', categoryId: 'comidas', label: 'pizza', emoji: '🍕' },
  { id: 'card-suco', categoryId: 'comidas', label: 'suco', emoji: '🧃' },
  { id: 'card-agua', categoryId: 'comidas', label: 'água', emoji: '💧' },
  { id: 'card-sorvete', categoryId: 'comidas', label: 'sorvete', emoji: '🍦' },
  { id: 'card-arroz-feijao', categoryId: 'comidas', label: 'arroz e feijão', emoji: '🍚' },
  { id: 'card-biscoito', categoryId: 'comidas', label: 'biscoito', emoji: '🍪' },
  { id: 'card-fruta', categoryId: 'comidas', label: 'fruta', emoji: '🍎' },
  { id: 'card-leite', categoryId: 'comidas', label: 'leite', emoji: '🥛' },
  { id: 'card-pao', categoryId: 'comidas', label: 'pão', emoji: '🍞' },
  { id: 'card-chocolate', categoryId: 'comidas', label: 'chocolate', emoji: '🍫' },

  { id: 'card-casa', categoryId: 'lugares', label: 'para casa', emoji: '🏠' },
  { id: 'card-escola', categoryId: 'lugares', label: 'para a escola', emoji: '🏫' },
  { id: 'card-parque', categoryId: 'lugares', label: 'para o parque', emoji: '🌳' },
  { id: 'card-praia', categoryId: 'lugares', label: 'para a praia', emoji: '🏖️' },
  { id: 'card-quarto', categoryId: 'lugares', label: 'para o meu quarto', emoji: '🚪' },
  { id: 'card-terapia', categoryId: 'lugares', label: 'para a terapia', emoji: '🧩' },
  { id: 'card-mercado', categoryId: 'lugares', label: 'para o mercado', emoji: '🛒' },
  { id: 'card-carro', categoryId: 'lugares', label: 'para o carro', emoji: '🚗' },
  { id: 'card-quintal', categoryId: 'lugares', label: 'para o quintal', emoji: '🌿' },
  { id: 'card-la-fora', categoryId: 'lugares', label: 'lá fora', emoji: '☀️' },

  { id: 'card-mamae', categoryId: 'pessoas', label: 'a mamãe', emoji: '👩' },
  { id: 'card-papai', categoryId: 'pessoas', label: 'o papai', emoji: '👨' },
  { id: 'card-helena', categoryId: 'pessoas', label: 'a Helena', emoji: '👧' },
  { id: 'card-vovo', categoryId: 'pessoas', label: 'a vovó', emoji: '👵' },
  { id: 'card-vovo-avo', categoryId: 'pessoas', label: 'o vovô', emoji: '👴' },
  { id: 'card-professora', categoryId: 'pessoas', label: 'a professora', emoji: '📚' },
  { id: 'card-amigo', categoryId: 'pessoas', label: 'o meu amigo', emoji: '🧒' },
  { id: 'card-cachorro', categoryId: 'pessoas', label: 'o cachorro', emoji: '🐶' },
  { id: 'card-medico', categoryId: 'pessoas', label: 'o médico', emoji: '🩺' },
  { id: 'card-eu', categoryId: 'pessoas', label: 'eu', emoji: '🦖' },

  { id: 'card-desenhar', categoryId: 'brincar', label: 'desenhar', emoji: '🖍️' },
  { id: 'card-jogar', categoryId: 'brincar', label: 'jogar', emoji: '🎮' },
  { id: 'card-correr', categoryId: 'brincar', label: 'correr', emoji: '🏃' },
  { id: 'card-video', categoryId: 'brincar', label: 'ver vídeo', emoji: '📺' },
  { id: 'card-montar', categoryId: 'brincar', label: 'montar peças', emoji: '🧱' },
  { id: 'card-ler', categoryId: 'brincar', label: 'ler um livro', emoji: '📖' },
  { id: 'card-dinossauro', categoryId: 'brincar', label: 'brincar de dinossauro', emoji: '🦕' },
  { id: 'card-bola', categoryId: 'brincar', label: 'jogar bola', emoji: '⚽' },
  { id: 'card-musica', categoryId: 'brincar', label: 'ouvir música', emoji: '🎵' },
  { id: 'card-banho', categoryId: 'brincar', label: 'tomar banho', emoji: '🛁' },
];

/** Cartões de uma categoria, na ordem em que foram escritos. */
export function findCardsByCategory(
  categoryId: CommunicationCategoryId,
): readonly CommunicationCard[] {
  return COMMUNICATION_CARDS.filter((card) => card.categoryId === categoryId);
}

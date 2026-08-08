import type { QuizQuestion } from '../models/quiz.model';

/** Perguntas do quiz "Você me conhece?". As respostas seguem o `PROFILE`. */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'quiz-cor',
    question: 'Qual é a minha cor favorita?',
    options: ['Azul', 'Vermelho', 'Verde', 'Roxo'],
    correctIndex: 0,
    funFact: 'Azul de céu, azul de piscina e azul de caneta: todos valem!',
  },
  {
    id: 'quiz-animal',
    question: 'Qual é o meu bicho favorito?',
    options: ['Gato', 'Dinossauro', 'Papagaio', 'Tubarão'],
    correctIndex: 1,
    funFact: 'Eu sei o nome de doze dinossauros diferentes.',
  },
  {
    id: 'quiz-comida',
    question: 'O que eu peço quando posso escolher a janta?',
    options: ['Sopa', 'Salada', 'Pizza de calabresa', 'Peixe'],
    correctIndex: 2,
    funFact: 'E sempre sobra um pedaço para o café da manhã.',
  },
  {
    id: 'quiz-esporte',
    question: 'Qual esporte eu jogo todo dia no recreio?',
    options: ['Vôlei', 'Natação', 'Basquete', 'Futebol'],
    correctIndex: 3,
    funFact: 'Meu time do recreio nunca tem o mesmo placar duas vezes.',
  },
  {
    id: 'quiz-invencao',
    question: 'Qual invenção minha já ficou pronta?',
    options: ['Cabana secreta do quintal', 'Mochila que anda sozinha', 'Robô arrumador', 'Lápis que apita'],
    correctIndex: 0,
    funFact: 'A cabana tem porta escondida e campainha de verdade.',
  },
  {
    id: 'quiz-sonho',
    question: 'Qual é o meu sonho?',
    options: ['Ter um jacaré', 'Conhecer um foguete de verdade', 'Morar na praia', 'Ganhar um trem'],
    correctIndex: 1,
    funFact: 'Já desenhei o meu foguete: ele tem três andares.',
  },
];

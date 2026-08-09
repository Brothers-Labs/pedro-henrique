import type { Therapy } from '../models/therapy.model';

/**
 * Time de profissionais que acompanha o Pedro Henrique.
 *
 * As descrições são escritas na primeira pessoa e em linguagem de criança: a
 * página é feita para ele mostrar aos amigos, não para relatório clínico.
 */
export const THERAPIES: readonly Therapy[] = [
  {
    id: 'terapia-fono',
    name: 'Fonoaudiologia',
    shortName: 'Fono',
    description: 'Aqui eu treino a fala e aprendo jeitos novos de contar o que penso.',
    emoji: '🗣️',
    color: 'pink',
  },
  {
    id: 'terapia-to',
    name: 'Terapia ocupacional',
    shortName: 'TO',
    description: 'É onde eu pratico as coisas do dia a dia e me acostumo com sons, luzes e texturas.',
    emoji: '🧩',
    color: 'blue',
  },
  {
    id: 'terapia-psicologia',
    name: 'Psicologia',
    shortName: 'Psicólogo',
    description: 'Um lugar só meu para entender o que eu sinto e falar do que me incomoda.',
    emoji: '💚',
    color: 'mint',
  },
  {
    id: 'terapia-nutricao',
    name: 'Nutrição',
    shortName: 'Nutricionista',
    description: 'Aqui eu experimento comidas novas com calma, sem ninguém me apressar.',
    emoji: '🍎',
    color: 'orange',
  },
];

/** Coisas simples que ajudam quem convive comigo no dia a dia. */
export const SUPPORT_TIPS: readonly string[] = [
  'Fale comigo com calma e uma coisa de cada vez.',
  'Me avise antes de mudar o combinado — surpresa demais me deixa aflito.',
  'Se o lugar estiver muito barulhento, eu posso precisar de uma pausa.',
  'Pode perguntar dos meus assuntos favoritos: eu falo deles o dia inteiro.',
];

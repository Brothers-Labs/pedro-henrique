import type { FamilyMember } from '../models/family-member.model';

/** As pessoas da casa e as duas avós, na voz do Pedro Henrique. */
export const FAMILY_MEMBERS: readonly FamilyMember[] = [
  {
    id: 'familia-pai',
    name: 'Pedro Felipe Elias de Souza',
    relation: 'Meu pai',
    detail: 'Também se chama Pedro',
    description: 'É com ele que eu descubro como as coisas funcionam por dentro.',
    emoji: '👨',
    color: 'blue',
  },
  {
    id: 'familia-mae',
    name: 'Ana Carolina Lucena',
    relation: 'Minha mãe',
    detail: 'Meu porto seguro',
    description: 'Ela sabe exatamente o que eu preciso, mesmo quando eu não sei explicar.',
    emoji: '👩',
    color: 'pink',
  },
  {
    id: 'familia-irma',
    name: 'Helena',
    relation: 'Minha irmã',
    detail: '15 anos',
    description: 'É a minha irmã mais velha e a melhor parceira de bagunça da casa.',
    emoji: '👧',
    color: 'purple',
  },
  {
    id: 'familia-vo-veronica',
    name: 'Verônica',
    relation: 'Minha avó',
    detail: 'Mãe da minha mãe',
    description: 'Com ela o dia sempre tem um carinho a mais e um agrado escondido.',
    emoji: '👵',
    color: 'mint',
  },
  {
    id: 'familia-vo-rosimeri',
    name: 'Rosimeri',
    relation: 'Minha avó',
    detail: 'Mãe do meu pai',
    description: 'Ela guarda as melhores histórias de quando o meu pai era pequeno.',
    emoji: '👵',
    color: 'orange',
  },
];

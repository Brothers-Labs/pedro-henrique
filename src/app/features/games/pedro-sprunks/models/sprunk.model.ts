/**
 * Modelos do Pedro Sprunks: a banda de bonecos que cantam juntos.
 *
 * Um boneco é só aparência mais um som. O som vive num catálogo próprio, e o
 * boneco aponta para ele pelo id: assim os bonecos que o Pedro cria reutilizam
 * os mesmos sons da banda, sem duplicar nenhuma partitura.
 */

/** Família do som, usada para agrupar e colorir as escolhas. */
export type SprunkCategory = 'batida' | 'efeito' | 'melodia' | 'voz';

/** Timbre sintetizado na hora pelo motor de áudio. */
export type SprunkVoice =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'cymbal'
  | 'clap'
  | 'tom'
  | 'shaker'
  | 'chain'
  | 'blip'
  | 'boing'
  | 'whistle'
  | 'bass'
  | 'pluck'
  | 'lead'
  | 'bell'
  | 'pad'
  | 'flute'
  | 'choir-ah'
  | 'choir-oo';

/**
 * Um passo do compasso: semitons a partir do dó central, ou `null` para
 * silêncio. Batidas sem altura usam `0`.
 */
export type SprunkStep = number | null;

export interface SprunkSound {
  readonly id: string;
  readonly label: string;
  readonly category: SprunkCategory;
  readonly voice: SprunkVoice;
  /** Sempre `SPRUNK_STEPS_PER_BAR` passos. */
  readonly steps: readonly SprunkStep[];
}

export type SprunkAccessory =
  | 'none'
  | 'headphones'
  | 'antenna-headphones'
  | 'spikes'
  | 'propeller'
  | 'antennas'
  | 'sprout'
  | 'cat-ears'
  | 'bucket'
  | 'visor'
  | 'crown'
  | 'bear-ears'
  | 'sun-rays'
  | 'horns'
  | 'flower'
  | 'halo'
  | 'cap'
  | 'bow'
  | 'bunny-ears'
  | 'top-hat'
  | 'cymbal'
  | 'robot'
  | 'flower-hair'
  | 'tall-ears'
  | 'big-spikes'
  | 'wacky-ears'
  | 'tree-crown'
  | 'antenna-ears'
  | 'fedora'
  | 'monitor'
  | 'cat-whiskers'
  | 'bunny-bow'
  | 'hood'
  | 'microwave'
  | 'emergency-phone'
  | 'ice-crystals'
  | 'ice-cream'
  | 'door'
  | 'letter-cap';

/** `glow` são os olhos acesos da turma da noite, que brilham no escuro. */
export type SprunkEyes = 'sleepy' | 'round' | 'happy' | 'shades' | 'star' | 'glow' | 'angry' | 'crazy';

/** Fantasia vestida no corpo; a cabeça fica por conta do acessório. */
export type SprunkCostume = 'none' | 'bowtie' | 'tie' | 'scarf' | 'cape' | 'overalls' | 'stripes' | 'skeleton' | 'drum';

/** O que o boneco faz quando é tocado no palco. */
export type SprunkAction = 'jump' | 'spin' | 'shake' | 'stretch' | 'lunge';

/** O avanço na corrente é só da bola de ferro; os bonecos criados usam as outras ações. */
export type SprunkCustomAction = Exclude<SprunkAction, 'lunge'>;

/**
 * Formato do corpo. A bola de ferro presa na corrente tem desenho e ação
 * próprios, por isso é um formato e não um acessório. A cabeça sozinha, sem
 * corpo, flutua no palco como um sol.
 */
export type SprunkShape = 'classic' | 'iron-ball' | 'head';

export interface SprunkCharacter {
  readonly id: string;
  readonly name: string;
  /** Cor do corpo em hexadecimal (`#rrggbb`). */
  readonly color: string;
  readonly shape: SprunkShape;
  readonly accessory: SprunkAccessory;
  readonly costume: SprunkCostume;
  readonly eyes: SprunkEyes;
  readonly action: SprunkAction;
  readonly soundId: string;
  /** Verdadeiro para os bonecos criados pelo Pedro em "Meus personagens". */
  readonly isCustom: boolean;
}

/** Dados que o criador pede; o resto (id, formato) é decidido pelo jogo. */
export type SprunkDraft = Pick<
  SprunkCharacter,
  'name' | 'color' | 'accessory' | 'costume' | 'eyes' | 'action' | 'soundId'
>;

export const SPRUNK_STEPS_PER_BAR = 16;

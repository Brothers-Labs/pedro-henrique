/** Partículas que passam por cima do vídeo. */
export type TubeOverlay = 'nenhum' | 'coracoes' | 'estrelas' | 'confete' | 'fogo' | 'bolhas' | 'neve' | 'raios';

/** Moldura em volta do vídeo. */
export type TubeFrame = 'nenhuma' | 'neon' | 'ouro' | 'arco-iris' | 'cinema';

/** Como o desenho de uma cena de animação se mexe. */
export type TubeMotion = 'pular' | 'girar' | 'crescer' | 'deslizar' | 'tremer' | 'parado';

/** De onde vem a imagem do vídeo. */
export type TubeVideoSource = 'animacao' | 'arquivo' | 'camera';

/**
 * Ajustes de cor do efeito, todos em números simples para caber em
 * controles deslizantes. Viram um `filter` de CSS na hora de tocar.
 */
export interface TubeFilter {
  /** Brilho, em %. 100 é o normal. */
  readonly brightness: number;
  /** Contraste, em %. 100 é o normal. */
  readonly contrast: number;
  /** Saturação das cores, em %. 100 é o normal; 0 é cinza. */
  readonly saturation: number;
  /** Giro das cores no círculo cromático, em graus. */
  readonly hue: number;
  /** Tom de foto antiga, em %. */
  readonly sepia: number;
  /** Preto e branco, em %. */
  readonly grayscale: number;
  /** Cores trocadas pelo oposto, em %. */
  readonly invert: number;
  /** Desfoque, em pixels. */
  readonly blur: number;
}

/**
 * Um efeito do PedroTube. Ele nunca altera o arquivo: é aplicado por cima
 * na hora de tocar, então o mesmo vídeo pode ser visto com outro efeito.
 */
export interface TubeEffect {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly filter: TubeFilter;
  readonly overlay: TubeOverlay;
  readonly frame: TubeFrame;
  /** Figurinha no canto do vídeo; vazio quando não tem. */
  readonly sticker: string;
}

/** Efeito que vem pronto com o PedroTube e não pode ser apagado. */
export interface TubePresetEffect extends TubeEffect {
  readonly isPreset: true;
}

export interface TubeChannel {
  readonly id: string;
  readonly name: string;
  /** O @ do canal, sem o @. */
  readonly handle: string;
  /** Emoji que aparece na bolinha do canal. */
  readonly avatar: string;
  /** Cor do banner, em hexadecimal. */
  readonly color: string;
  readonly description: string;
  readonly createdAt: string;
}

/** Uma cena da animação: um desenho grande, uma frase e uma cor de fundo. */
export interface TubeScene {
  readonly emoji: string;
  readonly text: string;
  readonly background: string;
  readonly motion: TubeMotion;
  readonly seconds: number;
}

export interface TubeVideo {
  readonly id: string;
  readonly channelId: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly source: TubeVideoSource;
  /** As cenas, só nos vídeos de animação. */
  readonly scenes: readonly TubeScene[];
  /** Chave do arquivo no banco do navegador, nos vídeos enviados ou gravados. */
  readonly mediaId: string | null;
  readonly durationSeconds: number;
  readonly posterDataUrl: string | null;
  readonly effectId: string;
}

/** O que a pessoa criou e fez no PedroTube, guardado no aparelho. */
export interface PedroTubeState {
  readonly channels: readonly TubeChannel[];
  readonly videos: readonly TubeVideo[];
  readonly effects: readonly TubeEffect[];
  readonly subscriptions: readonly string[];
  readonly liked: readonly string[];
  readonly views: Readonly<Record<string, number>>;
}

export interface TubeChannelDraft {
  readonly name: string;
  readonly avatar: string;
  readonly color: string;
  readonly description: string;
}

export interface TubeVideoDraft {
  readonly channelId: string;
  readonly title: string;
  readonly description: string;
  readonly source: TubeVideoSource;
  readonly scenes: readonly TubeScene[];
  readonly effectId: string;
}

export interface TubeEffectDraft {
  readonly name: string;
  readonly emoji: string;
  readonly filter: TubeFilter;
  readonly overlay: TubeOverlay;
  readonly frame: TubeFrame;
  readonly sticker: string;
}

/** Arquivo de vídeo que acompanha um rascunho enviado ou gravado. */
export interface TubeMediaDraft {
  readonly blob: Blob;
  readonly durationSeconds: number;
  readonly posterDataUrl: string | null;
}

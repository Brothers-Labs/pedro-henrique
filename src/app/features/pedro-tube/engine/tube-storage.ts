import { FILTER_KEYS, FILTER_LIMITS, isTubeFrame, isTubeMotion, isTubeOverlay, NEUTRAL_FILTER } from '../data/tube-effects.data';
import type {
  PedroTubeState,
  TubeChannel,
  TubeChannelDraft,
  TubeEffect,
  TubeEffectDraft,
  TubeFilter,
  TubeScene,
  TubeVideo,
  TubeVideoSource,
} from '../models/tube.model';
import { clampSceneSeconds, MAX_SCENE_TEXT_LENGTH, MAX_SCENES } from './scene-timeline';

export const MAX_CHANNELS = 12;
export const MAX_VIDEOS = 60;
export const MAX_EFFECTS = 30;
export const MAX_CHANNEL_NAME_LENGTH = 30;
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 300;
export const MAX_EFFECT_NAME_LENGTH = 20;
/** Um emoji pode ter vários pedaços (pele, gênero, bandeira); este é o teto de caracteres. */
const MAX_EMOJI_LENGTH = 16;
/** Data URL de capa maior que isto não é guardada: o vídeo fica com a capa padrão. */
const MAX_POSTER_LENGTH = 200_000;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const VIDEO_SOURCES: readonly TubeVideoSource[] = ['animacao', 'arquivo', 'camera'];

export const EMPTY_TUBE_STATE: PedroTubeState = {
  channels: [],
  videos: [],
  effects: [],
  subscriptions: [],
  liked: [],
  views: {},
};

/** Texto de uma linha só, sem espaços sobrando, cortado no tamanho máximo. */
export function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function isEmoji(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_EMOJI_LENGTH && !/[a-z0-9<>]/i.test(value);
}

/** Cada ajuste dentro do limite do controle deslizante; o que faltar fica normal. */
export function clampFilter(value: unknown): TubeFilter {
  const source = isRecord(value) ? value : {};
  const filter: Record<string, number> = {};

  for (const key of FILTER_KEYS) {
    const raw = source[key];
    const { min, max } = FILTER_LIMITS[key];

    filter[key] = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : NEUTRAL_FILTER[key];
  }

  return filter as unknown as TubeFilter;
}

export function isValidChannelDraft(draft: TubeChannelDraft): boolean {
  return cleanText(draft.name, MAX_CHANNEL_NAME_LENGTH).length > 0 && isEmoji(draft.avatar) && isHexColor(draft.color);
}

export function isValidScene(scene: TubeScene): boolean {
  return (
    isEmoji(scene.emoji) &&
    typeof scene.text === 'string' &&
    scene.text.length <= MAX_SCENE_TEXT_LENGTH &&
    isHexColor(scene.background) &&
    isTubeMotion(scene.motion) &&
    clampSceneSeconds(scene.seconds) === scene.seconds
  );
}

export function isValidEffectDraft(draft: TubeEffectDraft): boolean {
  return (
    cleanText(draft.name, MAX_EFFECT_NAME_LENGTH).length > 0 &&
    isEmoji(draft.emoji) &&
    isTubeOverlay(draft.overlay) &&
    isTubeFrame(draft.frame) &&
    (draft.sticker === '' || isEmoji(draft.sticker))
  );
}

/**
 * Lê o PedroTube guardado no aparelho.
 *
 * O storage é entrada externa: pode vir de uma versão antiga ou ter sido
 * mexido à mão. O que estiver estragado some; o resto continua.
 */
export function parseTubeState(raw: string | null): PedroTubeState {
  if (raw === null) {
    return EMPTY_TUBE_STATE;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_TUBE_STATE;
  }

  if (!isRecord(parsed)) {
    return EMPTY_TUBE_STATE;
  }

  const channels = listOf(parsed['channels'], toChannel).slice(0, MAX_CHANNELS);
  const effects = listOf(parsed['effects'], toEffect).slice(0, MAX_EFFECTS);
  const videos = listOf(parsed['videos'], toVideo).slice(0, MAX_VIDEOS);

  return {
    channels,
    videos,
    effects,
    subscriptions: uniqueStrings(parsed['subscriptions']),
    liked: uniqueStrings(parsed['liked']),
    views: toViews(parsed['views']),
  };
}

function toChannel(value: unknown): TubeChannel | null {
  if (!isRecord(value) || !isId(value['id']) || typeof value['name'] !== 'string' || typeof value['handle'] !== 'string') {
    return null;
  }

  const name = cleanText(value['name'], MAX_CHANNEL_NAME_LENGTH);
  const handle = value['handle'].replace(/[^a-z0-9]/g, '').slice(0, 24);

  if (!name || !handle || !isEmoji(value['avatar']) || !isHexColor(value['color'])) {
    return null;
  }

  return {
    id: value['id'],
    name,
    handle,
    avatar: value['avatar'],
    color: value['color'],
    description: cleanText(stringOr(value['description']), MAX_DESCRIPTION_LENGTH),
    createdAt: isoDateOr(value['createdAt']),
  };
}

function toEffect(value: unknown): TubeEffect | null {
  if (!isRecord(value) || !isId(value['id']) || typeof value['name'] !== 'string') {
    return null;
  }

  const draft: TubeEffectDraft = {
    name: cleanText(value['name'], MAX_EFFECT_NAME_LENGTH),
    emoji: stringOr(value['emoji']),
    filter: clampFilter(value['filter']),
    overlay: value['overlay'] as TubeEffectDraft['overlay'],
    frame: value['frame'] as TubeEffectDraft['frame'],
    sticker: stringOr(value['sticker']),
  };

  return isValidEffectDraft(draft) ? { id: value['id'], ...draft } : null;
}

function toVideo(value: unknown): TubeVideo | null {
  if (!isRecord(value) || !isId(value['id']) || !isId(value['channelId']) || typeof value['title'] !== 'string') {
    return null;
  }

  const source = value['source'];
  const title = cleanText(value['title'], MAX_TITLE_LENGTH);

  if (!title || !VIDEO_SOURCES.includes(source as TubeVideoSource)) {
    return null;
  }

  const scenes = source === 'animacao' ? listOf(value['scenes'], toScene).slice(0, MAX_SCENES) : [];
  const mediaId = isId(value['mediaId']) ? value['mediaId'] : null;

  if ((source === 'animacao' && scenes.length === 0) || (source !== 'animacao' && mediaId === null)) {
    return null;
  }

  const poster = value['posterDataUrl'];
  const duration = value['durationSeconds'];

  return {
    id: value['id'],
    channelId: value['channelId'],
    title,
    description: cleanText(stringOr(value['description']), MAX_DESCRIPTION_LENGTH),
    createdAt: isoDateOr(value['createdAt']),
    source: source as TubeVideoSource,
    scenes,
    mediaId,
    durationSeconds: typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : 0,
    posterDataUrl: typeof poster === 'string' && poster.startsWith('data:image/') && poster.length <= MAX_POSTER_LENGTH ? poster : null,
    effectId: isId(value['effectId']) ? value['effectId'] : 'normal',
  };
}

function toScene(value: unknown): TubeScene | null {
  if (!isRecord(value)) {
    return null;
  }

  const scene: TubeScene = {
    emoji: stringOr(value['emoji']),
    text: cleanText(stringOr(value['text']), MAX_SCENE_TEXT_LENGTH),
    background: stringOr(value['background']),
    motion: value['motion'] as TubeScene['motion'],
    seconds: clampSceneSeconds(typeof value['seconds'] === 'number' ? value['seconds'] : Number.NaN),
  };

  return isValidScene(scene) ? scene : null;
}

function toViews(value: unknown): Readonly<Record<string, number>> {
  if (!isRecord(value)) {
    return {};
  }

  const views: Record<string, number> = {};

  for (const [id, count] of Object.entries(value)) {
    if (isId(id) && typeof count === 'number' && Number.isInteger(count) && count > 0) {
      views[id] = count;
    }
  }

  return views;
}

function listOf<TItem>(value: unknown, parse: (entry: unknown) => TItem | null): TItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry: unknown) => {
    const item = parse(entry);

    return item ? [item] : [];
  });
}

function uniqueStrings(value: unknown): readonly string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isId))] : [];
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80;
}

function stringOr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isoDateOr(value: unknown): string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : new Date(0).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

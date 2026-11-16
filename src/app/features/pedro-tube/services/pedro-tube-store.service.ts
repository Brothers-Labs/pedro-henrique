import { computed, inject, Injectable, signal } from '@angular/core';

import { createId } from '../../../core/utils/format';
import { NORMAL_EFFECT_ID, PRESET_EFFECTS } from '../data/tube-effects.data';
import { SEED_CHANNELS, SEED_VIDEOS } from '../data/tube-seed.data';
import { makeHandle, newestFirst } from '../engine/tube-feed';
import { MAX_SCENES, totalDuration } from '../engine/scene-timeline';
import {
  clampFilter,
  cleanText,
  isValidChannelDraft,
  isValidEffectDraft,
  isValidScene,
  MAX_CHANNEL_NAME_LENGTH,
  MAX_CHANNELS,
  MAX_DESCRIPTION_LENGTH,
  MAX_EFFECT_NAME_LENGTH,
  MAX_EFFECTS,
  MAX_TITLE_LENGTH,
  MAX_VIDEOS,
  parseTubeState,
} from '../engine/tube-storage';
import type {
  PedroTubeState,
  TubeChannel,
  TubeChannelDraft,
  TubeEffect,
  TubeEffectDraft,
  TubeMediaDraft,
  TubeVideo,
  TubeVideoDraft,
} from '../models/tube.model';
import { TubeMediaService } from './tube-media.service';

export const PEDRO_TUBE_STORAGE_KEY = 'pedro-henrique:pedro-tube:v1';

const SAVE_FAILED = 'Não deu para guardar no aparelho: a memória do navegador está cheia.';

/**
 * O PedroTube inteiro: canais, vídeos, efeitos, inscrições, "AMO" e
 * visualizações.
 *
 * Os canais e vídeos que vêm prontos moram no código; o que a pessoa cria
 * fica no `localStorage` (é pouco texto, e aparece na mesma hora). Os
 * arquivos de vídeo, pesados, vão para o IndexedDB pelo `TubeMediaService`.
 */
@Injectable({ providedIn: 'root' })
export class PedroTubeStore {
  private readonly media = inject(TubeMediaService);
  private readonly state = signal<PedroTubeState>(parseTubeState(readStorage()));
  private readonly saveErrorState = signal<string | null>(null);

  readonly saveError = this.saveErrorState.asReadonly();

  readonly channels = computed<readonly TubeChannel[]>(() => [...SEED_CHANNELS, ...this.state().channels]);
  readonly effects = computed<readonly TubeEffect[]>(() => [...PRESET_EFFECTS, ...this.state().effects]);
  readonly customEffects = computed(() => this.state().effects);

  /** Todos os vídeos, dos mais novos para os mais antigos. Vídeo sem canal não aparece. */
  readonly videos = computed<readonly TubeVideo[]>(() => {
    const channelIds = new Set(this.channels().map((channel) => channel.id));

    return [...SEED_VIDEOS, ...this.state().videos].filter((video) => channelIds.has(video.channelId)).sort(newestFirst);
  });

  readonly subscriptions = computed(() => new Set(this.state().subscriptions));

  /** Canais e vídeos que a pessoa criou, para saber se ainda cabe outro. */
  readonly ownChannels = computed(() => this.state().channels);
  readonly canCreateChannel = computed(() => this.state().channels.length < MAX_CHANNELS);
  readonly canCreateEffect = computed(() => this.state().effects.length < MAX_EFFECTS);

  channel(id: string): TubeChannel | undefined {
    return this.channels().find((channel) => channel.id === id);
  }

  video(id: string): TubeVideo | undefined {
    return this.videos().find((video) => video.id === id);
  }

  /** O efeito pedido; se ele foi apagado, o normal. */
  effect(id: string): TubeEffect {
    return this.effects().find((effect) => effect.id === id) ?? PRESET_EFFECTS[0];
  }

  videosOf(channelId: string): readonly TubeVideo[] {
    return this.videos().filter((video) => video.channelId === channelId);
  }

  isOwnChannel(id: string): boolean {
    return this.state().channels.some((channel) => channel.id === id);
  }

  isOwnVideo(id: string): boolean {
    return this.state().videos.some((video) => video.id === id);
  }

  isSubscribed(channelId: string): boolean {
    return this.state().subscriptions.includes(channelId);
  }

  isLiked(videoId: string): boolean {
    return this.state().liked.includes(videoId);
  }

  viewsOf(videoId: string): number {
    return this.state().views[videoId] ?? 0;
  }

  /** Cria o canal e devolve-o, ou `null` quando o rascunho é inválido, a lista está cheia ou não deu para guardar. */
  createChannel(draft: TubeChannelDraft): TubeChannel | null {
    if (!isValidChannelDraft(draft) || this.state().channels.length >= MAX_CHANNELS) {
      return null;
    }

    const name = cleanText(draft.name, MAX_CHANNEL_NAME_LENGTH);
    const channel: TubeChannel = {
      id: createId('canal'),
      name,
      handle: makeHandle(name, this.channels().map((existing) => existing.handle)),
      avatar: draft.avatar,
      color: draft.color,
      description: cleanText(draft.description, MAX_DESCRIPTION_LENGTH),
      createdAt: new Date().toISOString(),
    };

    return this.commit((state) => ({ ...state, channels: [...state.channels, channel] })) ? channel : null;
  }

  createEffect(draft: TubeEffectDraft): TubeEffect | null {
    if (!isValidEffectDraft(draft) || this.state().effects.length >= MAX_EFFECTS) {
      return null;
    }

    const effect: TubeEffect = {
      id: createId('efeito'),
      name: cleanText(draft.name, MAX_EFFECT_NAME_LENGTH),
      emoji: draft.emoji,
      filter: clampFilter(draft.filter),
      overlay: draft.overlay,
      frame: draft.frame,
      sticker: draft.sticker,
    };

    return this.commit((state) => ({ ...state, effects: [...state.effects, effect] })) ? effect : null;
  }

  /**
   * Publica o vídeo. Animações não têm arquivo; vídeos enviados ou gravados
   * trazem o arquivo em `media`, que vai para o banco do navegador antes.
   *
   * Recusa com uma mensagem que dá para mostrar à criança.
   */
  async publishVideo(draft: TubeVideoDraft, media: TubeMediaDraft | null = null): Promise<TubeVideo> {
    const title = cleanText(draft.title, MAX_TITLE_LENGTH);
    const isAnimation = draft.source === 'animacao';

    if (!this.channel(draft.channelId)) {
      throw new Error('Escolha um canal para o vídeo.');
    }

    if (!title) {
      throw new Error('Dê um título para o vídeo.');
    }

    if (this.state().videos.length >= MAX_VIDEOS) {
      throw new Error(`O PedroTube guarda até ${MAX_VIDEOS} vídeos. Apague um para fazer outro.`);
    }

    if (isAnimation && (draft.scenes.length === 0 || draft.scenes.length > MAX_SCENES || !draft.scenes.every(isValidScene))) {
      throw new Error('A animação precisa de pelo menos uma cena com desenho.');
    }

    if (!isAnimation && (!media || !media.blob.type.startsWith('video/'))) {
      throw new Error('Escolha ou grave um vídeo primeiro.');
    }

    const mediaId = media && !isAnimation ? await this.media.save(media.blob) : null;
    const video: TubeVideo = {
      id: createId('video'),
      channelId: draft.channelId,
      title,
      description: cleanText(draft.description, MAX_DESCRIPTION_LENGTH),
      createdAt: new Date().toISOString(),
      source: draft.source,
      scenes: isAnimation ? draft.scenes : [],
      mediaId,
      durationSeconds: isAnimation ? totalDuration(draft.scenes) : (media?.durationSeconds ?? 0),
      posterDataUrl: isAnimation ? null : (media?.posterDataUrl ?? null),
      effectId: this.effects().some((effect) => effect.id === draft.effectId) ? draft.effectId : NORMAL_EFFECT_ID,
    };

    if (!this.commit((state) => ({ ...state, videos: [...state.videos, video] }))) {
      if (mediaId) {
        await this.media.remove(mediaId).catch(() => undefined);
      }

      throw new Error(SAVE_FAILED);
    }

    return video;
  }

  /** Liga ou desliga a inscrição; devolve se ficou inscrito. */
  toggleSubscription(channelId: string): boolean {
    const isSubscribed = this.isSubscribed(channelId);

    this.commit((state) => ({
      ...state,
      subscriptions: isSubscribed ? state.subscriptions.filter((id) => id !== channelId) : [...state.subscriptions, channelId],
    }));

    return this.isSubscribed(channelId);
  }

  /** Liga ou desliga o "AMO"; devolve se ficou marcado. */
  toggleLike(videoId: string): boolean {
    const isLiked = this.isLiked(videoId);

    this.commit((state) => ({
      ...state,
      liked: isLiked ? state.liked.filter((id) => id !== videoId) : [...state.liked, videoId],
    }));

    return this.isLiked(videoId);
  }

  /** Troca o efeito de um vídeo criado aqui. O arquivo não muda: o efeito é aplicado na hora de tocar. */
  setVideoEffect(videoId: string, effectId: string): boolean {
    if (!this.isOwnVideo(videoId) || !this.effects().some((effect) => effect.id === effectId)) {
      return false;
    }

    return this.commit((state) => ({
      ...state,
      videos: state.videos.map((video) => (video.id === videoId ? { ...video, effectId } : video)),
    }));
  }

  countView(videoId: string): void {
    if (!this.video(videoId)) {
      return;
    }

    this.commit((state) => ({ ...state, views: { ...state.views, [videoId]: (state.views[videoId] ?? 0) + 1 } }));
  }

  /** Apaga um vídeo criado aqui, com o arquivo dele. Os que vêm prontos não saem. */
  async deleteVideo(id: string): Promise<boolean> {
    const video = this.state().videos.find((candidate) => candidate.id === id);

    if (!video || !this.commit((state) => withoutVideos(state, new Set([id])))) {
      return false;
    }

    if (video.mediaId) {
      await this.media.remove(video.mediaId).catch(() => undefined);
    }

    return true;
  }

  /** Apaga um canal criado aqui e todos os vídeos dele. */
  async deleteChannel(id: string): Promise<boolean> {
    if (!this.isOwnChannel(id)) {
      return false;
    }

    const videos = this.state().videos.filter((video) => video.channelId === id);
    const removed = this.commit((state) => ({
      ...withoutVideos(state, new Set(videos.map((video) => video.id))),
      channels: state.channels.filter((channel) => channel.id !== id),
      subscriptions: state.subscriptions.filter((channelId) => channelId !== id),
    }));

    if (!removed) {
      return false;
    }

    await Promise.all(videos.flatMap((video) => (video.mediaId ? [this.media.remove(video.mediaId).catch(() => undefined)] : [])));

    return true;
  }

  /** Apaga um efeito criado aqui. Os vídeos que usavam ele voltam para o normal. */
  deleteEffect(id: string): boolean {
    if (!this.state().effects.some((effect) => effect.id === id)) {
      return false;
    }

    return this.commit((state) => ({ ...state, effects: state.effects.filter((effect) => effect.id !== id) }));
  }

  /** Aplica a mudança só se ela couber no aparelho; senão, avisa e nada muda. */
  private commit(change: (state: PedroTubeState) => PedroTubeState): boolean {
    const next = change(this.state());

    if (!writeStorage(JSON.stringify(next))) {
      this.saveErrorState.set(SAVE_FAILED);
      return false;
    }

    this.saveErrorState.set(null);
    this.state.set(next);

    return true;
  }
}

function withoutVideos(state: PedroTubeState, ids: ReadonlySet<string>): PedroTubeState {
  const views: Record<string, number> = {};

  for (const [id, count] of Object.entries(state.views)) {
    if (!ids.has(id)) {
      views[id] = count;
    }
  }

  return {
    ...state,
    videos: state.videos.filter((video) => !ids.has(video.id)),
    liked: state.liked.filter((id) => !ids.has(id)),
    views,
  };
}

function readStorage(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(PEDRO_TUBE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PEDRO_TUBE_STORAGE_KEY, value);
    }

    return true;
  } catch {
    return false;
  }
}

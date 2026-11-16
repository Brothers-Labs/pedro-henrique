import { FILTER_LIMITS, NEUTRAL_FILTER } from '../data/tube-effects.data';
import { SEED_VIDEOS } from '../data/tube-seed.data';
import { clampFilter, EMPTY_TUBE_STATE, isEmoji, isValidChannelDraft, isValidEffectDraft, MAX_CHANNELS, parseTubeState } from './tube-storage';

const CHANNEL = {
  id: 'canal-1',
  name: '  Canal   do Dino ',
  handle: 'canaldodino',
  avatar: '🦖',
  color: '#12b886',
  description: 'Rawr',
  createdAt: '2026-11-15T10:00:00.000Z',
};

const EFFECT = {
  id: 'efeito-1',
  name: 'Turbo',
  emoji: '🔥',
  filter: { ...NEUTRAL_FILTER, brightness: 999 },
  overlay: 'fogo',
  frame: 'ouro',
  sticker: '',
};

const FILE_VIDEO = {
  id: 'video-1',
  channelId: 'canal-1',
  title: 'Meu vídeo',
  description: '',
  createdAt: '2026-11-15T10:00:00.000Z',
  source: 'arquivo',
  scenes: [],
  mediaId: 'midia-1',
  durationSeconds: 12,
  posterDataUrl: 'data:image/jpeg;base64,AAAA',
  effectId: 'neon',
};

describe('PedroTube guardado no aparelho', () => {
  it('sem nada guardado, ou com lixo, começa vazio', () => {
    expect(parseTubeState(null)).toEqual(EMPTY_TUBE_STATE);
    expect(parseTubeState('{quebrado')).toEqual(EMPTY_TUBE_STATE);
    expect(parseTubeState('[1,2]')).toEqual(EMPTY_TUBE_STATE);
  });

  it('lê canais, efeitos, vídeos, inscrições, AMO e visualizações', () => {
    const state = parseTubeState(
      JSON.stringify({
        channels: [CHANNEL],
        effects: [EFFECT],
        videos: [FILE_VIDEO, SEED_VIDEOS[0]],
        subscriptions: ['canal-1', 'canal-1', 42],
        liked: ['video-1'],
        views: { 'video-1': 3, 'video-2': -1, 'video-3': 1.5 },
      }),
    );

    expect(state.channels[0].name).toBe('Canal do Dino');
    expect(state.effects[0].filter.brightness).withContext('ajuste fora do limite volta para o limite').toBe(FILTER_LIMITS.brightness.max);
    expect(state.videos.map((video) => video.id)).toEqual(['video-1', SEED_VIDEOS[0].id]);
    expect(state.videos[1].scenes.length).toBe(SEED_VIDEOS[0].scenes.length);
    expect(state.subscriptions).toEqual(['canal-1']);
    expect(state.liked).toEqual(['video-1']);
    expect(state.views).toEqual({ 'video-1': 3 });
  });

  it('o que estiver estragado some, e o resto continua', () => {
    const state = parseTubeState(
      JSON.stringify({
        channels: [CHANNEL, { ...CHANNEL, id: 'canal-2', color: 'verde' }, { ...CHANNEL, id: 'canal-3', avatar: 'abc' }],
        effects: [EFFECT, { ...EFFECT, id: 'efeito-2', overlay: 'lava' }],
        videos: [
          FILE_VIDEO,
          { ...FILE_VIDEO, id: 'sem-arquivo', mediaId: null },
          { ...FILE_VIDEO, id: 'sem-titulo', title: '   ' },
          { ...FILE_VIDEO, id: 'fonte-estranha', source: 'fita' },
          { ...SEED_VIDEOS[0], id: 'animacao-sem-cena', scenes: [{ emoji: '', text: 'oi' }] },
          { ...FILE_VIDEO, id: 'capa-perigosa', posterDataUrl: 'javascript:alert(1)' },
        ],
      }),
    );

    expect(state.channels.map((channel) => channel.id)).toEqual(['canal-1']);
    expect(state.effects.map((effect) => effect.id)).toEqual(['efeito-1']);
    expect(state.videos.map((video) => video.id)).toEqual(['video-1', 'capa-perigosa']);
    expect(state.videos[1].posterDataUrl).toBeNull();
  });

  it('guarda no máximo o limite de canais', () => {
    const channels = Array.from({ length: MAX_CHANNELS + 5 }, (_, index) => ({ ...CHANNEL, id: `canal-${index}` }));

    expect(parseTubeState(JSON.stringify({ channels })).channels.length).toBe(MAX_CHANNELS);
  });

  it('valida rascunhos de canal e de efeito', () => {
    expect(isValidChannelDraft({ name: 'Dino', avatar: '🦖', color: '#12b886', description: '' })).toBeTrue();
    expect(isValidChannelDraft({ name: '  ', avatar: '🦖', color: '#12b886', description: '' })).toBeFalse();
    expect(isValidChannelDraft({ name: 'Dino', avatar: '🦖', color: 'red', description: '' })).toBeFalse();
    expect(isValidEffectDraft({ ...EFFECT, overlay: 'fogo', frame: 'ouro' } as never)).toBeTrue();
    expect(isValidEffectDraft({ ...EFFECT, frame: 'madeira' } as never)).toBeFalse();
    expect(isValidEffectDraft({ ...EFFECT, sticker: 'texto' } as never)).toBeFalse();
  });

  it('emoji é emoji: letra, número e tag ficam de fora', () => {
    expect(isEmoji('👷')).toBeTrue();
    expect(isEmoji('👩‍🚀')).toBeTrue();
    expect(isEmoji('a')).toBeFalse();
    expect(isEmoji('<b>')).toBeFalse();
    expect(isEmoji('')).toBeFalse();
    expect(isEmoji(7)).toBeFalse();
  });

  it('filtro guardado pela metade é completado com o normal', () => {
    expect(clampFilter({ sepia: 50 })).toEqual({ ...NEUTRAL_FILTER, sepia: 50 });
    expect(clampFilter('nada')).toEqual(NEUTRAL_FILTER);
    expect(clampFilter({ blur: -4, hue: Number.NaN })).toEqual({ ...NEUTRAL_FILTER, blur: 0 });
  });
});

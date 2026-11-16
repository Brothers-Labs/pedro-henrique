import { SEED_CHANNELS, SEED_VIDEOS } from '../data/tube-seed.data';
import { foldText, formatViews, makeHandle, newestFirst, searchVideos, timeAgo } from './tube-feed';

describe('Feed do PedroTube', () => {
  it('a busca ignora acento e maiúscula, e procura também no nome do canal', () => {
    expect(foldText('  VÍDEOS  ')).toBe('videos');
    expect(searchVideos(SEED_VIDEOS, SEED_CHANNELS, 'como fazer VIDEOS').map((video) => video.id)).toEqual(['video-como-fazer-videos']);
    expect(searchVideos(SEED_VIDEOS, SEED_CHANNELS, 'pedro games').every((video) => video.channelId === 'canal-pedro-games')).toBeTrue();
    expect(searchVideos(SEED_VIDEOS, SEED_CHANNELS, '@pedrogames').length).toBe(2);
    expect(searchVideos(SEED_VIDEOS, SEED_CHANNELS, '   ')).toBe(SEED_VIDEOS);
    expect(searchVideos(SEED_VIDEOS, SEED_CHANNELS, 'abacaxi voador')).toEqual([]);
  });

  it('os mais novos vêm primeiro', () => {
    const sorted = [...SEED_VIDEOS].sort(newestFirst);

    expect(sorted.map((video) => video.createdAt)).toEqual([...SEED_VIDEOS.map((video) => video.createdAt)].sort().reverse());
  });

  it('conta visualizações do jeito que se fala', () => {
    expect(formatViews(0)).toBe('Nenhuma visualização');
    expect(formatViews(1)).toBe('1 visualização');
    expect(formatViews(42)).toBe('42 visualizações');
    expect(formatViews(1250)).toBe('1,2 mil visualizações');
    expect(formatViews(3000)).toBe('3 mil visualizações');
  });

  it('diz há quanto tempo o vídeo saiu', () => {
    const now = Date.parse('2026-11-15T12:00:00.000Z');

    expect(timeAgo('2026-11-15T11:59:30.000Z', now)).toBe('agora mesmo');
    expect(timeAgo('2026-11-15T11:55:00.000Z', now)).toBe('há 5 minutos');
    expect(timeAgo('2026-11-15T11:00:00.000Z', now)).toBe('há 1 hora');
    expect(timeAgo('2026-11-12T12:00:00.000Z', now)).toBe('há 3 dias');
    expect(timeAgo('2026-09-01T12:00:00.000Z', now)).toBe('há 2 meses');
    expect(timeAgo('2024-11-01T12:00:00.000Z', now)).toBe('há 2 anos');
    expect(timeAgo('2027-01-01T00:00:00.000Z', now)).withContext('data no futuro não vira número negativo').toBe('agora mesmo');
  });

  it('o @ do canal sai do nome, sem acento nem espaço, e nunca repete', () => {
    expect(makeHandle('Canal do Dinossauro Rex', [])).toBe('canaldodinossaurorex');
    expect(makeHandle('João', ['joao'])).toBe('joao2');
    expect(makeHandle('João', ['joao', 'joao2'])).toBe('joao3');
    expect(makeHandle('🦖🦖', [])).toBe('canal');
  });
});

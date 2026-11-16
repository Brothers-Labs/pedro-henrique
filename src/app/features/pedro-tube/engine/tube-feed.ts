import type { TubeChannel, TubeVideo } from '../models/tube.model';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Normaliza para busca: minúsculas e sem acento, para "video" achar "vídeo". */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Vídeos cujo título, descrição ou nome do canal tem todas as palavras buscadas. */
export function searchVideos(videos: readonly TubeVideo[], channels: readonly TubeChannel[], term: string): readonly TubeVideo[] {
  const words = foldText(term).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return videos;
  }

  const channelNames = new Map(channels.map((channel) => [channel.id, `${channel.name} @${channel.handle}`]));

  return videos.filter((video) => {
    const haystack = foldText(`${video.title} ${video.description} ${channelNames.get(video.channelId) ?? ''}`);

    return words.every((word) => haystack.includes(word));
  });
}

/** Mais novos primeiro; empate pelo título, para a ordem nunca pular. */
export function newestFirst(first: TubeVideo, second: TubeVideo): number {
  return second.createdAt.localeCompare(first.createdAt) || first.title.localeCompare(second.title, 'pt-BR');
}

export function formatViews(views: number): string {
  if (views <= 0) {
    return 'Nenhuma visualização';
  }

  if (views === 1) {
    return '1 visualização';
  }

  if (views < 1000) {
    return `${views} visualizações`;
  }

  const thousands = Math.floor(views / 100) / 10;

  return `${String(thousands).replace('.', ',')} mil visualizações`;
}

/** "há 3 dias", do jeito que se fala. */
export function timeAgo(isoDate: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(isoDate));

  if (!Number.isFinite(elapsed) || elapsed < MINUTE) {
    return 'agora mesmo';
  }

  const units: readonly [number, string, string][] = [
    [YEAR, 'ano', 'anos'],
    [MONTH, 'mês', 'meses'],
    [DAY, 'dia', 'dias'],
    [HOUR, 'hora', 'horas'],
    [MINUTE, 'minuto', 'minutos'],
  ];

  for (const [size, singular, plural] of units) {
    if (elapsed >= size) {
      const count = Math.floor(elapsed / size);

      return `há ${count} ${count === 1 ? singular : plural}`;
    }
  }

  return 'agora mesmo';
}

/**
 * O @ do canal a partir do nome: minúsculas, sem acento nem espaço. Se já
 * existir um igual, ganha um número no fim.
 */
export function makeHandle(name: string, takenHandles: readonly string[]): string {
  const base = foldText(name).replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'canal';
  const taken = new Set(takenHandles);

  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;

  while (taken.has(`${base}${suffix}`)) {
    suffix += 1;
  }

  return `${base}${suffix}`;
}

export interface VideoMetadata {
  readonly durationInSeconds: number;
  /** Miniatura em JPEG (data URI). Fica `null` se o navegador bloquear a captura. */
  readonly posterDataUrl: string | null;
}

const POSTER_MAX_WIDTH = 640;
const POSTER_QUALITY = 0.72;
const METADATA_TIMEOUT_MS = 8000;

/**
 * Lê duração e gera uma miniatura do vídeo usando apenas APIs do navegador.
 *
 * A captura é feita em um frame próximo ao início; se qualquer etapa falhar
 * (codec sem suporte, vídeo protegido), devolvemos o que foi possível ler em
 * vez de impedir o upload.
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise<VideoMetadata>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;

    const finish = (metadata: VideoMetadata): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
      resolve(metadata);
    };

    const timeoutId = setTimeout(
      () => finish({ durationInSeconds: 0, posterDataUrl: null }),
      METADATA_TIMEOUT_MS,
    );

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(duration / 2, 1);
      video.onseeked = () => finish({ durationInSeconds: duration, posterDataUrl: capture(video) });
      video.onerror = () => finish({ durationInSeconds: duration, posterDataUrl: null });
    };

    video.onerror = () => finish({ durationInSeconds: 0, posterDataUrl: null });
    video.src = objectUrl;
  });
}

function capture(video: HTMLVideoElement): string | null {
  const { videoWidth, videoHeight } = video;
  if (videoWidth === 0 || videoHeight === 0) {
    return null;
  }

  const scale = Math.min(1, POSTER_MAX_WIDTH / videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  try {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', POSTER_QUALITY);
  } catch {
    // Canvas "sujo" (conteúdo protegido) impede a exportação: seguimos sem capa.
    return null;
  }
}

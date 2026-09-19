// @ts-check
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gera o manifesto da galeria a partir dos arquivos reais de `public/img`.
 *
 * Existe para que adicionar uma foto seja apenas soltar o arquivo na pasta:
 * nenhum caminho de imagem é escrito à mão no código da aplicação. As
 * dimensões saem do cabeçalho do próprio binário, o que permite reservar o
 * espaço do card antes do download (sem layout shift) sem depender de
 * nenhuma biblioteca de processamento de imagem.
 *
 * Uso: `npm run gallery:manifest` (roda sozinho antes de `build` e `start`).
 */

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIRECTORY = join(PROJECT_ROOT, 'public', 'img');
const PUBLIC_PATH_PREFIX = 'img';
const OUTPUT_FILE = join(
  PROJECT_ROOT,
  'src',
  'app',
  'core',
  'data',
  'gallery-manifest.generated.ts',
);

/** Arquivo reservado para a foto de perfil: entra no header, não na galeria. */
const PROFILE_PHOTO_FILE_NAME = 'pedroheaderperfl.jpe';

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.jpe', '.png', '.webp']);

/** Tolerância para considerar uma foto quadrada (3% de diferença entre lados). */
const SQUARE_TOLERANCE = 0.03;

const naturalOrder = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

main();

function main() {
  const files = listImageFiles();
  const profilePhoto = buildProfilePhoto(files);
  const { photos, duplicates } = buildGalleryPhotos(files);

  if (photos.length === 0) {
    throw new Error(`Nenhuma foto de galeria encontrada em ${IMAGE_DIRECTORY}.`);
  }

  writeFileSync(OUTPUT_FILE, renderManifest(profilePhoto, photos), 'utf8');

  console.log(`[galeria] ${photos.length} foto(s) no manifesto.`);

  for (const duplicate of duplicates) {
    console.log(`[galeria] "${duplicate.fileName}" ignorada: duplicata de "${duplicate.originalFileName}".`);
  }
}

function listImageFiles() {
  if (!existsSync(IMAGE_DIRECTORY)) {
    throw new Error(
      `Pasta de imagens ausente: ${IMAGE_DIRECTORY}. ` +
        'As fotos do álbum não são versionadas — copie-as para lá antes de compilar.',
    );
  }

  return readdirSync(IMAGE_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort(naturalOrder.compare);
}

/**
 * @param {readonly string[]} files
 */
function buildProfilePhoto(files) {
  if (!files.includes(PROFILE_PHOTO_FILE_NAME)) {
    throw new Error(
      `Foto de perfil "${PROFILE_PHOTO_FILE_NAME}" não encontrada em ${IMAGE_DIRECTORY}.`,
    );
  }

  return describeImage(PROFILE_PHOTO_FILE_NAME);
}

/**
 * Monta a lista da galeria ignorando a foto de perfil e arquivos com conteúdo
 * idêntico — o mesmo momento não deve aparecer duas vezes no álbum.
 *
 * @param {readonly string[]} files
 */
function buildGalleryPhotos(files) {
  /** @type {Map<string, string>} */
  const seenByDigest = new Map();
  const photos = [];
  const duplicates = [];

  for (const fileName of files) {
    if (fileName === PROFILE_PHOTO_FILE_NAME) {
      continue;
    }

    const digest = hashFile(fileName);
    const originalFileName = seenByDigest.get(digest);

    if (originalFileName) {
      duplicates.push({ fileName, originalFileName });
      continue;
    }

    seenByDigest.set(digest, fileName);
    photos.push({ id: toId(fileName), ...describeImage(fileName) });
  }

  return { photos, duplicates };
}

/**
 * @param {string} fileName
 */
function describeImage(fileName) {
  const buffer = readFileSync(join(IMAGE_DIRECTORY, fileName));
  const size = readImageSize(buffer, fileName);

  return {
    fileName,
    src: `${PUBLIC_PATH_PREFIX}/${encodeURIComponent(fileName)}`,
    width: size.width,
    height: size.height,
    orientation: resolveOrientation(size.width, size.height),
  };
}

/**
 * @param {number} width
 * @param {number} height
 */
function resolveOrientation(width, height) {
  const ratio = width / height;

  if (Math.abs(ratio - 1) <= SQUARE_TOLERANCE) {
    return 'square';
  }

  return ratio > 1 ? 'landscape' : 'portrait';
}

/**
 * @param {string} fileName
 */
function hashFile(fileName) {
  return createHash('sha1').update(readFileSync(join(IMAGE_DIRECTORY, fileName))).digest('hex');
}

/**
 * `Pedro-henrique (10).jpeg` vira `pedro-henrique-10`.
 *
 * @param {string} fileName
 */
function toId(fileName) {
  const base = fileName.slice(0, fileName.length - extname(fileName).length);

  return base
    .normalize('NFD') // decompõe acentos; os sinais soltos caem no filtro abaixo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Leitura de dimensões ---------------------------------------------------- */

/**
 * @param {Buffer} buffer
 * @param {string} fileName
 */
function readImageSize(buffer, fileName) {
  const size = readJpegSize(buffer) ?? readPngSize(buffer) ?? readWebpSize(buffer);

  if (!size) {
    throw new Error(`Não foi possível ler as dimensões de "${fileName}".`);
  }

  return size;
}

/**
 * Percorre os segmentos do JPEG até o "start of frame", que carrega altura e
 * largura. Os marcadores 0xC4, 0xC8 e 0xCC têm o mesmo intervalo mas descrevem
 * tabelas, não o quadro.
 *
 * @param {Buffer} buffer
 */
function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    offset += 2 + buffer.readUInt16BE(offset + 2);
  }

  return null;
}

/**
 * @param {Buffer} buffer
 */
function readPngSize(buffer) {
  const isPng = buffer.length >= 24 && buffer.toString('binary', 1, 4) === 'PNG';

  return isPng ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
}

/**
 * @param {Buffer} buffer
 */
function readWebpSize(buffer) {
  const isWebp =
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isWebp) {
    return null;
  }

  const format = buffer.toString('ascii', 12, 16);

  if (format === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (format === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  return null;
}

/* Saída ------------------------------------------------------------------- */

/**
 * @param {{ fileName: string; src: string; width: number; height: number; orientation: string }} profilePhoto
 * @param {readonly { id: string; fileName: string; src: string; width: number; height: number; orientation: string }[]} photos
 */
function renderManifest(profilePhoto, photos) {
  const entries = photos.map((photo) => `  ${JSON.stringify(photo)},`).join('\n');

  return `/**
 * ARQUIVO GERADO — não edite à mão.
 *
 * Fonte: \`public/img\`. Regenere com \`npm run gallery:manifest\`.
 */
import type { ImageAsset } from '../models/image-asset.model';
import type { GalleryPhotoSource } from '../models/gallery-item.model';

/** Foto principal do Pedro Henrique, usada no header e no hero. */
export const PROFILE_PHOTO: ImageAsset = ${JSON.stringify({
    src: profilePhoto.src,
    width: profilePhoto.width,
    height: profilePhoto.height,
  })};

/** Fotos do álbum, em ordem natural de arquivo e sem duplicatas. */
export const GALLERY_PHOTO_SOURCES: readonly GalleryPhotoSource[] = [
${entries}
];
`;
}

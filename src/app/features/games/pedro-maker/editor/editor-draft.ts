import { EDITOR_THEMES } from '../config/object-catalog';
import { LEVEL_LIMITS, sanitizeLevelObject } from '../levels/level-validation';
import type { LevelObject } from '../models/level.model';
import type { EditorLevel } from './editor-state';

const DRAFT_KEY = 'pedro-maker:rascunho-do-editor';

/** Fase em edição guardada às pressas, junto com a fase salva de onde ela veio. */
export interface EditorDraft {
  /** Fase salva que estava sendo editada, ou `null` para uma fase nova. */
  readonly levelId: string | null;
  readonly level: EditorLevel;
}

/**
 * Rascunho automático do editor.
 *
 * No celular a aba pode ser fechada pelo sistema a qualquer momento — uma
 * ligação, a bateria, outro aplicativo. O rascunho guarda a fase a cada
 * mudança para que meia hora de construção não se perca; salvar de verdade
 * continua sendo o botão "Salvar".
 *
 * O armazenamento pode faltar (aba anônima, espaço cheio): aí o editor segue
 * funcionando, só sem essa rede de proteção.
 */
export function saveEditorDraft(draft: EditorDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Pedro Maker: não foi possível guardar o rascunho do editor.', error);
  }
}

/** Rascunho da fase pedida, se houver um válido. */
export function loadEditorDraft(levelId: string | null): EditorDraft | null {
  let raw: string | null;

  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Pedro Maker: não foi possível ler o rascunho do editor.', error);
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const draft = parseDraft(JSON.parse(raw));

    return draft?.levelId === levelId ? draft : null;
  } catch (error) {
    console.warn('Pedro Maker: rascunho do editor ilegível; foi descartado.', error);
    clearEditorDraft();
    return null;
  }
}

export function clearEditorDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Pedro Maker: não foi possível apagar o rascunho do editor.', error);
  }
}

/** Confere campo a campo: o que vem do armazenamento pode ser de uma versão antiga. */
function parseDraft(value: unknown): EditorDraft | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as { readonly levelId?: unknown; readonly level?: unknown };
  const level = candidate.level as Partial<Record<keyof EditorLevel, unknown>> | undefined;
  const levelId = typeof candidate.levelId === 'string' ? candidate.levelId : null;

  if (!level || typeof level.name !== 'string' || !Array.isArray(level.objects)) {
    return null;
  }

  const theme = EDITOR_THEMES.find((option) => option === level.theme);
  const width = level.width;
  const height = level.height;

  if (!theme || !isWithin(width, LEVEL_LIMITS.minWidth, LEVEL_LIMITS.maxWidth) || !isWithin(height, LEVEL_LIMITS.minHeight, LEVEL_LIMITS.maxHeight)) {
    return null;
  }

  const objects = level.objects
    .map((object: unknown) => sanitizeLevelObject(object, width, height))
    .filter((object): object is LevelObject => object !== null);

  return { levelId, level: { name: level.name.slice(0, 40), theme, width, height, objects } };
}

function isWithin(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}

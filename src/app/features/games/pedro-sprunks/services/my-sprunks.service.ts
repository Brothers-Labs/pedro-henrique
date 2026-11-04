import { Injectable, signal } from '@angular/core';

import { isSprunkAccessory, isSprunkCostume, isSprunkCustomAction, isSprunkEyes } from '../data/sprunk-parts.data';
import { isSprunkSoundId } from '../data/sprunk-sounds.data';
import type { SprunkCharacter, SprunkDraft } from '../models/sprunk.model';

const STORAGE_KEY = 'pedro-henrique:pedro-sprunks:characters:v1';

export const MAX_CUSTOM_SPRUNKS = 20;
export const MAX_SPRUNK_NAME_LENGTH = 16;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Lê os bonecos guardados, descartando qualquer um que não tenha forma válida.
 *
 * O storage é entrada externa: pode vir de uma versão antiga do jogo ou ter
 * sido editado à mão. Um boneco estragado some; os outros continuam.
 */
export function parseStoredSprunks(raw: string | null): readonly SprunkCharacter[] {
  if (raw === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((entry: unknown) => {
    const character = toCustomSprunk(entry);

    return character ? [character] : [];
  }).slice(0, MAX_CUSTOM_SPRUNKS);
}

/** Nome limpo e com tamanho seguro; vazio quando não sobra nada para mostrar. */
export function normalizeSprunkName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_SPRUNK_NAME_LENGTH);
}

export function isValidDraft(draft: SprunkDraft): boolean {
  return (
    normalizeSprunkName(draft.name).length > 0 &&
    HEX_COLOR_PATTERN.test(draft.color) &&
    isSprunkAccessory(draft.accessory) &&
    isSprunkCostume(draft.costume) &&
    isSprunkEyes(draft.eyes) &&
    isSprunkCustomAction(draft.action) &&
    isSprunkSoundId(draft.soundId)
  );
}

/**
 * "Meus personagens": os bonecos que o Pedro cria, guardados no aparelho.
 *
 * Ficam no `localStorage` porque são poucos e pequenos — um boneco é meia
 * dúzia de campos —, e assim aparecem na paleta no mesmo instante.
 */
@Injectable({ providedIn: 'root' })
export class MySprunksService {
  private readonly charactersState = signal<readonly SprunkCharacter[]>(parseStoredSprunks(readStorage()));

  readonly characters = this.charactersState.asReadonly();

  canCreateMore(): boolean {
    return this.charactersState().length < MAX_CUSTOM_SPRUNKS;
  }

  /** Cria o boneco e devolve-o, ou `null` quando o rascunho é inválido ou a lista está cheia. */
  create(draft: SprunkDraft): SprunkCharacter | null {
    if (!isValidDraft(draft) || !this.canCreateMore()) {
      return null;
    }

    const character: SprunkCharacter = {
      ...draft,
      id: `meu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: normalizeSprunkName(draft.name),
      shape: 'classic',
      isCustom: true,
    };

    this.save([...this.charactersState(), character]);

    return character;
  }

  remove(characterId: string): void {
    this.save(this.charactersState().filter((character) => character.id !== characterId));
  }

  private save(characters: readonly SprunkCharacter[]): void {
    this.charactersState.set(characters);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch {
      // Navegador em modo privado: os bonecos valem só para a sessão atual.
    }
  }
}

function toCustomSprunk(entry: unknown): SprunkCharacter | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const record = entry as Readonly<Record<string, unknown>>;
  const { id, name, color, accessory, eyes, action, soundId } = record;
  // Bonecos guardados antes das fantasias existirem não têm o campo: vestem nenhuma.
  const costume = record['costume'] ?? 'none';

  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof name !== 'string' ||
    typeof color !== 'string' ||
    typeof accessory !== 'string' ||
    typeof costume !== 'string' ||
    typeof eyes !== 'string' ||
    typeof action !== 'string' ||
    typeof soundId !== 'string'
  ) {
    return null;
  }

  const draft = { name, color, accessory, costume, eyes, action, soundId } as SprunkDraft;

  if (!isValidDraft(draft)) {
    return null;
  }

  return { ...draft, id, name: normalizeSprunkName(name), shape: 'classic', isCustom: true };
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

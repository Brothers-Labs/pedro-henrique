import type { LevelBlueprint } from '../../models/level.model';
import { buildTreasureLevel } from './sections';

/**
 * Fase secreta do Vale Verde: o Jardim Secreto.
 *
 * Um prêmio para quem descobriu a porta dourada na Floresta Saltitante.
 */
export function buildJardimSecreto(): LevelBlueprint {
  return buildTreasureLevel({
    id: '1-S',
    name: 'Jardim Secreto',
    theme: 'floresta',
    floor: 'ground',
    welcome: 'Você achou o jardim secreto!',
    mascotText: 'Que lugar mágico! Pegue todas as moedas!',
    farewell: 'Construído pelo Pedro 🧱',
  });
}

import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Páginas de conteúdo saem prontas do build: buscadores e prévias de link
 * enxergam o texto, e a primeira pintura não espera o JavaScript.
 *
 * Todo o resto é renderizado só no navegador. Jogos, mascote e conta vivem de
 * estado guardado no aparelho e de APIs que não existem no build, e não têm
 * nada a ganhar com indexação.
 */
const PRERENDERED_PATHS: readonly string[] = [
  '',
  'falar',
  'desenhos',
  'galeria',
  'historia',
  'ideias',
  'jogos',
  'videos',
  'planos',
];

export const serverRoutes: ServerRoute[] = [
  ...PRERENDERED_PATHS.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  { path: '**', renderMode: RenderMode.Client },
];

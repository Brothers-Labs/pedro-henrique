/** Parâmetro de URL com o destino de volta depois do login (`/entrar?voltar=/jogos`). */
export const REDIRECT_QUERY_PARAM = 'voltar';

/**
 * Valida o destino de volta depois do login.
 *
 * Só aceita caminhos internos do site. Sem isso, um link como
 * `/entrar?voltar=//site-falso.com` levaria o visitante para fora logo depois
 * de digitar a senha — o clássico "open redirect".
 */
export function resolveSafeRedirect(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate || !candidate.startsWith('/')) {
    return fallback;
  }

  // `//host` e `/\host` são lidos pelo navegador como outro domínio.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback;
  }

  // Caracteres de controle podem esconder um destino externo do teste acima.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback;
  }

  return candidate;
}

/** Parâmetros que carregam o destino adiante; o início já é o padrão e não precisa ir na URL. */
export function redirectQueryParams(redirectTo: string): Record<string, string> {
  return redirectTo === '/' ? {} : { [REDIRECT_QUERY_PARAM]: redirectTo };
}

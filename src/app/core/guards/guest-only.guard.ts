import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { REDIRECT_QUERY_PARAM, resolveSafeRedirect } from '../utils/safe-redirect';

/**
 * Páginas só para quem ainda não entrou (login, cadastro, recuperar senha).
 *
 * Quem já está conectado segue direto para o destino pedido — ou para o
 * início — em vez de ver um formulário que não serve mais para nada.
 */
export const guestOnlyGuard: CanActivateFn = (route) => {
  if (!inject(AuthService).isAuthenticated()) {
    return true;
  }

  return inject(Router).parseUrl(resolveSafeRedirect(route.queryParamMap.get(REDIRECT_QUERY_PARAM)));
};

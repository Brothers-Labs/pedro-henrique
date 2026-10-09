import type { DisplayMode } from '../models/analytics-event.model';

const STANDALONE_QUERY = '(display-mode: standalone)';

/** O Safari do iPhone não implementa `display-mode`: avisa por uma propriedade própria. */
interface SafariNavigator extends Navigator {
  readonly standalone?: boolean;
}

/** Diz se o site está aberto como app instalado, e não numa aba do navegador. */
export function detectDisplayMode(view: Window): DisplayMode {
  const isStandalone =
    view.matchMedia(STANDALONE_QUERY).matches ||
    (view.navigator as SafariNavigator).standalone === true;

  return isStandalone ? 'standalone' : 'browser';
}

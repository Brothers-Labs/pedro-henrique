import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { serverConfig } from './app/app.config.server';

/** Ponto de entrada da pré-renderização: roda no build, nunca no navegador. */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, serverConfig, context);

export default bootstrap;

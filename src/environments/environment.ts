import type { Environment } from './environment.model';

/** Produção. Em desenvolvimento este arquivo é trocado por `environment.development.ts`. */
export const environment: Environment = {
  siteUrl: 'https://pedro-henrique-seven.vercel.app',
  apiUrl: null,
  pix: {
    key: null,
    receiverName: null,
  },
};

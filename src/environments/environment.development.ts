import type { Environment } from './environment.model';

/** Desenvolvimento (`npm start`). Por exemplo `'http://localhost:3000/api'`. */
export const environment: Environment = {
  siteUrl: 'http://localhost:4200',
  apiUrl: null,
  pix: {
    key: null,
    receiverName: null,
  },
};

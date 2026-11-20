import type { Page } from '@playwright/test';

export interface SavedLevel {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  readonly screen?: string;
  readonly objects: readonly {
    readonly type: string;
    readonly properties?: {
      readonly contents?: string;
      readonly powerUp?: string;
      readonly portalLook?: string;
      readonly pair?: string;
      readonly text?: string;
      readonly range?: number;
    };
  }[];
}

/** Read saved levels after real UI actions, without changing game state through test hooks. */
export async function savedLevels(page: Page): Promise<SavedLevel[]> {
  return page.evaluate(() => new Promise<SavedLevel[]>((resolve, reject) => {
    const opening = indexedDB.open('pedro-henrique-site');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const request = database.transaction('maker-levels').objectStore('maker-levels').getAll();
      request.onsuccess = () => { database.close(); resolve(request.result as SavedLevel[]); };
      request.onerror = () => { database.close(); reject(request.error); };
    };
  }));
}

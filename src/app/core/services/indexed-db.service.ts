import { Injectable } from '@angular/core';

export const VIDEO_STORE = 'videos';
export const DRAWING_STORE = 'drawings';
export const MAKER_LEVEL_STORE = 'maker-levels';
export const KART_TRACK_STORE = 'kart-tracks';
export const FLASH_COURSE_STORE = 'flash-courses';

const DATABASE_NAME = 'pedro-henrique-site';

/**
 * Versão 2 acrescentou a prancheta de desenho ao banco dos vídeos; a versão 3,
 * as fases criadas no editor do Pedro Maker; a versão 4, as pistas do Pedro
 * Kart Maker; a versão 5, as fases do Pedro Flash Maker.
 */
const DATABASE_VERSION = 5;

const STORES: readonly string[] = [VIDEO_STORE, DRAWING_STORE, MAKER_LEVEL_STORE, KART_TRACK_STORE, FLASH_COURSE_STORE];

/**
 * Wrapper mínimo e tipado sobre a IndexedDB nativa.
 *
 * Existe para que os serviços de domínio trabalhem com Promises em vez de
 * eventos, sem trazer nenhuma dependência externa para o projeto.
 */
@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private databasePromise: Promise<IDBDatabase> | null = null;

  get isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async getAll<TValue>(storeName: string): Promise<TValue[]> {
    const database = await this.openDatabase();
    return this.runRequest(() =>
      database.transaction(storeName, 'readonly').objectStore(storeName).getAll(),
    ) as Promise<TValue[]>;
  }

  async put<TValue>(storeName: string, value: TValue): Promise<void> {
    const database = await this.openDatabase();
    await this.runRequest(() =>
      database.transaction(storeName, 'readwrite').objectStore(storeName).put(value),
    );
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const database = await this.openDatabase();
    await this.runRequest(() =>
      database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key),
    );
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.isSupported) {
      return Promise.reject(new Error('Este navegador não oferece suporte ao IndexedDB.'));
    }

    this.databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      /**
       * Cria apenas o que falta.
       *
       * Quem já tinha uma versão anterior ganha só as coleções novas, sem
       * perder nenhum vídeo nem desenho: a migração é aditiva de propósito.
       */
      request.onupgradeneeded = () => {
        const database = request.result;

        for (const store of STORES) {
          if (!database.objectStoreNames.contains(store)) {
            database.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o banco local.'));
    });

    return this.databasePromise;
  }

  private runRequest<TResult>(createRequest: () => IDBRequest<TResult>): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const request = createRequest();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falha ao acessar o banco local.'));
    });
  }
}

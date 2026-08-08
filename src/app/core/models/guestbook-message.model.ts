/** Recado deixado no mural da home. */
export interface GuestbookMessage {
  readonly id: string;
  readonly author: string;
  readonly message: string;
  readonly emoji: string;
  readonly createdAt: string;
}

export type GuestbookDraft = Pick<GuestbookMessage, 'author' | 'message' | 'emoji'>;

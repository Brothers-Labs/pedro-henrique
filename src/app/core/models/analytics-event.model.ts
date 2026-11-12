import type { AchievementId, GameId } from './game-progress.model';
import type { AppLanguage } from './language.model';
import type { PlanId } from './plan.model';

/** De onde saiu uma fala na prancha de comunicação. */
export type PhraseSource = 'board' | 'quick' | 'saved';

export type DisplayMode = 'standalone' | 'browser';

/**
 * Catálogo fechado de tudo o que o site mede.
 *
 * Ser uma união discriminada é o que garante a privacidade: não existe como
 * enviar um evento que não esteja aqui, e nenhum deles carrega texto livre,
 * nome, e-mail ou o conteúdo de uma frase — só contagens e identificadores
 * do próprio site. O site é de uma criança; o que ela diz na prancha é dela.
 */
export type AnalyticsEvent =
  | {
      readonly name: 'app_opened';
      readonly properties: { readonly displayMode: DisplayMode; readonly isOnline: boolean };
    }
  | {
      readonly name: 'phrase_spoken';
      readonly properties: {
        readonly language: AppLanguage;
        readonly source: PhraseSource;
        readonly wordCount: number;
        readonly isOnline: boolean;
      };
    }
  | {
      readonly name: 'game_level_completed';
      readonly properties: {
        readonly gameId: GameId;
        readonly level: number;
        readonly wasPerfect: boolean;
      };
    }
  | {
      readonly name: 'achievement_unlocked';
      readonly properties: { readonly achievementId: AchievementId };
    }
  | {
      readonly name: 'adventure_level_completed';
      readonly properties: {
        readonly worldId: string;
        readonly levelId: string;
        readonly stars: number;
        readonly isFirstCompletion: boolean;
      };
    }
  | { readonly name: 'checkout_started'; readonly properties: { readonly planId: PlanId } }
  | {
      readonly name: 'pix_receipt_sent';
      readonly properties: { readonly productType: 'plan' | 'season-pass'; readonly productId: string };
    }
  | { readonly name: 'sign_up_completed' }
  | { readonly name: 'login_completed' }
  | { readonly name: 'guestbook_message_posted' }
  | { readonly name: 'calm_mode_changed'; readonly properties: { readonly isEnabled: boolean } }
  | {
      readonly name: 'app_install_answered';
      readonly properties: { readonly outcome: 'accepted' | 'dismissed' };
    }
  | { readonly name: 'app_installed' }
  | { readonly name: 'app_updated' }
  | { readonly name: 'connection_lost' };

export type AnalyticsEventName = AnalyticsEvent['name'];

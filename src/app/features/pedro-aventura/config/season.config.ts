import type { ChestContents, PremiumPass, PremiumPassId, Reward, SeasonDefinition, SeasonTier } from '../models/economy.model';

/**
 * Pagamento real desligado de propósito.
 *
 * O site não tem gateway de pagamento e é usado por uma criança: os passes
 * são trocados por diamantes ganhos jogando. Virar esta chave exige gateway,
 * requisitos legais e a aprovação do dono do site.
 */
export const IS_REAL_PAYMENT_ENABLED = false;

/** XP que o nível 1 pede para virar o 2; cada nível seguinte pede um pouco mais. */
export const SEASON_XP = { base: 300, increment: 100 } as const;

export const PREMIUM_PASSES: readonly PremiumPass[] = [
  {
    id: 'vip',
    name: 'Passe VIP',
    priceInDiamonds: 199,
    referencePriceInCents: 199,
    perks: ['Prêmios exclusivos em todos os níveis', 'Skins especiais e baús VIP', 'Moto Neon e Rex de Óculos'],
  },
  {
    id: 'luxo',
    name: 'Passe Luxo',
    priceInDiamonds: 490,
    referencePriceInCents: 490,
    perks: ['Tudo do VIP', 'Skin lendária Pedro Elite', 'Lambo Gold e Rex Gold', 'Baús de luxo'],
  },
];

const coins = (amount: number): Reward => ({ kind: 'coins', amount });
const diamonds = (amount: number): Reward => ({ kind: 'diamonds', amount });
const cosmetic = (cosmeticId: string): Reward => ({ kind: 'cosmetic', cosmeticId });
const chest = (name: string, contents: ChestContents): Reward => ({ kind: 'chest', name, contents });

const tier = (level: number, gratuito: Reward, vip: Reward, luxo: Reward): SeasonTier => ({
  level,
  rewards: { gratuito, vip, luxo },
});

/**
 * Trilha da Temporada do Pedro.
 *
 * O gratuito também ganha um cosmético de verdade (o SUV Dourado no nível 10)
 * e o baú da temporada no 20: jogar sem passe nunca pode parecer castigo.
 */
const TIERS: readonly SeasonTier[] = [
  tier(1, coins(300), diamonds(30), cosmetic('traje-neon')),
  tier(2, diamonds(10), coins(800), diamonds(80)),
  tier(3, coins(400), cosmetic('rex-oculos'), chest('Baú de Luxo', { coins: 2500, diamonds: 50 })),
  tier(4, chest('Baú Simples', { coins: 600, diamonds: 10 }), diamonds(40), coins(3000)),
  tier(5, coins(500), chest('Baú VIP', { coins: 1500, diamonds: 25 }), cosmetic('rex-gold')),
  tier(6, diamonds(15), coins(1000), diamonds(100)),
  tier(7, coins(600), cosmetic('moto-neon'), coins(3500)),
  tier(8, diamonds(20), diamonds(50), chest('Baú de Luxo', { coins: 3000, diamonds: 60 })),
  tier(9, coins(700), coins(1200), diamonds(120)),
  tier(10, cosmetic('suv-dourado'), cosmetic('conjunto-branco'), cosmetic('lambo-gold')),
  tier(11, coins(800), diamonds(60), coins(4000)),
  tier(12, diamonds(25), chest('Baú VIP', { coins: 2000, diamonds: 30 }), diamonds(140)),
  tier(13, coins(900), coins(1500), chest('Baú de Luxo', { coins: 3500, diamonds: 70 })),
  tier(14, chest('Baú Simples', { coins: 800, diamonds: 15 }), diamonds(70), coins(4500)),
  tier(15, coins(1000), coins(1800), diamonds(160)),
  tier(16, diamonds(30), chest('Baú VIP', { coins: 2500, diamonds: 35 }), coins(5000)),
  tier(17, coins(1100), diamonds(80), chest('Baú de Luxo', { coins: 4000, diamonds: 80 })),
  tier(18, diamonds(35), coins(2000), diamonds(180)),
  tier(19, coins(1200), diamonds(90), coins(6000)),
  tier(20, chest('Baú da Temporada', { coins: 2000, diamonds: 50 }), diamonds(120), cosmetic('pedro-elite')),
];

/**
 * Temporada atual.
 *
 * Abrir a próxima é trocar este registro (e guardar o anterior no histórico):
 * telas, trilha e missões se montam a partir dele.
 */
export const SEASON: SeasonDefinition = {
  id: 'temporada-1',
  name: 'Temporada do Pedro',
  tagline: 'Missões · Prêmios · Evolução',
  startsAt: '2026-10-14T00:00:00-03:00',
  endsAt: '2026-12-03T00:00:00-03:00',
  tiers: TIERS,
  levelPriceInDiamonds: 100,
};

const PASSES_BY_ID = new Map(PREMIUM_PASSES.map((pass) => [pass.id, pass]));

export function premiumPass(id: PremiumPassId): PremiumPass {
  const pass = PASSES_BY_ID.get(id);

  if (!pass) {
    throw new Error(`Passe "${id}" não existe em PREMIUM_PASSES.`);
  }

  return pass;
}

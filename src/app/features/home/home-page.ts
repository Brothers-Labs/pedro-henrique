import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AboutSection } from './sections/about-section/about-section';
import { AchievementsSection } from './sections/achievements-section/achievements-section';
import { BirthdaySection } from './sections/birthday-section/birthday-section';
import { ExploreSection } from './sections/explore-section/explore-section';
import { FamilySection } from './sections/family-section/family-section';
import { FavoritesSection } from './sections/favorites-section/favorites-section';
import { GuestbookSection } from './sections/guestbook-section/guestbook-section';
import { HeroSection } from './sections/hero-section/hero-section';
import { MyWaySection } from './sections/my-way-section/my-way-section';
import { PetSummaryCard } from '../pet/pet-summary-card/pet-summary-card';
import { PowersSection } from './sections/powers-section/powers-section';

/**
 * Landing page: cada seção é um componente independente e autossuficiente.
 *
 * Logo abaixo da abertura entra o mascote, com a saudação do dia. É presença
 * discreta de propósito — a home continua sendo a porta do site inteiro, e não
 * a página do mascote.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSection,
    PetSummaryCard,
    AboutSection,
    MyWaySection,
    PowersSection,
    FamilySection,
    ExploreSection,
    FavoritesSection,
    AchievementsSection,
    BirthdaySection,
    GuestbookSection,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {}

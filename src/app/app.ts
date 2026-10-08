import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppStatusBanner } from './layout/app-status-banner/app-status-banner';
import { BottomNav } from './layout/bottom-nav/bottom-nav';
import { SideNav } from './layout/side-nav/side-nav';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SideNav, AppStatusBanner, SiteFooter, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

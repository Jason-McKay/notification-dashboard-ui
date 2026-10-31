import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Login } from './login/login';
import { NotificationList } from './notifications/notification-list';
import { Overview } from './overview/overview';
import { Shell } from './shell/shell';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in | Notification dashboard' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: Overview, title: 'Overview | Notification dashboard' },
      {
        path: 'notifications',
        component: NotificationList,
        title: 'Notifications | Notification dashboard',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

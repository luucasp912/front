import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'seguimiento',
    loadComponent: () =>
      import('./pages/pantalla-buscar-bolsin/pantalla-buscar-bolsin')
        .then((m) => m.PantallaBuscarBolsin),
  },
];

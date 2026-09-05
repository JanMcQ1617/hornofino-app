// Hook de la carta viva. useSyncExternalStore para que cualquier pantalla que
// la pinte se vuelva a renderizar sola cuando el refresco de red traiga una
// carta nueva — sin pasar la carta por props ni por el contexto de la canasta.

import { useSyncExternalStore } from 'react';

import { getMenuSections, subscribeMenu, type MenuSection } from '@/lib/menu';

export function useMenu(): MenuSection[] {
  return useSyncExternalStore(subscribeMenu, getMenuSections, getMenuSections);
}

export function useMenuItemCount(): number {
  const sections = useMenu();
  return sections.reduce((n, s) => n + s.items.length, 0);
}

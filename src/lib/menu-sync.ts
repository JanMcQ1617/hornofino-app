// Trae la carta del puente en vez de usar la que viene compilada.
//
// POR QUÉ: hasta ahora la carta vivía en src/lib/menu.ts dentro del binario, así
// que cambiar un precio significaba recompilar la app y volver a subirla a
// TestFlight/App Store — días, por un número. Ahora la carta la sirve el puente
// (GET /api/app-menu), que la parsea del menu-data.js del sitio: la MISMA fuente
// de la que sale el precio de la orden, así que app y web no pueden discrepar.
//
// ORDEN DE ARRANQUE, y el porqué de cada paso:
//   1. semilla compilada  → la pantalla nunca abre en blanco
//   2. caché en disco     → al segundo arranque se ve la carta buena al instante
//   3. red                → refresca en segundo plano
// Cada paso solo pisa al anterior si trae algo válido (ver isUsableMenu). Una
// carta vieja siempre es mejor que una pantalla vacía: sin esto, un puente caído
// dejaría la app sin nada que vender.
//
// Las FOTOS no se descargan: siguen siendo assets locales, resueltas por el id de
// la sección (SECTION_IMAGES). Una sección nueva que el binario no conozca sale
// sin foto, pero con sus items — degradar, no romper.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMenuSections, isUsableMenu, setMenuSections, type MenuSection } from '@/lib/menu';

const BRIDGE = 'https://hornofino-orders.fly.dev';
const CACHE_KEY = 'hf_menu_v1';
const ETAG_KEY = 'hf_menu_etag_v1';

/** Corta rápido: al abrir la app nadie espera por la carta, ya hay una. */
const TIMEOUT_MS = 8000;

type CachedMenu = { sections: MenuSection[]; savedAt: number };

/** Paso 2: lo que se guardó la última vez. Síncrono para el ojo, no para la red. */
export async function loadCachedMenu(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const parsed: CachedMenu = JSON.parse(raw);
    return setMenuSections(parsed?.sections);
  } catch {
    return false; // caché corrupta: se ignora y queda la semilla
  }
}

/**
 * Paso 3: refresca desde el puente.
 *
 * Manda el ETag guardado: si la carta no cambió el puente contesta 304 y no se
 * bajan 40 KB en cada arranque. Devuelve true solo si la carta VIVA cambió.
 */
export async function refreshMenu(): Promise<boolean> {
  try {
    const etag = await AsyncStorage.getItem(ETAG_KEY);
    const res = await fetch(`${BRIDGE}/api/app-menu`, {
      headers: etag ? { 'if-none-match': etag } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 304) return false; // sin cambios, y sin gastar datos
    if (!res.ok) return false;

    const body = await res.json();
    // El puente manda {sections:[...]}; se valida ANTES de tocar nada — un HTML
    // de error o un 200 raro no puede vaciar la carta.
    if (!isUsableMenu(body?.sections)) return false;
    if (!setMenuSections(body.sections)) return false;

    const newEtag = res.headers.get('etag');
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify({ sections: body.sections, savedAt: Date.now() } as CachedMenu)],
      ...(newEtag ? ([[ETAG_KEY, newEtag]] as [string, string][]) : []),
    ]);
    return true;
  } catch {
    return false; // sin red, o el puente durmiendo: se queda la que hay
  }
}

/** Arranque completo: caché primero (instantánea), red después (en segundo plano). */
export async function hydrateMenu(): Promise<void> {
  await loadCachedMenu();
  void refreshMenu();
}

/** Cuántos items tiene la carta viva — lo usan las pantallas de elección. */
export function menuItemCount(): number {
  return getMenuSections().reduce((n, s) => n + s.items.length, 0);
}

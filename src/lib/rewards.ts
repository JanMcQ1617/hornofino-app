// Vencimiento de Horno Rewards, del lado del app.
//
// El servidor es quien manda: netlify/lib/rewards-expiry.mjs calcula las
// fechas y las barre. Aquí solo se DECIDE QUÉ ENSEÑAR y con qué palabras,
// para que Inicio y Mi QR no se contradigan.
//
// Las dos pantallas usan `expiryNotice()`; si mañana cambia el tono del
// aviso, cambia en un sitio.

import type { RewardsCard } from '@/lib/api';
import { longDate } from '@/lib/format';

/** Se avisa a falta de 7 días. Mismo número que AVISO_MS en el servidor. */
export const AVISO_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cuánto dura una tarjeta, SOLO para escribirlo en el texto — quien decide
 * de verdad es el servidor (netlify/lib/rewards-expiry.mjs), que es quien
 * manda las fechas ya calculadas. Esto existe para que la frase "se renueva
 * 2 meses" no quede escrita a mano en cuatro sitios y se desincronice el
 * día que el cliente pida otro plazo — que ya pasó dos veces.
 */
export const MESES_SELLOS = 2;

export type ExpiryNotice = {
  /** 'premio' = un quesito ya ganado; 'sellos' = progreso sin llenar. */
  kind: 'premio' | 'sellos';
  /** ms epoch */
  at: number;
  /** Titular corto — cabe en la banda de Inicio en una línea. */
  title: string;
  /** Segunda línea: qué hacer al respecto. */
  hint: string;
};

/** La fecha más cercana de premio pendiente, o null. */
export function rewardExpiry(card: RewardsCard | null): number | null {
  if (!card?.rewards?.length) return null;
  const fechas = card.rewards
    .map((c) => card.rewardsExpireAt?.[c])
    .filter((n): n is number => typeof n === 'number' && n > 0);
  return fechas.length ? Math.min(...fechas) : null;
}

/** La fecha de los sellos, o null si no hay sellos (o el servidor es viejo). */
export function stampsExpiry(card: RewardsCard | null): number | null {
  const at = card?.stampsExpireAt;
  return typeof at === 'number' && at > 0 ? at : null;
}

/**
 * Qué aviso toca enseñar, si alguno. Devuelve null mientras falte más de un
 * mes — la fecha existe siempre, pero enseñarla siempre convierte una
 * tarjeta de panadería en una cuenta regresiva.
 *
 * Cuando las dos cosas están por vencer gana la MÁS CERCANA, no la más
 * valiosa: es la que de verdad corre peligro esta semana, y las dos fechas
 * salen juntas en Mi QR de todos modos.
 */
export function expiryNotice(card: RewardsCard | null, now = Date.now()): ExpiryNotice | null {
  const candidatos: ExpiryNotice[] = [];

  const premio = rewardExpiry(card);
  if (premio != null && premio > now && premio - now <= AVISO_MS) {
    const varios = (card?.rewards?.length ?? 0) > 1;
    candidatos.push({
      kind: 'premio',
      at: premio,
      title: varios
        ? `Tus quesitos gratis empiezan a vencer el ${longDate(premio)}`
        : `Tu quesito gratis vence el ${longDate(premio)}`,
      hint: 'Pásate a buscarlo — este no se renueva',
    });
  }

  const sellos = stampsExpiry(card);
  if (sellos != null && sellos > now && sellos - now <= AVISO_MS && (card?.stamps ?? 0) > 0) {
    const n = card!.stamps;
    candidatos.push({
      kind: 'sellos',
      at: sellos,
      title: n === 1
        ? `Tu sello vence el ${longDate(sellos)}`
        : `Tus ${n} sellos vencen el ${longDate(sellos)}`,
      hint: `Una compra más y la tarjeta se renueva ${MESES_SELLOS} meses`,
    });
  }

  if (!candidatos.length) return null;
  return candidatos.sort((a, b) => a.at - b.at)[0];
}

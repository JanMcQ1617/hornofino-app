export type StoreId = 'cupey' | 'guaynabo' | 'bayamon';

export type Store = {
  id: StoreId;
  name: string;
  /** nombre corto para chips */
  short: string;
  address: string;
  city: string;
  /** Texto para LEER. No se parsea nunca — ver `open`. */
  hours: { label: string; value: string }[];
  /**
   * El mismo horario en minutos desde medianoche, para poder calcular si la
   * tienda está abierta AHORA. Se guarda aparte del texto a propósito:
   * parsear "7:00 AM – 6:00 PM" es frágil (guion largo, AM/PM, espacios) y ese
   * texto existe para leerse, no para hacer cuentas. Si cambia un horario hay
   * que tocar los dos — por eso están pegados uno al lado del otro.
   */
  open: {
    /** lunes a sábado */
    weekday: { from: number; to: number };
    /** domingo */
    sunday: { from: number; to: number };
  };
  phone?: string;
};

const H = (h: number, m = 0) => h * 60 + m;

export const STORES: Store[] = [
  {
    id: 'cupey',
    name: 'Cupey',
    short: 'Cupey',
    address: 'Cupey Professional Mall, C. San Claudio',
    city: 'San Juan 00926',
    hours: [
      { label: 'L–S', value: '7:00 AM – 6:00 PM' },
      { label: 'Dom', value: '7:00 AM – 3:00 PM' },
    ],
    open: { weekday: { from: H(7), to: H(18) }, sunday: { from: H(7), to: H(15) } },
  },
  {
    id: 'guaynabo',
    name: 'Apolo · Guaynabo',
    short: 'Apolo',
    address: 'CC Apolo, Av. Lic. R. Rodríguez Apolo, Local #7',
    city: 'Guaynabo 00969',
    hours: [
      { label: 'L–S', value: '6:00 AM – 8:00 PM' },
      { label: 'Dom', value: '6:00 AM – 5:00 PM' },
    ],
    open: { weekday: { from: H(6), to: H(20) }, sunday: { from: H(6), to: H(17) } },
    phone: '787-272-8828',
  },
  {
    id: 'bayamon',
    name: 'Los Filtros · Bayamón',
    short: 'Los Filtros',
    address: 'CC Los Filtros, Local #9',
    city: 'Bayamón 00956',
    hours: [
      { label: 'L–S', value: '6:00 AM – 10:00 PM' },
      { label: 'Dom', value: '6:00 AM – 8:00 PM' },
    ],
    open: { weekday: { from: H(6), to: H(22) }, sunday: { from: H(6), to: H(20) } },
  },
];

export function getStore(id: StoreId | string | null | undefined): Store {
  return STORES.find((s) => s.id === id) ?? STORES[0];
}

/* ------------------------------------------------------------------ */
/* ¿Está abierta ahora?                                                */
/* ------------------------------------------------------------------ */

/**
 * Puerto Rico es AST (UTC−4) TODO el año — no hay horario de verano.
 *
 * Se calcula la hora de PR explícitamente en vez de usar la hora local del
 * teléfono: si el cliente anda de viaje, el teléfono está en otra zona y le
 * diría que la panadería está cerrada cuando lleva horas abierta.
 */
const AST_OFFSET_MIN = -4 * 60;

function prNow(now: Date): { minutes: number; day: number } {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const pr = new Date(utcMs + AST_OFFSET_MIN * 60_000);
  return { minutes: pr.getHours() * 60 + pr.getMinutes(), day: pr.getDay() };
}

function fmt(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}:00 ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export type OpenState =
  | { kind: 'open'; closesAt: string; /** cierra en menos de una hora */ closingSoon: boolean }
  | { kind: 'closed'; opensAt: string };

/** Estado de la tienda en este momento, en hora de Puerto Rico. */
export function storeOpenState(store: Store, now: Date = new Date()): OpenState {
  const { minutes, day } = prNow(now);
  const today = day === 0 ? store.open.sunday : store.open.weekday;
  if (minutes >= today.from && minutes < today.to) {
    return { kind: 'open', closesAt: fmt(today.to), closingSoon: today.to - minutes <= 60 };
  }
  // Antes de abrir hoy → abre hoy. Después de cerrar → abre mañana.
  const tomorrow = (day + 1) % 7 === 0 ? store.open.sunday : store.open.weekday;
  const next = minutes < today.from ? today.from : tomorrow.from;
  return { kind: 'closed', opensAt: fmt(next) };
}

/* ------------------------------------------------------------------ */
/* Turnos de recogida                                                  */
/* ------------------------------------------------------------------ */

/** Mínimo que tarda la panadería en tener una orden lista. */
const PREP_MIN = 20;
/** Cada cuánto se ofrece un turno. */
const SLOT_MIN = 15;
/** Hasta cuántas horas hacia adelante se ofrecen turnos. */
const WINDOW_MIN = 4 * 60;

export type PickupSlot = { value: string; label: string };

/**
 * Turnos disponibles HOY para esta tienda, en hora de Puerto Rico.
 *
 * Reglas:
 *  · Nunca antes de PREP_MIN — prometer "en 5 minutos" es prometer lo que la
 *    panadería no puede cumplir.
 *  · Nunca fuera del horario de la tienda.
 *  · Solo hoy. Si ya cerró, la lista sale vacía y el checkout se queda con
 *    "lo antes posible" — es más honesto que ofrecer "8:00 AM" sin decir de
 *    qué día, que es justo el tipo de ambigüedad que hace que alguien llegue
 *    a una puerta cerrada.
 */
export function pickupSlots(store: Store, now: Date = new Date()): PickupSlot[] {
  const { minutes, day } = prNow(now);
  const today = day === 0 ? store.open.sunday : store.open.weekday;

  const earliest = Math.max(minutes + PREP_MIN, today.from);
  // redondea hacia arriba al siguiente múltiplo de SLOT_MIN
  const first = Math.ceil(earliest / SLOT_MIN) * SLOT_MIN;
  const last = Math.min(today.to, minutes + WINDOW_MIN);

  const out: PickupSlot[] = [];
  for (let t = first; t <= last; t += SLOT_MIN) out.push({ value: fmt(t), label: fmt(t) });
  return out;
}

// Cliente del PUENTE de Clover (hornofino-orders, en Fly.io).
//
// Dos servidores, dos trabajos distintos:
//   · api.mjs (hornofino.netlify.app) — órdenes de pago-al-recoger, Horno
//     Rewards y seguimiento. Es lo que el app usa desde siempre.
//   · este puente — habla con las cajas Clover de verdad: cobra online por
//     Clover Hosted Checkout, crea la orden PAGADA e imprime el ticket.
//
// Por qué el cobro NO se hace dentro del app: Hosted Checkout enseña la
// página de pago de Clover, así que el número de tarjeta nunca pasa por
// nuestro código ni por nuestros servidores. Eso deja el cumplimiento PCI del
// lado de Clover, que es exactamente donde queremos que esté. Meter campos de
// tarjeta en el app sería más trabajo Y más riesgo.

import AsyncStorage from '@react-native-async-storage/async-storage';

const BRIDGE = 'https://hornofino-orders.fly.dev';
const TIMEOUT_MS = 15000;

export class BridgeError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'bridge_error', status = 0) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BRIDGE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new BridgeError('No pudimos conectar con la caja. Intenta de nuevo.', 'offline');
  }
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string; message?: string; code?: string })
    | null;
  if (!res.ok) {
    throw new BridgeError(
      data?.message ?? data?.error ?? 'La caja no aceptó la orden.',
      data?.code ?? 'http_error',
      res.status,
    );
  }
  return data as T;
}

/** Modo de cobro que ofrece cada tienda, según el puente. */
export type BridgeStore = {
  key: string;
  label: string;
  /** both = ambos · pickup = solo al recoger · online = solo tarjeta */
  payments: 'both' | 'pickup' | 'online';
  /** false cuando la caja de esa tienda no contesta */
  ordering: boolean;
};

/**
 * Qué acepta cada tienda AHORA MISMO.
 *
 * Se consulta en vez de asumirse: mientras Jan no cargue el `ecomToken` de
 * Clover, `payments` viene como "pickup" y el app simplemente no ofrece pagar
 * con tarjeta. El día que lo cargue, el botón aparece solo — sin publicar una
 * versión nueva del app.
 */
export async function getBridgeStores(): Promise<BridgeStore[]> {
  const data = await call<{ stores: BridgeStore[] }>('/api/stores');
  return Array.isArray(data.stores) ? data.stores : [];
}

export type BridgeCartLine = { itemId: string; qty: number };

export type PayInput = {
  store: string;
  cart: BridgeCartLine[];
  customer: { name: string; phone?: string };
  pickupTime?: string;
  /** clave de idempotencia — el mismo intento no puede cobrar dos veces */
  clientUuid: string;
};

/**
 * Abre una sesión de Clover Hosted Checkout y devuelve la URL de pago.
 *
 * Errores que hay que saber leer:
 *  · 503 `payments_not_ready` — falta el `ecomToken` de esa tienda. Es el
 *    estado normal HOY; no es un fallo, es que todavía no se ha activado.
 *  · 403 `online_disabled`    — esa tienda solo acepta pago al recoger.
 */
export async function startOnlinePayment(
  input: PayInput,
): Promise<{ checkoutUrl: string; totalCents: number }> {
  const { store, ...body } = input;
  return call<{ checkoutUrl: string; totalCents: number }>(
    `/api/${encodeURIComponent(store)}/pay`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/**
 * Clave de idempotencia por intento de compra.
 *
 * No usa crypto a propósito: no protege nada, solo evita que un reintento
 * (o un doble toque) cree dos órdenes. El puente la guarda con UNIQUE, así
 * que basta con que no se repita entre clientes.
 */
export function newClientUuid(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `hf-${Date.now().toString(36)}-${rand()}${rand()}`;
}


/* ------------------------------------------------------------------ */
/* Política de cobro recordada                                         */
/* ------------------------------------------------------------------ */

const POLICY_KEY = 'hf.payPolicy';

/**
 * Última política conocida por tienda.
 *
 * Por qué se recuerda en disco: si una panadería está en `payments: "online"`
 * (solo prepago) y el puente no contesta —red mala, Fly reiniciando— NO se
 * puede caer a "paga al recoger". Eso reabriría justo el hueco que el prepago
 * cierra: alguien ordena, la panadería lo hornea, nadie lo recoge.
 *
 * Con la política guardada, una caída del puente bloquea la orden con un
 * mensaje claro en vez de dejarla pasar sin pagar. Falla CERRADO, no abierto.
 */
export async function loadPayPolicy(): Promise<Record<string, BridgeStore['payments']>> {
  try {
    const raw = await AsyncStorage.getItem(POLICY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function savePayPolicy(map: Record<string, BridgeStore['payments']>): Promise<void> {
  await AsyncStorage.setItem(POLICY_KEY, JSON.stringify(map)).catch(() => {});
}

/**
 * Pregunta al puente y actualiza el recuerdo. Devuelve la política efectiva
 * de esa tienda: lo que diga el puente, y si no contesta, lo último que supimos.
 */
export async function resolvePayPolicy(
  storeId: string,
): Promise<{ store: BridgeStore | null; policy: BridgeStore['payments'] | null }> {
  const remembered = await loadPayPolicy();
  try {
    const list = await getBridgeStores();
    const found = list.find((b) => b.key === storeId) ?? null;
    if (found) {
      remembered[storeId] = found.payments;
      await savePayPolicy(remembered);
    }
    return { store: found, policy: found?.payments ?? remembered[storeId] ?? null };
  } catch {
    return { store: null, policy: remembered[storeId] ?? null };
  }
}

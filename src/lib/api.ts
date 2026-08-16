// Cliente del API vivo de HORNOFINO (https://hornofino.netlify.app).
// El servidor SIEMPRE recalcula los precios por id — el app solo muestra.

const BASE = 'https://hornofino.netlify.app';
const TIMEOUT_MS = 12000;

export type CardHistoryEntry = {
  ts: number;
  store: string;
  /** "orden" = sello por orden en línea; "caja" = sello ponchado en tienda */
  via: 'orden' | 'caja' | string;
};

export type RewardsCard = {
  code: string;
  name: string;
  stamps: number;
  goal: number;
  rewards: string[];
  totalRedeemed: number;
  /**
   * Últimos 10 movimientos, el más nuevo primero. Se está estrenando en el
   * servidor — deploys viejos no lo mandan, así que siempre es opcional.
   */
  history?: CardHistoryEntry[];
};

export type OrderStatusName = 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada';

export type OrderItemPayload = {
  id: string;
  qty: number;
  /**
   * ÍNDICE numérico 0-based dentro de variants del item — NO el label.
   * El servidor hace parseInt(variant) y exige 0 <= vi < variants.length;
   * un label tipo "25 pzs" parsea a 25 y la línea se descarta en silencio.
   */
  variant?: number;
};

export type PlacedOrder = {
  orderId: string;
  total: number;
  /** true cuando hay items "desde" — el total es estimado */
  estimate: boolean | string;
  store: string;
};

export type OrderStatusItem = {
  id: string;
  qty: number;
  /** el servidor guarda el índice numérico; puede llegar como number o string */
  variant?: number | string;
  name?: string;
  price?: number;
};

export type OrderInfo = {
  id: string;
  store: string;
  status: OrderStatusName;
  total: number;
  estimate?: boolean | string;
  ts: number;
  statusTs?: number;
  items: OrderStatusItem[];
};

export type MyOrderSummary = {
  id: string;
  store: string;
  total: number;
  status: OrderStatusName;
  ts: number;
  items: OrderStatusItem[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const OFFLINE_MSG = 'No pudimos conectar. Revisa tu señal y vuelve a intentar.';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(OFFLINE_MSG, 0);
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // cuerpo no-JSON: se maneja abajo por status
  }

  if (!res.ok) {
    const serverMsg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null;
    throw new ApiError(serverMsg ?? defaultErrorFor(res.status), res.status);
  }
  return data as T;
}

function defaultErrorFor(status: number): string {
  if (status === 404) return 'No encontramos eso. Puede que ya no exista.';
  if (status === 429) return 'Muchas consultas seguidas — espera un momentito.';
  if (status >= 500) return 'El horno tuvo un tropiezo. Intenta de nuevo en un ratito.';
  return 'Algo no cuadró. Vuelve a intentar.';
}

/** Crea la tarjeta Horno Rewards. El código de 6 caracteres ES la cuenta. */
export async function joinRewards(name: string): Promise<RewardsCard> {
  const data = await request<{ card: RewardsCard }>('/api/join', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data.card;
}

/** Lee la tarjeta por código. Límite: 30/min por IP — no abusar. */
export async function getCard(code: string): Promise<RewardsCard> {
  const data = await request<{ card: RewardsCard }>(`/api/card?c=${encodeURIComponent(code)}`);
  return data.card;
}

export async function placeOrder(input: {
  store: string;
  items: OrderItemPayload[];
  name: string;
  note?: string;
  card?: string;
  /**
   * Token de Expo para avisar "tu orden está lista". Viaja pegado a la orden
   * a propósito (ver lib/push.ts): así sirve igual con tarjeta o de invitado.
   * Opcional siempre — sin permiso de notificaciones simplemente no va.
   */
  pushToken?: string;
  /**
   * Turno de recogida elegido, ya formateado ("9:15 AM"). Ausente = lo antes
   * posible, que es lo que el ticket de Clover ya imprime por defecto.
   */
  pickupTime?: string;
}): Promise<PlacedOrder> {
  return request<PlacedOrder>('/api/order', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOrderStatus(id: string): Promise<OrderInfo> {
  return request<OrderInfo>(`/api/order-status?id=${encodeURIComponent(id)}`);
}

/**
 * Órdenes anteriores por tarjeta. Este endpoint se está estrenando en el
 * servidor — si todavía no existe (404) devolvemos lista vacía sin drama.
 */
export async function getMyOrders(code: string): Promise<MyOrderSummary[]> {
  try {
    const data = await request<{ orders: MyOrderSummary[] }>(
      `/api/my-orders?c=${encodeURIComponent(code)}`,
    );
    return Array.isArray(data.orders) ? data.orders : [];
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

// Estado global del app: tienda escogida, perfil (nombre + tarjeta),
// canasta y última orden. Todo persiste en AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getCard, joinRewards, type RewardsCard } from '@/lib/api';
import { findMenuItem, type MenuItem, type MenuVariant } from '@/lib/menu';
import type { StoreId } from '@/lib/stores';

/** El servidor recorta qty a 1–50; mismo tope aquí para que la UI no mienta. */
const MAX_QTY = 50;

const K = {
  cart: 'hf.cart',
  store: 'hf.store',
  name: 'hf.name',
  card: 'hf.card',
  lastOrder: 'hf.lastOrder',
  localOrders: 'hf.localOrders',
} as const;

export type CartLine = {
  /** id + variante — clave única dentro de la canasta */
  key: string;
  itemId: string;
  name: string;
  qty: number;
  /**
   * OJO: el API espera el ÍNDICE numérico (0-based) dentro de item.variants,
   * NO el label. Un label tipo "25 pzs" hace parseInt→25, cae fuera de rango
   * y el servidor BOTA la línea en silencio. El label es solo para mostrar.
   */
  variantIndex?: number;
  variantLabel?: string;
  /** precio unitario conocido; undefined en items sin precio */
  unitPrice?: number;
  /** item "desde": el total real lo confirma la tienda */
  from?: boolean;
};

export type SavedOrderLine = {
  itemId: string;
  qty: number;
  variantIndex?: number;
  /** compat: órdenes guardadas viejas solo traían el label */
  variantLabel?: string;
};

export type LastOrder = {
  lines: SavedOrderLine[];
  store: StoreId;
  total: number;
  orderId: string;
  ts: number;
};

export type LocalOrderRef = {
  id: string;
  store: StoreId;
  total: number;
  ts: number;
  summary: string;
};

type AppState = {
  ready: boolean;

  storeId: StoreId;
  setStoreId: (id: StoreId) => void;

  name: string;
  setName: (name: string) => void;

  card: RewardsCard | null;
  joinCard: (name: string) => Promise<RewardsCard>;
  refreshCard: () => Promise<void>;

  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  cartHasEstimate: boolean;
  addToCart: (item: MenuItem, variant?: MenuVariant) => void;
  incrementLine: (key: string) => void;
  decrementLine: (key: string) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  qtyInCart: (itemId: string) => number;

  lastOrder: LastOrder | null;
  localOrders: LocalOrderRef[];
  recordPlacedOrder: (order: LastOrder, summary: string) => void;
  repeatLastOrder: () => boolean;
};

const AppContext = createContext<AppState | null>(null);

function lineKey(itemId: string, variantLabel?: string) {
  return variantLabel ? `${itemId}::${variantLabel}` : itemId;
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storeId, setStoreIdState] = useState<StoreId>('cupey');
  const [name, setNameState] = useState('');
  const [card, setCard] = useState<RewardsCard | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [localOrders, setLocalOrders] = useState<LocalOrderRef[]>([]);
  const lastCardRefresh = useRef(0);

  // Carga inicial — una sola pasada de disco.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          K.cart,
          K.store,
          K.name,
          K.card,
          K.lastOrder,
          K.localOrders,
        ]);
        if (!alive) return;
        const map = Object.fromEntries(entries);
        const st = map[K.store];
        if (st === 'cupey' || st === 'guaynabo' || st === 'bayamon') setStoreIdState(st);
        if (map[K.name]) setNameState(map[K.name] as string);
        const savedCard = parseJSON<RewardsCard>(map[K.card]);
        if (savedCard?.code) setCard(savedCard);
        const savedLast = parseJSON<LastOrder>(map[K.lastOrder]);
        if (savedLast?.lines?.length) setLastOrder(savedLast);
        const savedOrders = parseJSON<LocalOrderRef[]>(map[K.localOrders]);
        if (Array.isArray(savedOrders)) setLocalOrders(savedOrders);
        const savedCart = parseJSON<CartLine[]>(map[K.cart]);
        if (Array.isArray(savedCart) && savedCart.length) setCart(savedCart);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /*
   * La canasta se guarda en disco.
   *
   * Antes vivía SOLO en useState, así que se perdía en cuanto el sistema
   * descargaba la app de memoria — matarla desde el multitarea, o que iOS la
   * reciclara estando en segundo plano. El cliente volvía y su canasta estaba
   * vacía, que se siente exactamente como que la app no guarda nada.
   *
   * El guard de `ready` es lo importante: sin él, este efecto corre en el
   * primer render con la canasta vacía y PISA lo guardado antes de que la
   * carga inicial tenga tiempo de leerlo — o sea, el "arreglo" borraría la
   * canasta cada vez que abres la app.
   */
  useEffect(() => {
    if (!ready) return;
    if (cart.length) AsyncStorage.setItem(K.cart, JSON.stringify(cart)).catch(() => {});
    else AsyncStorage.removeItem(K.cart).catch(() => {});
  }, [cart, ready]);

  const setStoreId = useCallback((id: StoreId) => {
    setStoreIdState(id);
    AsyncStorage.setItem(K.store, id).catch(() => {});
  }, []);

  const setName = useCallback((n: string) => {
    setNameState(n);
    AsyncStorage.setItem(K.name, n).catch(() => {});
  }, []);

  const persistCard = useCallback((c: RewardsCard | null) => {
    setCard(c);
    if (c) AsyncStorage.setItem(K.card, JSON.stringify(c)).catch(() => {});
    else AsyncStorage.removeItem(K.card).catch(() => {});
  }, []);

  const joinCard = useCallback(
    async (joinName: string) => {
      const newCard = await joinRewards(joinName.trim());
      persistCard(newCard);
      if (!name.trim() && newCard.name) setName(newCard.name);
      return newCard;
    },
    [name, persistCard, setName],
  );

  // Refresco silencioso, respetando el rate limit del API (30/min/IP).
  const refreshCard = useCallback(async () => {
    if (!card?.code) return;
    const now = Date.now();
    if (now - lastCardRefresh.current < 20000) return;
    lastCardRefresh.current = now;
    try {
      const fresh = await getCard(card.code);
      persistCard(fresh);
    } catch {
      // sin señal o rate limit: nos quedamos con la copia local
    }
  }, [card?.code, persistCard]);

  const addToCart = useCallback((item: MenuItem, variant?: MenuVariant) => {
    if (item.ask) return; // sin precio publicado — no se ordena por el app
    const variantIndex = variant
      ? item.variants?.findIndex((v) => v.label === variant.label)
      : undefined;
    if (variant && (variantIndex == null || variantIndex < 0)) return; // variante que no existe
    const key = lineKey(item.id, variant?.label);
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, qty: Math.min(l.qty + 1, MAX_QTY) } : l,
        );
      }
      const line: CartLine = {
        key,
        itemId: item.id,
        name: variant ? `${item.name} (${variant.label})` : item.name,
        qty: 1,
        variantIndex: variant ? variantIndex : undefined,
        variantLabel: variant?.label,
        unitPrice: variant ? variant.price : item.price,
        from: item.from,
      };
      return [...prev, line];
    });
  }, []);

  const incrementLine = useCallback((key: string) => {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + 1, MAX_QTY) } : l)),
    );
  }, []);

  const decrementLine = useCallback((key: string) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const qtyInCart = useCallback(
    (itemId: string) => cart.reduce((sum, l) => (l.itemId === itemId ? sum + l.qty : sum), 0),
    [cart],
  );

  const recordPlacedOrder = useCallback((order: LastOrder, summary: string) => {
    setLastOrder(order);
    AsyncStorage.setItem(K.lastOrder, JSON.stringify(order)).catch(() => {});
    setLocalOrders((prev) => {
      const ref: LocalOrderRef = {
        id: order.orderId,
        store: order.store,
        total: order.total,
        ts: order.ts,
        summary,
      };
      const next = [ref, ...prev.filter((o) => o.id !== ref.id)].slice(0, 30);
      AsyncStorage.setItem(K.localOrders, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /** Rellena la canasta con la última orden. Devuelve false si algo ya no existe. */
  const repeatLastOrder = useCallback(() => {
    if (!lastOrder) return false;
    const lines: CartLine[] = [];
    for (const saved of lastOrder.lines) {
      const found = findMenuItem(saved.itemId);
      if (!found || found.item.ask) return false;
      const wantsVariant = saved.variantIndex != null || saved.variantLabel != null;
      let variantIndex: number | undefined;
      if (wantsVariant) {
        // preferimos el índice guardado; label es compat con datos viejos
        if (saved.variantIndex != null) {
          variantIndex = saved.variantIndex;
        } else {
          const byLabel = found.item.variants?.findIndex((v) => v.label === saved.variantLabel);
          variantIndex = byLabel != null && byLabel >= 0 ? byLabel : undefined;
        }
        if (
          variantIndex == null ||
          variantIndex < 0 ||
          !found.item.variants ||
          variantIndex >= found.item.variants.length
        ) {
          return false;
        }
      }
      const variant = variantIndex != null ? found.item.variants![variantIndex] : undefined;
      lines.push({
        key: lineKey(saved.itemId, variant?.label),
        itemId: saved.itemId,
        name: variant ? `${found.item.name} (${variant.label})` : found.item.name,
        qty: saved.qty,
        variantIndex,
        variantLabel: variant?.label,
        unitPrice: variant ? variant.price : found.item.price,
        from: found.item.from,
      });
    }
    setCart(lines);
    setStoreId(lastOrder.store);
    return true;
  }, [lastOrder, setStoreId]);

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((s, l) => s + (l.unitPrice ?? 0) * l.qty, 0),
    [cart],
  );
  const cartHasEstimate = useMemo(() => cart.some((l) => l.from), [cart]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      storeId,
      setStoreId,
      name,
      setName,
      card,
      joinCard,
      refreshCard,
      cart,
      cartCount,
      cartSubtotal,
      cartHasEstimate,
      addToCart,
      incrementLine,
      decrementLine,
      removeLine,
      clearCart,
      qtyInCart,
      lastOrder,
      localOrders,
      recordPlacedOrder,
      repeatLastOrder,
    }),
    [
      ready,
      storeId,
      setStoreId,
      name,
      setName,
      card,
      joinCard,
      refreshCard,
      cart,
      cartCount,
      cartSubtotal,
      cartHasEstimate,
      addToCart,
      incrementLine,
      decrementLine,
      removeLine,
      clearCart,
      qtyInCart,
      lastOrder,
      localOrders,
      recordPlacedOrder,
      repeatLastOrder,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

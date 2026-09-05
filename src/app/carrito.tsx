// Tu canasta — revisar, poner nombre y enviar. Sin cuentas, sin tarjetas de crédito:
// pagas al recoger.

import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/buttons';
import { EmptyState } from '@/components/empty-state';
import { ChevronRightIcon, MinusIcon, PinIcon, PlusIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { StoreSheet } from '@/components/store-sheet';
import { ApiError, placeOrder } from '@/lib/api';
import {
  BridgeError,
  newClientUuid,
  resolvePayPolicy,
  startOnlinePayment,
  getPayStatus,
  type BridgeStore,
} from '@/lib/bridge';
import { getPushToken } from '@/lib/push';
import { money, summarizeLines } from '@/lib/format';
import { useApp } from '@/lib/state';
import { getStore, pickupSlots, storeOpenState } from '@/lib/stores';
import { colors, fonts, motion, radius, space, textSize, tracking } from '@/lib/theme';

export default function CarritoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cart,
    cartSubtotal,
    cartHasEstimate,
    incrementLine,
    decrementLine,
    clearCart,
    storeId,
    name,
    setName,
    card,
    recordPlacedOrder,
  } = useApp();

  const [orderName, setOrderName] = useState(name);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const reduced = useReducedMotion();

  const store = getStore(storeId);
  const openState = storeOpenState(store);

  /*
   * ¿Esta tienda cobra con tarjeta?
   *
   * Se le PREGUNTA al puente en vez de asumirlo. Hoy el puente todavía no
   * tiene tiendas configuradas, así que devuelve lista vacía y el checkout se
   * queda exactamente como está: pago al recoger, sin UI nueva. El día que se
   * carguen las credenciales de Clover, la opción de tarjeta aparece sola, sin
   * publicar una versión nueva del app.
   *
   * Si el puente no contesta no pasa nada: se cae a pago al recoger.
   */
  const [bridgeStore, setBridgeStore] = useState<BridgeStore | null>(null);
  const [policy, setPolicy] = useState<BridgeStore['payments'] | null>(null);
  useEffect(() => {
    let alive = true;
    resolvePayPolicy(storeId)
      .then(({ store: bs, policy: p }) => {
        if (!alive) return;
        setBridgeStore(bs);
        setPolicy(p);
      })
      .catch(() => {
        if (alive) {
          setBridgeStore(null);
          setPolicy(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [storeId]);

  const canPayOnline =
    !!bridgeStore?.ordering &&
    (bridgeStore.payments === 'both' || bridgeStore.payments === 'online');

  /*
   * Prepago obligatorio (decisión de Jan, 2026-08-14): una orden hecha por el
   * app que se paga "al recoger" se puede quedar sin recoger, y la panadería
   * ya la horneó. Si la tienda está en `online`, no hay camino sin pagar.
   *
   * `policy` viene del recuerdo en disco, NO solo de la respuesta de ahora: si
   * el puente no contesta, seguimos exigiendo prepago en vez de abrir la
   * puerta que acabamos de cerrar. Falla cerrado.
   */
  const mustPayOnline = policy === 'online';
  /** prepago obligatorio pero el puente no está disponible para cobrar */
  const payBlocked = mustPayOnline && !canPayOnline;
  const [payOnline, setPayOnline] = useState(false);
  /** ref de una orden ya PAGADA — se muestra en verde, no en la caja de error */
  const [paidRef, setPaidRef] = useState<string | null>(null);
  const useCard = canPayOnline && (mustPayOnline || payOnline);

  // Una sola clave por intento: si el cobro se reintenta, el puente reconoce
  // que es la MISMA compra y no crea una orden duplicada.
  const clientUuid = useRef(newClientUuid());
  const [pickupTime, setPickupTime] = useState<string | null>(null);

  /*
   * Cerrado = NO se ordena (Jan, 2 sep 2026). Antes pickupSlots() salía vacía
   * fuera de horario y el checkout simplemente caía a "lo antes posible": la
   * orden entraba igual, a una panadería cerrada, y alguien la horneaba al
   * abrir sin que nadie la esperara. Ahora la hora de la tienda es una
   * compuerta, no una sugerencia.
   *
   * Sin useMemo a propósito, misma razón que los turnos: recalcular en cada
   * render evita que un checkout abierto desde antes de cerrar siga creyendo
   * que está abierto.
   */
  const storeClosed = openState.kind === 'closed';

  // Sin useMemo a propósito: son ≤17 elementos y recalcular en cada render
  // mantiene los turnos frescos si alguien deja el checkout abierto un rato.
  // Con memo, a la media hora estarías ofreciendo horas que ya pasaron.
  const slots = pickupSlots(store);
  // Si el turno elegido se cayó de la lista (pasó la hora, o cambió de tienda),
  // se manda "lo antes posible" en vez de prometer una hora imposible.
  const pickupValid = pickupTime != null && slots.some((sl) => sl.value === pickupTime);

  const canSend = cart.length > 0 && orderName.trim().length > 0 && !sending && !storeClosed;

  const summary = useMemo(
    () => summarizeLines(cart.map((l) => ({ qty: l.qty, name: l.name }))),
    [cart],
  );

  /**
   * Cobro con tarjeta vía Clover Hosted Checkout.
   *
   * La tarjeta se escribe en la página de Clover, nunca aquí — por eso esto
   * abre un navegador y no un formulario.
   *
   * OJO con el final: la URL de éxito que arma el puente apunta a una página
   * WEB (`/pago/gracias?ref=pending`), no de vuelta al app, así que al cerrar
   * el navegador NO sabemos si se pagó. Por eso la canasta NO se vacía aquí:
   * vaciarla sin confirmación sería borrarle la compra a alguien cuyo pago
   * falló. El `clientUuid` hace que reintentar sea seguro.
   */
  const payWithCard = async () => {
    // payWithCard se llama desde send(), pero se protege por su cuenta: es un
    // cobro real y no puede depender de que quien lo llame haya mirado la hora.
    const nowState = storeOpenState(store);
    if (nowState.kind === 'closed') {
      setError(`${store.short} está cerrada ahora mismo. Abre a las ${nowState.opensAt}.`);
      return;
    }
    const trimmedName = orderName.trim();
    setSending(true);
    setError(null);
    setPaidRef(null);
    try {
      const { checkoutUrl } = await startOnlinePayment({
        store: storeId,
        cart: cart.map((l) => ({ itemId: l.itemId, qty: l.qty })),
        customer: { name: trimmedName },
        ...(pickupValid && pickupTime ? { pickupTime } : {}),
        clientUuid: clientUuid.current,
      });
      if (trimmedName !== name) setName(trimmedName);
      await WebBrowser.openBrowserAsync(checkoutUrl);

      /*
       * El navegador se cerró: puede que haya pagado, o que se haya arrepentido.
       * El puente lo sabe — el webhook de Clover crea la orden con este mismo
       * clientUuid — así que se le pregunta en vez de adivinar.
       *
       * Antes esto dejaba la canasta llena y un mensaje de "si pagaste, ya entró".
       * Quien pagaba se quedaba sin confirmación y sin número de orden, mirando su
       * canasta intacta como si no hubiera pasado nada.
       *
       * El webhook puede tardar un segundo en llegar, de ahí los reintentos. Si no
       * aparece, la canasta se queda: no se borra una compra sin confirmarla.
       */
      let paid: Awaited<ReturnType<typeof getPayStatus>> = { found: false };
      for (let attempt = 0; attempt < 4 && !paid.found; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 1200));
        paid = await getPayStatus(clientUuid.current);
      }

      if (paid.found) {
        recordPlacedOrder(
          {
            lines: cart.map((l) => ({
              itemId: l.itemId,
              qty: l.qty,
              ...(l.variantIndex != null ? { variantIndex: l.variantIndex } : {}),
              ...(l.variantLabel ? { variantLabel: l.variantLabel } : {}),
            })),
            store: storeId,
            total: cartSubtotal,
            orderId: paid.ref,
            ts: Date.now(),
          },
          summary,
        );
        clearCart();
        // Clave nueva: la anterior ya es una compra pagada y el puente la reconocería.
        clientUuid.current = newClientUuid();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPaidRef(paid.ref);
        return;
      }

      setError(
        'Si completaste el pago, tu orden entra sola a la caja — puede tardar unos segundos en confirmarse. Si no pagaste, tu canasta sigue aquí y no se cobró nada.',
      );
    } catch (e) {
      setError(
        e instanceof BridgeError
          ? e.code === 'payments_not_ready'
            ? 'El pago con tarjeta todavía no está activado en esta panadería.'
            : e.message
          : 'No se pudo abrir el pago. Intenta de nuevo.',
      );
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!canSend) return;
    // Se vuelve a preguntar la hora AQUÍ: `storeClosed` se calculó en el
    // último render, que pudo haber sido antes de la hora de cierre.
    const nowState = storeOpenState(store);
    if (nowState.kind === 'closed') {
      setError(
        `${store.short} está cerrada ahora mismo. Abre a las ${nowState.opensAt} — tu canasta te espera.`,
      );
      return;
    }
    if (payBlocked) {
      setError(
        'Ahora mismo no podemos cobrar en línea y esta panadería solo toma órdenes pagadas. Intenta en un momento.',
      );
      return;
    }
    if (useCard) return payWithCard();
    setSending(true);
    setError(null);
    const trimmedName = orderName.trim();
    try {
      // Se pide el permiso AQUÍ, no al abrir la app: en este momento el porqué
      // es obvio. Nunca frena la orden — si no hay token, sale sin él.
      const pushToken = await getPushToken();
      const placed = await placeOrder({
        store: storeId,
        items: cart.map((l) => ({
          id: l.itemId,
          qty: l.qty,
          // el API espera el ÍNDICE 0-based de la variante, nunca el label
          ...(l.variantIndex != null ? { variant: l.variantIndex } : {}),
        })),
        name: trimmedName,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(card?.code ? { card: card.code } : {}),
        ...(pushToken ? { pushToken } : {}),
        ...(pickupValid && pickupTime ? { pickupTime } : {}),
      });
      if (trimmedName !== name) setName(trimmedName);
      recordPlacedOrder(
        {
          lines: cart.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            ...(l.variantIndex != null ? { variantIndex: l.variantIndex } : {}),
            ...(l.variantLabel ? { variantLabel: l.variantLabel } : {}),
          })),
          store: storeId,
          total: placed.total,
          orderId: placed.orderId,
          ts: Date.now(),
        },
        summary,
      );
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace({ pathname: '/pedido/[id]', params: { id: placed.orderId, nueva: '1' } });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo enviar el pedido. Vuelve a intentar.',
      );
      setSending(false);
    }
  };

  /*
   * Un pago recién confirmado vacía la canasta, y sin esto la pantalla saltaría al
   * "tu canasta está vacía": alguien acabaría de pagar y lo primero que vería es que
   * no tiene nada. La confirmación va PRIMERO, con el número de orden.
   */
  if (paidRef) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <EmptyState
          title="¡Pago recibido!"
          body={`Tu orden es ${paidRef} y ya entró a la caja de ${store.short}. Solo pasa a recogerla — no hay que pagar nada más.`}
          actionLabel="Volver a la carta"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <EmptyState
          title="Tu canasta está vacía"
          body="El pan no se va a ordenar solo. Dale un vistazo a la carta."
          actionLabel="Ver la carta"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.lines}>
          {cart.map((line) => (
            // `layout` es lo que hace que quitar una línea se sienta
            // considerado: las de abajo SUBEN con muelle en vez de saltar a su
            // nueva posición. `exiting` la encoge en el sitio, así el ojo ve
            // qué desapareció en vez de encontrarse la lista ya reordenada.
            <Animated.View
              key={line.key}
              layout={reduced ? undefined : LinearTransition.springify().damping(20).stiffness(220)}
              entering={reduced ? undefined : FadeInDown.duration(motion.base)}
              exiting={reduced ? undefined : FadeOut.duration(motion.exit)}
              style={styles.line}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {line.name}
                </Text>
                <Text style={styles.lineUnit}>
                  {line.from ? 'desde ' : ''}
                  {line.unitPrice != null ? money(line.unitPrice) : ''}
                  {line.from ? ', se confirma en tienda' : ''}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => {
                    decrementLine(line.key);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar un ${line.name}`}
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                >
                  <MinusIcon size={14} color={colors.ink} strokeWidth={2.4} />
                </Pressable>
                <Text style={styles.stepQty}>{line.qty}</Text>
                <Pressable
                  onPress={() => {
                    incrementLine(line.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir otro ${line.name}`}
                  style={({ pressed }) => [styles.stepBtn, styles.stepBtnPlus, pressed && styles.pressed]}
                >
                  <PlusIcon size={14} color={colors.ink} strokeWidth={2.4} />
                </Pressable>
              </View>
              <Text style={styles.lineTotal}>
                {line.unitPrice != null ? money(line.unitPrice * line.qty) : '—'}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/*
          Aquí la tienda NO es un chip discreto: es a dónde va a parar la orden
          y dónde hay que ir a buscarla. En el checkout esa decisión merece una
          fila entera con dirección y estado, no una pastillita en la esquina.
        */}
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Recoges en</Text>
          <PressableScale
            onPress={() => setStoreSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Recoges en ${store.name}, ${store.address}. ${
              openState.kind === 'open'
                ? `Abierto hasta ${openState.closesAt}`
                : `Cerrado, abre ${openState.opensAt}`
            }. Toca para cambiar de panadería`}
            style={styles.storeRow}
          >
            <PinIcon size={18} color={colors.verdeInk} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeAddr} numberOfLines={1}>
                {store.address}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.inkFaint} />
          </PressableScale>

          {openState.kind === 'closed' ? (
            // BLOQUEA, ya no solo advierte (Jan, 2 sep 2026). Este aviso decía
            // "puedes enviar tu orden igual"; con la compuerta puesta esa frase
            // contradecía al botón apagado, así que cambia con la regla.
            <View style={styles.closedNote}>
              <Text style={styles.closedNoteText}>
                Ahora mismo está cerrada, así que no se pueden enviar órdenes. Abre a las{' '}
                {openState.opensAt} — tu canasta se queda guardada.
              </Text>
            </View>
          ) : openState.closingSoon ? (
            <View style={styles.soonNote}>
              <Text style={styles.soonNoteText}>
                Cierra a las {openState.closesAt} — pasa a buscarla antes.
              </Text>
            </View>
          ) : null}
        </View>

        {slots.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>¿A qué hora la buscas?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.slotRow}
            >
              <PressableScale
                onPress={() => setPickupTime(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: !pickupValid }}
                accessibilityLabel="Recoger lo antes posible"
                style={[styles.slot, !pickupValid && styles.slotOn]}
              >
                <Text style={[styles.slotText, !pickupValid && styles.slotTextOn]}>
                  Lo antes posible
                </Text>
              </PressableScale>
              {slots.map((sl) => {
                const on = pickupValid && pickupTime === sl.value;
                return (
                  <PressableScale
                    key={sl.value}
                    onPress={() => setPickupTime(sl.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Recoger a las ${sl.label}`}
                    style={[styles.slot, on && styles.slotOn]}
                  >
                    <Text style={[styles.slotText, on && styles.slotTextOn]}>{sl.label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {canPayOnline && !mustPayOnline ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>¿Cómo pagas?</Text>
            <View style={styles.payRow}>
              <PressableScale
                onPress={() => setPayOnline(false)}
                accessibilityRole="button"
                accessibilityState={{ selected: !payOnline }}
                accessibilityLabel="Pagar al recoger, en la panadería"
                style={[styles.payOpt, !payOnline && styles.payOptOn]}
              >
                <Text style={[styles.payOptText, !payOnline && styles.payOptTextOn]}>
                  Al recoger
                </Text>
              </PressableScale>
              <PressableScale
                onPress={() => setPayOnline(true)}
                accessibilityRole="button"
                accessibilityState={{ selected: payOnline }}
                accessibilityLabel="Pagar ahora con tarjeta, en la página segura de Clover"
                style={[styles.payOpt, payOnline && styles.payOptOn]}
              >
                <Text style={[styles.payOptText, payOnline && styles.payOptTextOn]}>
                  Con tarjeta
                </Text>
              </PressableScale>
            </View>
            {payOnline ? (
              <Text style={styles.cardNote}>
                Se abre la página segura de Clover para pagar. Tu tarjeta nunca pasa por el app.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockLabel}>¿A nombre de quién?</Text>
          <TextInput
            value={orderName}
            onChangeText={setOrderName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="done"
            accessibilityLabel="Nombre para la orden"
            style={styles.input}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Nota pa’l horno (opcional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ej: el pan bien tostadito"
            placeholderTextColor={colors.inkFaint}
            multiline
            accessibilityLabel="Nota opcional para la panadería"
            style={[styles.input, styles.noteInput]}
          />
        </View>

        {card ? (
          <View style={styles.stampNote}>
            <Text style={styles.stampNoteText}>
              ✓ Acumulas 1 sello con esta orden — va directo a tu tarjeta {card.code}.
            </Text>
          </View>
        ) : (
          <View style={[styles.stampNote, { backgroundColor: colors.paper2 }]}>
            <Text style={[styles.stampNoteText, { color: colors.inkSoft }]}>
              ¿Sabías? Con Horno Rewards cada orden poncha un sello — únete gratis en Mi QR.
            </Text>
          </View>
        )}

        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            {/* Pagando con tarjeta esto NO es el total: el IVU lo calcula Clover con las
                tasas del register (7% en casi todo, y hay artículos exentos), así que el
                cobro real sale en la página de pago. Llamarlo "Total" y cobrar más es
                justo lo que hace desconfiar a alguien de una app de pagos. */}
            <Text style={styles.totalLabel}>
              {cartHasEstimate ? 'Total estimado' : useCard ? 'Subtotal' : 'Total'}
            </Text>
            <Text style={styles.totalValue}>{money(cartSubtotal)}</Text>
          </View>
          {cartHasEstimate ? (
            <Text style={styles.estimateNote}>
              Los items “desde” se cobran según lo que escojas en tienda — el precio final te lo
              confirman al recoger.
            </Text>
          ) : null}
          {/* La tienda puede estar en "solo pago en línea" — prometer que se paga al
              recoger y acto seguido cobrarle la tarjeta es una mentira, no un detalle. */}
          <Text style={styles.payNote}>
            {useCard
              ? 'Pagas ahora con tarjeta. El IVU se añade en la página de pago, donde ves el total exacto antes de confirmar.'
              : 'Pagas al recoger, como siempre.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {/* Sin cifra en el botón cuando se paga con tarjeta: el importe que se cobra
            lo fija Clover con el IVU, y poner aquí el subtotal sería prometer un
            número que no es el que se cobra. El subtotal ya se ve justo arriba. */}
        <PrimaryButton
          label={
            storeClosed
              ? `Cerrado hasta las ${openState.opensAt}`
              : useCard
                ? 'Continuar al pago'
                : `Enviar pedido de ${money(cartSubtotal)}`
          }
          loadingLabel={useCard ? 'Abriendo el pago seguro…' : 'Enviando tu pedido…'}
          onPress={send}
          disabled={!canSend}
          loading={sending}
          accessibilityLabel={
            storeClosed
              ? `${store.short} está cerrada. Abre a las ${openState.opensAt}. No se pueden enviar órdenes ahora`
              : useCard
                ? `Continuar al pago, subtotal ${money(cartSubtotal)} más IVU`
                : `Enviar pedido por ${money(cartSubtotal)}`
          }
        />
      </View>

      <StoreSheet visible={storeSheetOpen} onClose={() => setStoreSheetOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  content: {
    padding: space.lg,
    paddingBottom: space.xl,
  },
  lines: {
    gap: 2,
    marginBottom: space.lg,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineSoft,
  },
  lineName: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.bodyLg,
    lineHeight: 20,
    color: colors.ink,
  },
  lineUnit: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper2,
    borderRadius: radius.btn,
    padding: 3,
    gap: 2,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    backgroundColor: colors.marfil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: {
    backgroundColor: colors.naranja,
  },
  stepQty: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fonts.uiBold,
    fontSize: textSize.body,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  lineTotal: {
    minWidth: 62,
    textAlign: 'right',
    fontFamily: fonts.uiSemi,
    fontSize: textSize.bodyLg,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  block: {
    marginBottom: space.lg,
  },
  payRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  payOpt: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.btn,
    paddingVertical: 14,
  },
  payOptOn: {
    backgroundColor: colors.menta,
  },
  payOptText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.bodyLg,
    color: colors.inkSoft,
  },
  payOptTextOn: {
    color: colors.ink,
  },
  cardNote: {
    marginTop: space.sm,
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  slotRow: {
    gap: space.sm,
    paddingVertical: 2,
  },
  slot: {
    backgroundColor: colors.paper,
    borderRadius: radius.btn,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  slotOn: {
    backgroundColor: colors.menta,
  },
  slotText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.body,
    color: colors.inkSoft,
  },
  // Sobre menta, INK — regla 2 del sistema de color.
  slotTextOn: {
    color: colors.ink,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.paper,
    borderRadius: radius.btn,
    padding: space.lg,
  },
  storeName: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.lead,
    color: colors.ink,
  },
  storeAddr: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    color: colors.inkSoft,
    marginTop: 2,
  },
  closedNote: {
    marginTop: space.sm,
    backgroundColor: colors.dangerSuave,
    borderRadius: radius.btn,
    padding: space.md,
  },
  closedNoteText: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.danger,
  },
  soonNote: {
    marginTop: space.sm,
    backgroundColor: colors.naranjaSuave,
    borderRadius: radius.btn,
    padding: space.md,
  },
  soonNoteText: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.naranjaInk,
  },
  blockLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.caption,
    letterSpacing: tracking.base,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: space.sm,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    fontFamily: fonts.uiMedium,
    fontSize: textSize.lead,
    color: colors.ink,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  stampNote: {
    backgroundColor: colors.verdeSuave,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  stampNoteText: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.verdeInk,
  },
  totalBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.lg,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.h1,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  estimateNote: {
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  payNote: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.small,
    color: colors.inkSoft,
  },
  errorBox: {
    marginTop: space.lg,
    backgroundColor: colors.dangerSuave,
    borderRadius: radius.md,
    padding: space.md,
  },
  errorText: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.danger,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    backgroundColor: colors.marfil,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
});

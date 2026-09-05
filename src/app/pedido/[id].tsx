// Seguimiento de la orden en vivo: nueva → preparando → lista → entregada.
// Consulta el estado cada ~15 segundos mientras la pantalla está abierta.

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/empty-state';
import { CheckIcon } from '@/components/icons';
import { ApiError, getOrderStatus, type OrderInfo, type OrderStatusName } from '@/lib/api';
import { money, orderDate } from '@/lib/format';
import { findMenuItem } from '@/lib/menu';
import { getStore } from '@/lib/stores';
import { colors, fonts, motion, radius, shadowCard, space, textSize, tracking } from '@/lib/theme';

const POLL_MS = 15000;

/**
 * El punto del paso ACTUAL late despacio.
 *
 * Es la información más importante de esta pantalla: alguien esperando su
 * comida quiere saber que el sistema sigue vivo y que su orden se está
 * atendiendo AHORA. Un punto quieto no dice eso; un latido calmado sí. Lento
 * a propósito (1.8s) — rápido leería como alarma, no como "va en camino".
 *
 * Mismo motivo de anillo que el intro y la celebración de Clink: el mismo
 * gesto en los momentos que importan es lo que hace que la app tenga firma.
 */
function StepDot({
  done,
  current,
  reduced,
}: {
  done: boolean;
  current: boolean;
  reduced: boolean;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!current || reduced) {
      pulse.set(0);
      return;
    }
    pulse.set(
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [current, reduced, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.9 * pulse.value }],
  }));

  return (
    <View style={styles.stepDotWrap}>
      {current ? <Animated.View pointerEvents="none" style={[styles.stepPulse, ringStyle]} /> : null}
      <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
        {done ? <CheckIcon size={13} color={colors.marfil} strokeWidth={3} /> : null}
        {current ? <View style={styles.stepDotInner} /> : null}
      </View>
    </View>
  );
}

/** El tramo se LLENA de arriba a abajo cuando el paso se completa. */
function StepLine({ done, reduced }: { done: boolean; reduced: boolean }) {
  const fill = useDerivedValue(() =>
    reduced
      ? done
        ? 1
        : 0
      : withTiming(done ? 1 : 0, { duration: 520, easing: Easing.out(Easing.cubic) }),
  );
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: fill.value }] }));
  return (
    <View style={styles.stepLine}>
      <Animated.View style={[styles.stepLineFill, style]} />
    </View>
  );
}

const STEPS: { status: OrderStatusName; title: string; detail: string }[] = [
  { status: 'nueva', title: 'Recibida', detail: 'Tu orden ya llegó al mostrador' },
  { status: 'preparando', title: 'En el horno', detail: 'La están preparando ahora mismo' },
  { status: 'lista', title: 'Lista pa’ recoger', detail: 'Pasa por caja y di tu nombre' },
  { status: 'entregada', title: 'Entregada', detail: 'Buen provecho' },
];

const STEP_INDEX: Record<OrderStatusName, number> = {
  nueva: 0,
  preparando: 1,
  lista: 2,
  entregada: 3,
  cancelada: -1,
};

/**
 * El API maneja variantes por ÍNDICE numérico (0-based). Aquí lo traducimos
 * de vuelta al label ("25 pzs") para mostrar; si no se puede resolver, se omite.
 */
function variantLabelFor(itemId: string, variant?: number | string): string | null {
  if (variant == null || variant === '') return null;
  const vi = typeof variant === 'number' ? variant : parseInt(variant, 10);
  const variants = findMenuItem(itemId)?.item.variants;
  if (Number.isInteger(vi) && variants && vi >= 0 && vi < variants.length) {
    return variants[vi].label;
  }
  // valor no numérico (p. ej. un label literal de datos viejos): se muestra tal cual
  return typeof variant === 'string' && Number.isNaN(vi) ? variant : null;
}

export default function PedidoScreen() {
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const info = await getOrderStatus(String(id));
      setOrder(info);
      setError(null);
      if ((info.status === 'entregada' || info.status === 'cancelada') && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (e) {
      // Si ya teníamos data, un fallo puntual del poll no borra la pantalla.
      setOrder((prev) => {
        if (!prev) {
          setError(e instanceof ApiError ? e.message : 'No pudimos cargar la orden.');
        }
        return prev;
      });
    }
  }, [id]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  if (error && !order) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            load();
          }}
        />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <LoadingState label={`Buscando la orden ${id ?? ''}…`} />
      </View>
    );
  }

  const store = getStore(order.store);
  const currentStep = STEP_INDEX[order.status] ?? 0;
  const reduced = useReducedMotion();
  const cancelled = order.status === 'cancelada';
  const isEstimate = order.estimate === true;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      {nueva === '1' && !cancelled ? (
        <View style={styles.successBanner}>
          <Text style={styles.successTitle}>¡Pedido enviado!</Text>
          <Text style={styles.successBody}>
            Aquí mismo te vamos avisando cómo va. No hace falta llamar.
          </Text>
        </View>
      ) : null}

      <Text style={styles.orderId}>{order.id}</Text>
      <Text style={styles.storeLine}>
        {store.name} · {orderDate(order.ts)}
      </Text>

      {cancelled ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelTitle}>Orden cancelada</Text>
          <Text style={styles.cancelBody}>
            Esta orden se canceló. Si no fuiste tú, llama a la panadería
            {store.phone ? ` (${store.phone})` : ''} y lo cuadramos.
          </Text>
        </View>
      ) : (
        <View style={styles.steps}>
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const current = i === currentStep;
            return (
              <View key={step.status} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <StepDot done={done} current={current} reduced={reduced} />
                  {i < STEPS.length - 1 ? <StepLine done={done} reduced={reduced} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepTitle,
                      (done || current) && styles.stepTitleActive,
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepDetail}>
                    {current && order.statusTs
                      ? `${step.detail}, ${orderDate(order.statusTs)}`
                      : step.detail}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.itemsCard}>
        <Text style={styles.itemsTitle}>Tu orden</Text>
        {order.items.map((it, idx) => {
          const itemName = it.name ?? findMenuItem(it.id)?.item.name ?? it.id;
          const vLabel = variantLabelFor(it.id, it.variant);
          const label = vLabel ? `${itemName} (${vLabel})` : itemName;
          return (
            <View key={`${it.id}-${idx}`} style={styles.itemRow}>
              <Text style={styles.itemQty}>{it.qty}×</Text>
              <Text style={styles.itemName} numberOfLines={2}>
                {label}
              </Text>
              {it.price != null ? (
                <Text style={styles.itemPrice}>{money(it.price * it.qty)}</Text>
              ) : null}
            </View>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{isEstimate ? 'Total estimado' : 'Total'}</Text>
          <Text style={styles.totalValue}>{money(order.total)}</Text>
        </View>
        {isEstimate ? (
          <Text style={styles.estimateNote}>
            Incluye items “desde” — el precio final se confirma al recoger.
          </Text>
        ) : null}
        <Text style={styles.payNote}>Pagas al recoger en {store.short}.</Text>
      </View>

      <View style={styles.pickupCard}>
        <Text style={styles.pickupLabel}>Dónde recoger</Text>
        <Text style={styles.pickupName}>{store.name}</Text>
        <Text style={styles.pickupDetail}>
          {store.address} · {store.city}
        </Text>
        {store.hours.map((h) => (
          <Text key={h.label} style={styles.pickupDetail}>
            {h.label}: {h.value}
          </Text>
        ))}
        {store.phone ? <Text style={styles.pickupDetail}>Tel. {store.phone}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  content: {
    padding: space.lg,
  },
  successBanner: {
    backgroundColor: colors.verdeSuave,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  successTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.verdeInk,
    marginBottom: 2,
  },
  successBody: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.verdeInk,
  },
  orderId: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  storeLine: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
    color: colors.inkSoft,
    marginTop: 2,
    marginBottom: space.xl,
  },
  steps: {
    marginBottom: space.xl,
  },
  stepRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  stepRail: {
    alignItems: 'center',
    width: 28,
  },
  stepDotWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPulse: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.verde,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.verde,
    borderColor: colors.verde,
  },
  stepDotCurrent: {
    borderColor: colors.verde,
    backgroundColor: colors.marfil,
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.verde,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 26,
    backgroundColor: colors.line,
    marginVertical: 2,
    overflow: 'hidden',
  },
  stepLineFill: {
    // transformOrigin 'top' hace que crezca hacia abajo; sin eso escalaría
    // desde el centro y el relleno saldría de la mitad del tramo.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.verde,
    transformOrigin: 'top',
  },
  stepBody: {
    flex: 1,
    paddingBottom: space.lg,
  },
  stepTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.lead,
    color: colors.inkFaint,
  },
  stepTitleActive: {
    color: colors.ink,
  },
  stepDetail: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  cancelBox: {
    backgroundColor: colors.dangerSuave,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  cancelTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.danger,
    marginBottom: 4,
  },
  cancelBody: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.ink,
  },
  itemsCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
    ...shadowCard,
  },
  itemsTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.ink,
    marginBottom: space.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: 6,
  },
  itemQty: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.body,
    color: colors.verdeInk,
    fontVariant: ['tabular-nums'],
    minWidth: 26,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: textSize.body,
    lineHeight: 20,
    color: colors.ink,
  },
  itemPrice: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.body,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: space.md,
    marginTop: space.sm,
  },
  totalLabel: {
    fontFamily: fonts.display,
    fontSize: textSize.h4,
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.h2,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  estimateNote: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    lineHeight: 17,
    color: colors.inkSoft,
  },
  payNote: {
    marginTop: 6,
    fontFamily: fonts.displayItalic,
    fontSize: textSize.small,
    color: colors.inkSoft,
  },
  pickupCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 3,
  },
  pickupLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.tiny,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color: colors.verdeInk,
    marginBottom: 3,
  },
  pickupName: {
    fontFamily: fonts.display,
    fontSize: textSize.h3,
    color: colors.ink,
  },
  pickupDetail: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.inkSoft,
  },
});

// Cuenta — tu nombre, tu código, tus órdenes y tu panadería de siempre.

import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, LoadingState } from '@/components/empty-state';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { ChevronRightIcon, PinIcon, QrIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { StoreSheet } from '@/components/store-sheet';
import { getMyOrders, type MyOrderSummary, type OrderStatusName } from '@/lib/api';
import { money, orderDate } from '@/lib/format';
import { findMenuItem } from '@/lib/menu';
import { useApp } from '@/lib/state';
import { getStore } from '@/lib/stores';
import { colors, fonts, motion, radius, space } from '@/lib/theme';

const STATUS_CHIP: Record<OrderStatusName, { label: string; bg: string; fg: string }> = {
  nueva: { label: 'Recibida', bg: colors.paper2, fg: colors.ink },
  preparando: { label: 'En el horno', bg: colors.naranjaSuave, fg: colors.naranjaInk },
  lista: { label: 'Lista', bg: colors.verdeSuave, fg: colors.verdeInk },
  entregada: { label: 'Entregada', bg: colors.verdeSuave, fg: colors.verdeInk },
  cancelada: { label: 'Cancelada', bg: colors.dangerSuave, fg: colors.danger },
};

type OrdersState =
  | { kind: 'loading' }
  | { kind: 'ready'; orders: MyOrderSummary[] }
  | { kind: 'error' };

function summarizeOrderItems(order: MyOrderSummary): string {
  if (!order.items?.length) return '';
  return order.items
    .slice(0, 2)
    .map((it) => {
      const name = it.name ?? findMenuItem(it.id)?.item.name ?? it.id;
      return `${it.qty}× ${name}`;
    })
    .join(' · ')
    .concat(order.items.length > 2 ? ` · +${order.items.length - 2} más` : '');
}

export default function CuentaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name, setName, card, storeId, localOrders } = useApp();
  const [draftName, setDraftName] = useState(name);
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const reduced = useReducedMotion();
  const [ordersState, setOrdersState] = useState<OrdersState>({ kind: 'loading' });

  const store = getStore(storeId);

  useFocusEffect(
    useCallback(() => {
      setDraftName(name);
      let alive = true;
      if (card?.code) {
        getMyOrders(card.code)
          .then((orders) => {
            if (alive) setOrdersState({ kind: 'ready', orders });
          })
          .catch(() => {
            if (alive) setOrdersState({ kind: 'error' });
          });
      } else {
        setOrdersState({ kind: 'ready', orders: [] });
      }
      return () => {
        alive = false;
      };
    }, [card?.code, name]),
  );

  const saveName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== name) setName(trimmed);
    else setDraftName(name);
  };

  // Órdenes del servidor; si falla o no hay tarjeta, las locales de este teléfono.
  const serverOrders = ordersState.kind === 'ready' ? ordersState.orders : [];
  const useLocal = !card || ordersState.kind === 'error' || serverOrders.length === 0;
  const localAsSummaries: MyOrderSummary[] = localOrders.map((o) => ({
    id: o.id,
    store: o.store,
    total: o.total,
    status: 'nueva' as const,
    ts: o.ts,
    items: [],
  }));
  const shownOrders = useLocal ? localAsSummaries : serverOrders;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + space.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Cuenta</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Tu nombre</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="¿Cómo te llamas?"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Tu nombre, se usa en tus órdenes"
            style={styles.nameInput}
          />
          <Text style={styles.hint}>Con este nombre cantamos tu orden cuando esté lista.</Text>

          <View style={styles.divider} />

          {card ? (
            <PressableScale
              onPress={() => router.push('/qr')}
              accessibilityRole="button"
              accessibilityLabel={`Tu tarjeta Horno Rewards, código ${card.code.split('').join(' ')}. Ver el QR`}
              style={styles.codeRow}
            >
              <QrIcon size={20} color={colors.verdeInk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tarjeta Horno Rewards</Text>
                <Text style={styles.codeText}>{card.code}</Text>
              </View>
              <ChevronRightIcon size={16} color={colors.inkFaint} />
            </PressableScale>
          ) : (
            <PressableScale
              onPress={() => router.push('/qr')}
              accessibilityRole="button"
              accessibilityLabel="Únete gratis a Horno Rewards"
              style={styles.codeRow}
            >
              <QrIcon size={20} color={colors.verdeInk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Horno Rewards</Text>
                <Text style={styles.hint}>Únete gratis en Mi QR — o recupera la tuya con tu código.</Text>
              </View>
              <ChevronRightIcon size={16} color={colors.inkFaint} />
            </PressableScale>
          )}

          <View style={styles.divider} />

          <PressableScale
            onPress={() => setStoreSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Tu panadería: ${store.name}. Toca para cambiar`}
            style={styles.codeRow}
          >
            <PinIcon size={20} color={colors.verdeInk} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tu panadería</Text>
              <Text style={styles.storeText}>{store.name}</Text>
            </View>
            <ChevronRightIcon size={16} color={colors.inkFaint} />
          </PressableScale>
        </View>

        <Text style={styles.sectionTitle}>Órdenes anteriores</Text>

        {card && ordersState.kind === 'loading' ? (
          <LoadingState label="Buscando tus órdenes…" />
        ) : shownOrders.length === 0 ? (
          <EmptyState
            title="Todavía nada por aquí"
            body="Tu primera orden te espera — pan calientito, sin fila."
            actionLabel="Ver la carta"
            onAction={() => router.push('/ordenar')}
          />
        ) : (
          <View style={{ gap: space.sm }}>
            {ordersState.kind === 'error' && card ? (
              <Text style={styles.offlineNote}>
                No pudimos traer el historial completo — esto es lo guardado en este teléfono.
              </Text>
            ) : null}
            {shownOrders.map((order, oi) => {
              const chip = STATUS_CHIP[order.status] ?? STATUS_CHIP.nueva;
              const summary = summarizeOrderItems(order) || (useLocal ? localOrders.find((o) => o.id === order.id)?.summary ?? '' : '');
              return (
                <Animated.View
                  key={order.id}
                  // .map normal, no lista virtualizada: `entering` es seguro.
                  entering={
                    reduced
                      ? undefined
                      : FadeInDown.duration(motion.base).delay(Math.min(oi, 5) * motion.stagger)
                  }
                >
                <PressableScale
                  onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Orden ${order.id}, ${getStore(order.store).name}, ${money(order.total)}. Ver detalle`}
                  style={styles.orderRow}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                        <Text style={[styles.statusChipText, { color: chip.fg }]}>{chip.label}</Text>
                      </View>
                    </View>
                    {summary ? (
                      <Text style={styles.orderSummary} numberOfLines={1}>
                        {summary}
                      </Text>
                    ) : null}
                    <Text style={styles.orderMeta}>
                      {getStore(order.store).short} · {orderDate(order.ts)}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>{money(order.total)}</Text>
                </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>HORNOFINO</Text>
          <Text style={styles.footerLine}>Parte de McQueeny Group · Puerto Rico</Text>
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync('https://hornofino.netlify.app').catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="Abrir hornofino punto netlify punto app en el navegador"
            hitSlop={8}
          >
            <Text style={styles.footerLink}>hornofino.netlify.app</Text>
          </Pressable>
        </View>
      </ScrollView>

      <StoreSheet visible={storeSheetOpen} onClose={() => setStoreSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: 4,
  },
  nameInput: {
    backgroundColor: colors.marfil,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontFamily: fonts.uiMedium,
    fontSize: 16,
    color: colors.ink,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkFaint,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: space.lg,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  codeText: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 4,
    color: colors.ink,
  },
  storeText: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.ink,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    marginBottom: space.md,
  },
  offlineNote: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.paper,
    borderRadius: radius.btnLg,
    padding: space.lg,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: 3,
  },
  orderId: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: colors.ink,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusChipText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
  },
  orderSummary: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  orderMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkFaint,
  },
  orderTotal: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    alignItems: 'center',
    marginTop: space.xxl,
    gap: 4,
  },
  footerBrand: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  footerLine: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkFaint,
  },
  footerLink: {
    marginTop: 2,
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: colors.verdeInk,
    textDecorationLine: 'underline',
  },
});

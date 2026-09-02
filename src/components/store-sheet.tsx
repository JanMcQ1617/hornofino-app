// Selector de tienda — se usa desde Inicio, Ordenar, Canasta y Cuenta.

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';

import { CheckIcon, ChevronDownIcon, PinIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { BottomSheet } from '@/components/sheet';
import { useApp } from '@/lib/state';
import { getStore, STORES, storeOpenState, type StoreId } from '@/lib/stores';
import { colors, fonts, motion, radius, space, textSize } from '@/lib/theme';

export function StoreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { storeId, setStoreId } = useApp();
  const reduced = useReducedMotion();

  const pick = (id: StoreId) => {
    setStoreId(id);
    Haptics.selectionAsync().catch(() => {});
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="¿Dónde recoges?">
      <View style={{ gap: space.sm, paddingBottom: space.sm }}>
        {STORES.map((store, i) => {
          const selected = store.id === storeId;
          return (
            // La hoja se monta de cero cada vez que se abre, así que `entering`
            // es seguro aquí — al revés que en las listas virtualizadas, donde
            // se repetiría cada vez que una fila vuelve a entrar en pantalla.
            <Animated.View
              key={store.id}
              entering={
                reduced ? undefined : FadeInDown.duration(motion.base).delay(i * motion.stagger)
              }
            >
            <PressableScale
              onPress={() => pick(store.id)}
              accessibilityRole="button"
              accessibilityLabel={`Recoger en ${store.name}`}
              accessibilityState={{ selected }}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={{ flex: 1 }}>
                {/*
                  Orden deliberado: nombre → ABIERTO/CERRADO → dirección →
                  horario completo. Lo que decide si ordenas aquí o no es si
                  está abierta ahora, así que va pegado al nombre. El horario
                  completo queda de último y en gris: es consulta, no decisión.
                */}
                <Text style={styles.name}>{store.name}</Text>
                {(() => {
                  const st = storeOpenState(store);
                  return (
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          st.kind === 'open' ? styles.dotOpen : styles.dotClosed,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          st.kind === 'open' ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        {st.kind === 'open'
                          ? st.closingSoon
                            ? `Cierra pronto · ${st.closesAt}`
                            : `Abierto · cierra ${st.closesAt}`
                          : `Cerrado · abre ${st.opensAt}`}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={styles.detail}>
                  {store.address} · {store.city}
                </Text>
                <Text style={styles.hours}>
                  {store.hours.map((h) => `${h.label} ${h.value}`).join('  ·  ')}
                </Text>
              </View>
              {selected ? (
                <Animated.View
                  style={styles.check}
                  entering={reduced ? undefined : ZoomIn.springify().damping(13).stiffness(260)}
                >
                  <CheckIcon size={15} color={colors.marfil} />
                </Animated.View>
              ) : null}
            </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/**
 * Botón compacto de tienda (directiva 2026-08-11): slab pequeño y calladito
 * para la esquina del header — pin + nombre corto. Una sola fuente de verdad:
 * se usa en Inicio, Ordenar, el menú completo y la canasta.
 */
export function StoreChip({ onPress }: { onPress: () => void }) {
  const { storeId } = useApp();
  const store = getStore(storeId);
  const st = storeOpenState(store);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        `Recoges en ${store.name}. ` +
        (st.kind === 'open' ? `Abierto hasta ${st.closesAt}.` : `Cerrado, abre ${st.opensAt}.`) +
        ' Toca para cambiar de tienda'
      }
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
    >
      <PinIcon size={13} color={colors.verdeInk} />
      <Text style={styles.chipText} numberOfLines={1}>
        {store.short}
      </Text>
      {st.kind === 'closed' ? <View style={[styles.statusDot, styles.dotClosed]} /> : null}
      <ChevronDownIcon size={11} color={colors.verdeInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Slabs sin borde: la selección se marca con relleno + check, nunca con anillo.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.btn,
    backgroundColor: colors.paper,
  },
  rowSelected: {
    backgroundColor: colors.verdeSuave,
  },
  name: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.lead,
    color: colors.ink,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginBottom: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotOpen: { backgroundColor: colors.verde },
  dotClosed: { backgroundColor: colors.danger },
  statusText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.small,
  },
  statusOpen: { color: colors.verdeInk },
  statusClosed: { color: colors.danger },
  detail: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  hours: {
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    color: colors.inkSoft,
    marginTop: 2,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.ghostFill,
    paddingHorizontal: 11,
    height: 34,
    borderRadius: radius.xs,
  },
  chipText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.small,
    color: colors.verdeInk,
    maxWidth: 120,
  },
});

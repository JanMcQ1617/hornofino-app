// Hoja de variantes: para items con tamaños (25 pzs / 50 pzs).

import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { PlusIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { BottomSheet } from '@/components/sheet';
import { money } from '@/lib/format';
import type { MenuItem, MenuVariant } from '@/lib/menu';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, priceTextBase, radius, space, textSize } from '@/lib/theme';

export function VariantSheet({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  const { addToCart } = useApp();
  const reduced = useReducedMotion();

  const add = (variant: MenuVariant) => {
    if (!item) return;
    addToCart(item, variant);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  return (
    <BottomSheet visible={item != null} onClose={onClose} title={item?.name ?? ''}>
      <Text style={styles.hint}>Escoge el tamaño</Text>
      <View style={{ gap: space.sm, paddingBottom: space.sm }}>
        {item?.variants?.map((v, i) => (
          <Animated.View
            key={v.label}
            entering={
              reduced ? undefined : FadeInDown.duration(motion.base).delay(i * motion.stagger)
            }
          >
            <PressableScale
              onPress={() => add(v)}
              accessibilityRole="button"
              accessibilityLabel={`Añadir ${item.name}, ${v.label}, ${money(v.price)}`}
              style={styles.row}
            >
              <Text style={styles.label}>{v.label}</Text>
              <View style={styles.right}>
                <Text style={styles.price}>{money(v.price)}</Text>
                <View style={styles.addDot}>
                  <PlusIcon size={15} color={colors.ink} strokeWidth={2.6} />
                </View>
              </View>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
    color: colors.inkSoft,
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.btn,
    backgroundColor: colors.paper,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.lead,
    color: colors.ink,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  price: {
    ...priceTextBase,
    fontSize: textSize.lead,
  },
  addDot: {
    width: 32,
    height: 32,
    borderRadius: radius.xs,
    backgroundColor: colors.naranja,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

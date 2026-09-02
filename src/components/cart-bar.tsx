// Barra de canasta persistente — visible mientras haya algo que pagar.
//
// Movida al API de Reanimated (2026-08-13). Antes usaba el `Animated` viejo de
// react-native con una curva cúbica; ahora entra con muelle, así la barra se
// siente como un objeto con peso que sube y asienta, no como un panel que
// aparece. El contador rebota cuando sube la cuenta — es la confirmación de
// que "sí, se añadió" sin tener que enseñar un toast.

import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GradientSlab } from '@/components/buttons';
import { PressableScale } from '@/components/motion';
import { money } from '@/lib/format';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, shadowBar, space, textSize } from '@/lib/theme';

export function CartBar({
  /** distancia al borde inferior; los tabs pasan insets.bottom + TAB_BAR_CLEARANCE */
  bottomOffset = space.md,
}: {
  bottomOffset?: number;
}) {
  const router = useRouter();
  const { cartCount, cartSubtotal, cartHasEstimate } = useApp();
  const visible = cartCount > 0;
  const reduced = useReducedMotion();

  const shown = useSharedValue(0); // 0 escondida ·1 arriba
  const bump = useSharedValue(1);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (reduced) {
      shown.set(withTiming(visible ? 1 : 0, { duration: motion.fast }));
      return;
    }
    shown.set(
      visible
        ? withSpring(1, motion.spring)
        : // salir es más corto que entrar, y sin muelle: rebotar al irse
          // deja la barra colgando en pantalla cuando ya no hace falta
          withTiming(0, { duration: motion.exit }),
    );
  }, [visible, reduced, shown]);

  useEffect(() => {
    if (cartCount > prevCount.current && !reduced) {
      bump.set(withSequence(withSpring(1.18, { damping: 9, stiffness: 320 }), withSpring(1, motion.spring)));
    }
    prevCount.current = cartCount;
  }, [cartCount, reduced, bump]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 90 }],
  }));
  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrap, { bottom: bottomOffset }, wrapStyle]}
    >
      <PressableScale
        onPress={() => router.push('/carrito')}
        accessibilityRole="button"
        accessibilityLabel={`Ver canasta: ${cartCount} ${cartCount === 1 ? 'item' : 'items'}, ${cartHasEstimate ? 'total estimado' : 'total'} ${money(cartSubtotal)}`}
        style={styles.bar}
      >
        <GradientSlab borderRadius={radius.btnLg} />
        <Animated.View style={[styles.count, countStyle]}>
          <Text style={styles.countText}>{cartCount}</Text>
        </Animated.View>
        <Text style={styles.label}>Ver canasta</Text>
        <View style={styles.totalWrap}>
          {cartHasEstimate ? <Text style={styles.approx}>aprox.</Text> : null}
          <Text style={styles.total}>{money(cartSubtotal)}</Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.naranja,
    borderRadius: radius.btnLg,
    paddingVertical: 17,
    paddingHorizontal: space.lg,
    ...shadowBar,
  },
  count: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.body,
    color: colors.marfil,
    fontVariant: ['tabular-nums'],
  },
  label: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: textSize.lead,
    color: colors.ink,
  },
  totalWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  approx: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.caption,
    color: colors.ink,
    opacity: 0.7,
  },
  total: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.lead,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});

// Tarjeta de sellos 2×3: seis slots con el pancito de la marca.
//
// El sello se PONCHA, no aparece. Reescrito con Reanimated (2026-08-13):
// antes era un scale 0→1 con muelle y ya. Ahora imita un sello de goma real:
//
//   1. Anticipación — entra grande (1.7×) y transparente, como si estuviera
//      todavía en el aire, fuera de foco, sobre la tarjeta.
//   2. Golpe — cae a 0.92 en 150ms con easing IN (acelera, como gravedad).
//      La háptica va EXACTAMENTE aquí, no antes: si suena antes del impacto
//      visual el cerebro las lee como dos eventos y se rompe la ilusión.
//   3. Asiento — muelle duro de vuelta a 1.0 con un pelo de rebote.
//   4. Tinta — un anillo se expande y se desvanece desde el punto de impacto.
//
// Cada sello queda con una inclinación distinta pero FIJA por slot: un sello
// de goma nunca cae perfectamente derecho, y si la inclinación fuera aleatoria
// cambiaría en cada render, que es peor que no tenerla.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BreadIcon } from '@/components/icons';
import { haptic } from '@/components/motion';
import { colors, radius, space } from '@/lib/theme';

const POP_STAGGER_MS = 230;
/** Inclinación de reposo por slot — fija, nunca aleatoria (ver cabecera). */
const REST_TILT = [-2.5, 1.8, -1.2, 2.4, -1.9, 1.4];
/** Duración del golpe. La háptica se dispara al final de esta ventana. */
const IMPACT_MS = 150;

function Stamp({ index, delay, animate }: { index: number; delay: number; animate: boolean }) {
  const reduced = useReducedMotion();
  const tilt = REST_TILT[index % REST_TILT.length];

  const scale = useSharedValue(animate ? 1.7 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);
  const rotate = useSharedValue(animate ? tilt - 9 : tilt);
  /** 0→1 la onda de tinta */
  const ink = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    if (reduced) {
      // Sin movimiento: aparece y ya. La háptica se mantiene — es la
      // confirmación para quien apagó las animaciones.
      opacity.set(withDelay(delay, withTiming(1, { duration: 120 })));
      scale.set(1);
      rotate.set(tilt);
      const t = setTimeout(() => haptic.success(), delay);
      return () => clearTimeout(t);
    }

    opacity.set(withDelay(delay, withTiming(1, { duration: 90 })));
    scale.set(
      withDelay(
        delay,
        withSequence(
          withTiming(0.92, { duration: IMPACT_MS, easing: Easing.in(Easing.cubic) }),
          withSpring(1, { damping: 12, stiffness: 400, mass: 0.8 }),
        ),
      ),
    );
    rotate.set(
      withDelay(
        delay,
        withSequence(
          withTiming(tilt, { duration: IMPACT_MS, easing: Easing.in(Easing.cubic) }),
          withSpring(tilt, { damping: 14, stiffness: 320 }),
        ),
      ),
    );
    // la tinta arranca en el impacto, no en la salida
    ink.set(
      withDelay(
        delay + IMPACT_MS,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }, (ok) => {
          if (ok) ink.set(0);
        }),
      ),
    );

    // háptica clavada al frame del impacto
    const t = setTimeout(() => haptic.success(), delay + IMPACT_MS);
    return () => clearTimeout(t);
  }, [animate, delay, reduced, tilt, scale, opacity, rotate, ink]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  const inkStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ink.value),
    transform: [{ scale: 0.9 + 0.7 * ink.value }],
  }));

  return (
    <View style={styles.slotInner}>
      <Animated.View pointerEvents="none" style={[styles.ink, inkStyle]} />
      <Animated.View style={[styles.stamp, stampStyle]}>
        <BreadIcon size={30} color={colors.marfil} strokeWidth={2} />
      </Animated.View>
    </View>
  );
}

export function PunchCard({
  stamps,
  goal,
  /**
   * Cantidad de sellos que el usuario ya había visto. Los slots entre
   * popFrom y stamps se animan al entrar. null = sin animación.
   */
  popFrom,
}: {
  stamps: number;
  goal: number;
  popFrom: number | null;
}) {
  const total = Math.max(goal, 1);
  const filled = Math.max(0, Math.min(stamps, total));
  const from = popFrom == null ? filled : Math.max(0, popFrom);

  return (
    <View
      style={styles.grid}
      accessibilityRole="image"
      accessibilityLabel={`Tarjeta de sellos: ${filled} de ${total} hacia tu quesito gratis`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        const animate = isFilled && i >= from;
        return (
          <View key={i} style={styles.slot}>
            {isFilled ? (
              <Stamp index={i} delay={260 + POP_STAGGER_MS * (i - from)} animate={animate} />
            ) : (
              <View style={styles.slotEmpty}>
                <BreadIcon size={26} color={colors.inkFaint} strokeWidth={1.6} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const SLOT = 76;

const styles = StyleSheet.create({
  // 2 filas × 3 columnas (goal 6); flexWrap se adapta si el goal cambiara
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
    maxWidth: SLOT * 3 + space.md * 2 + 2,
    alignSelf: 'center',
  },
  slot: {
    width: SLOT,
    height: SLOT,
  },
  slotInner: {
    flex: 1,
  },
  stamp: {
    flex: 1,
    borderRadius: radius.btnLg,
    backgroundColor: colors.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ink: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.btnLg,
    borderWidth: 2,
    borderColor: colors.verde,
  },
  slotEmpty: {
    flex: 1,
    borderRadius: radius.btnLg,
    backgroundColor: colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
});

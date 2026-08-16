// Intro de arranque — "el horno abre".
//
// Diseño: el fondo del intro ES el fondo de la app (blanco), así que al
// terminar no hay corte: solo se desvanece la marca y ya estás adentro.
// Dos anillos de menta salen del centro como ondas de calor, un rescoldo
// naranja respira detrás del logo, y el logo entra con muelle.
//
// El logo es verde sobre transparente — por eso el campo es BLANCO y no
// menta: verde sobre menta no contrasta (1.4:1).
//
// Duración ~2.1s. Un toque en cualquier parte lo salta.

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/lib/theme';

const LOGO = require('../../assets/brand/logo-color.png');
/** proporción real del PNG de marca (ancho/alto) */
const LOGO_RATIO = 1157 / 210;

const RISE = Easing.bezier(0.16, 1, 0.3, 1);
/** muelle de marca: entra decidido y asienta sin rebotar de más */
const BRAND_SPRING = { damping: 15, stiffness: 170, mass: 0.9 };

export function HornoIntro({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setGone(true);
    onDone();
  }, [onDone]);

  // Entrada y salida viven en shared values SEPARADOS y se multiplican en el
  // estilo. Un solo `.set()` por valor: dos `.set()` sobre el mismo valor en
  // el mismo efecto se pisan (el segundo cancela al primero al instante) y la
  // entrada nunca llega a verse.
  const ring1 = useSharedValue(0); // 0..1 progreso de la onda
  const ring2 = useSharedValue(0);
  const emberIn = useSharedValue(0);
  const emberOut = useSharedValue(1);
  const emberS = useSharedValue(0.7);
  const logoIn = useSharedValue(0);
  const logoOut = useSharedValue(1);
  const logoS = useSharedValue(0.9);
  const logoSOut = useSharedValue(1);
  const logoY = useSharedValue(16);
  const rootO = useSharedValue(1);

  useEffect(() => {
    // rescoldo naranja: respira una vez detrás de la marca
    emberIn.set(
      withDelay(
        80,
        withSequence(
          withTiming(0.5, { duration: 620, easing: Easing.out(Easing.quad) }),
          withTiming(0.34, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        ),
      ),
    );
    emberS.set(withDelay(80, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })));

    // el logo entra con muelle
    logoIn.set(withDelay(240, withTiming(1, { duration: 460, easing: RISE })));
    logoS.set(withDelay(240, withSpring(1, BRAND_SPRING)));
    logoY.set(withDelay(240, withSpring(0, BRAND_SPRING)));

    // ondas de calor
    ring1.set(withDelay(180, withTiming(1, { duration: 1250, easing: Easing.out(Easing.cubic) })));
    ring2.set(withDelay(760, withTiming(1, { duration: 1250, easing: Easing.out(Easing.cubic) })));

    let tap: ReturnType<typeof setTimeout> | undefined;
    if (Platform.OS !== 'web') {
      tap = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, 820);
    }

    // salida: solo se va la marca. El blanco de abajo ya es la app.
    logoOut.set(withDelay(1560, withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) })));
    logoSOut.set(withDelay(1560, withTiming(1.04, { duration: 380, easing: Easing.out(Easing.quad) })));
    emberOut.set(withDelay(1560, withTiming(0, { duration: 380 })));
    rootO.set(
      withDelay(
        1900,
        withTiming(0, { duration: 200 }, (ok) => {
          if (ok) runOnJS(finish)();
        }),
      ),
    );

    // Si la app se va a segundo plano las animaciones se congelan y el
    // callback nunca llega; este temporizador garantiza que el overlay salga.
    const failsafe = setTimeout(finish, 2600);
    return () => {
      if (tap) clearTimeout(tap);
      clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = useCallback(() => {
    rootO.set(
      withTiming(0, { duration: 220 }, (ok) => {
        if (ok) runOnJS(finish)();
      }),
    );
    setTimeout(finish, 360);
  }, [finish, rootO]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootO.value }));
  const emberStyle = useAnimatedStyle(() => ({
    opacity: emberIn.value * emberOut.value,
    transform: [{ scale: emberS.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value * logoOut.value,
    transform: [{ translateY: logoY.value }, { scale: logoS.value * logoSOut.value }],
  }));
  // Las ondas arrancan YA más anchas que el logotipo (0.85 × 320 = 272 pt vs.
  // 247 pt de logo) y solo crecen: si empezaran pequeñas cruzarían la palabra
  // por el medio y parecería un tachón, no un halo.
  const ring1Style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ring1.value),
    transform: [{ scale: 0.85 + 1.15 * ring1.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - ring2.value),
    transform: [{ scale: 0.85 + 1.15 * ring2.value }],
  }));

  if (gone) return null;

  const cx = W / 2;
  const cy = H * 0.46;
  const logoW = Math.min(W * 0.66, 300);
  const logoH = logoW / LOGO_RATIO;
  const RING = 320;
  const EMBER = 340;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={skip}
        accessibilityRole="button"
        accessibilityLabel="Saltar introducción"
      >
        {/* rescoldo del horno */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            { left: cx - EMBER / 2, top: cy - EMBER / 2, width: EMBER, height: EMBER },
            emberStyle,
          ]}
        >
          <Svg width={EMBER} height={EMBER}>
            <Defs>
              <RadialGradient id="ember" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.naranja} stopOpacity={0.5} />
                <Stop offset="0.55" stopColor={colors.naranjaLuz} stopOpacity={0.14} />
                <Stop offset="1" stopColor={colors.naranjaLuz} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={EMBER / 2} cy={EMBER / 2} r={EMBER / 2} fill="url(#ember)" />
          </Svg>
        </Animated.View>

        {/* ondas de calor en menta */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { left: cx - RING / 2, top: cy - RING / 2, width: RING, height: RING, borderRadius: RING / 2 },
            ring1Style,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              left: cx - RING / 2,
              top: cy - RING / 2,
              width: RING,
              height: RING,
              borderRadius: RING / 2,
              borderWidth: 1,
            },
            ring2Style,
          ]}
        />

        {/* marca */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            { left: cx - logoW / 2, top: cy - logoH / 2, width: logoW, height: logoH },
            logoStyle,
          ]}
        >
          <Image
            source={LOGO}
            style={{ width: logoW, height: logoH }}
            contentFit="contain"
            accessibilityLabel="HORNOFINO — pan, café, vino"
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    // mismo blanco que la app: por eso el final no tiene costura
    backgroundColor: colors.marfil,
    zIndex: 1000,
  },
  abs: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.verde,
  },
});

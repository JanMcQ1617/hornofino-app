// Slideshow de fotos de Inicio — crossfade automático (~4s) con la
// fotografía REAL de comida ya empaquetada en assets/menu. Desde la
// directiva 5 es el FONDO a pantalla completa del tab Inicio.
//
// *** SLIDES INTERCAMBIABLES ***
// Cuando Jan entregue las fotos reales de los platos Light, se cambia la
// lista HERO_SLIDES de abajo por esos assets y nada más — el overlay,
// el crossfade y los puntitos no se tocan.
//
// Sin dependencias nuevas: Animated de RN core. Todos los slides se montan
// apilados (opacity animada), así quedan decodificados y no hay flash.
// Respeta reduce-motion (primer slide estático) y pausa con la interacción.

import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { SECTION_IMAGES } from '@/lib/section-images';
import { colors } from '@/lib/theme';

const HERO_SLIDES = [
  SECTION_IMAGES.brunch,
  SECTION_IMAGES['cafe-y-te'],
  SECTION_IMAGES.reposteria,
  SECTION_IMAGES.bizcochos,
  SECTION_IMAGES.panes,
];

const SLIDE_MS = 4000;
const FADE_MS = 700;
/**
 * Deriva lenta (Ken Burns) del slide activo. Una foto de comida quieta se lee
 * como un JPEG pegado; una que respira se lee como una vitrina. 6% en ~4.7s es
 * imperceptible como movimiento pero es lo que separa "vivo" de "estático".
 * Empieza donde termina el crossfade para que dos fotos nunca escalen a la vez.
 */
const DRIFT_TO = 1.06;
const DRIFT_MS = SLIDE_MS + FADE_MS;

/** Scrims en degradado (arriba y abajo) para que el overlay se lea sobre la foto. */
function ScrimGradient({ position }: { position: 'top' | 'bottom' }) {
  const rawId = useId();
  const id = `scrim${position}${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const stops =
    position === 'top'
      ? [
          { offset: '0%', opacity: 0.5 },
          { offset: '100%', opacity: 0 },
        ]
      : [
          { offset: '0%', opacity: 0 },
          { offset: '100%', opacity: 0.74 },
        ];
  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrimWrap,
        position === 'top' ? { top: 0, height: '34%' } : { bottom: 0, height: '52%' },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            {stops.map((st) => (
              <Stop
                key={st.offset}
                offset={st.offset}
                stopColor={colors.ink}
                stopOpacity={st.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function HeroSlideshow({
  paused = false,
  /** posición de los puntitos indicadores; por defecto arriba a la derecha */
  dotsStyle,
}: {
  paused?: boolean;
  dotsStyle?: StyleProp<ViewStyle>;
}) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focused, setFocused] = useState(true);
  const opacitiesRef = useRef(
    HERO_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  );
  const opacities = opacitiesRef.current;
  const scalesRef = useRef(HERO_SLIDES.map(() => new Animated.Value(1)));
  const scales = scalesRef.current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  /*
   * Deslizar para cambiar de foto (Jan, 4 sep 2026).
   *
   * El gesto vive ACÁ y no en un Pressable de la pantalla: aquel estaba por
   * ENCIMA del slideshow y se comía el deslizamiento antes de que llegara.
   * Esta capa queda debajo del contenido (la cabecera usa box-none), así que
   * un toque en un botón sigue yendo al botón y solo el fondo vacío desliza.
   *
   * onMoveShouldSet solo toma el gesto cuando el movimiento es claramente
   * horizontal (|dx| > 12 y mayor que |dy|), para no robarle el scroll
   * vertical a nada que se añada después.
   */
  const [dragging, setDragging] = useState(false);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => setDragging(true),
      onPanResponderRelease: (_e, g) => {
        setDragging(false);
        const n = HERO_SLIDES.length;
        if (g.dx <= -48) setIndex((i) => (i + 1) % n);
        else if (g.dx >= 48) setIndex((i) => (i - 1 + n) % n);
      },
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  // Avance automático — solo con la pantalla al frente, sin dedo encima
  // y sin reduce-motion activado.
  useEffect(() => {
    if (reduceMotion || paused || dragging || !focused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [reduceMotion, paused, dragging, focused]);

  // Crossfade hacia el slide activo.
  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel(
      opacities.map((o, i) =>
        Animated.timing(o, {
          toValue: i === index ? 1 : 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [index, reduceMotion, opacities]);

  // Deriva del slide activo. El que sale se resetea a 1 de una vez: como ya
  // está en opacidad 0 nadie ve el salto, y así vuelve a entrar desde el
  // principio la próxima vuelta.
  useEffect(() => {
    if (reduceMotion) return;
    scales.forEach((sc, i) => {
      if (i === index) {
        sc.setValue(1);
        Animated.timing(sc, {
          toValue: DRIFT_TO,
          duration: DRIFT_MS,
          useNativeDriver: true,
        }).start();
      } else {
        sc.stopAnimation(() => sc.setValue(1));
      }
    });
  }, [index, reduceMotion, scales]);

  if (reduceMotion) {
    // Primer slide estático: nada se mueve.
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={HERO_SLIDES[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
        <ScrimGradient position="top" />
        <ScrimGradient position="bottom" />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      {HERO_SLIDES.map((src, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            { opacity: opacities[i], transform: [{ scale: scales[i] }] },
          ]}
        >
          <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ))}
      <ScrimGradient position="top" />
      <ScrimGradient position="bottom" />
      <View
        style={[styles.dots, dotsStyle]}
        importantForAccessibility="no-hide-descendants"
      >
        {HERO_SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrimWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  dots: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.dotOnPhoto,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.marfil,
  },
});

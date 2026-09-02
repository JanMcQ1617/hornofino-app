// Hoja inferior propia (Modal nativo + Reanimated + gesto de arrastre).
//
// Reescrita 2026-08-13. Lo que tenía antes: curva cúbica y un viaje fijo de
// 420px — o sea que una hoja corta entraba volando desde fuera de la pantalla
// y una larga quedaba cortada. Ahora:
//
//  · Se MIDE la hoja y el viaje es su altura real.
//  · Sube con muelle: desacelera como algo con peso, no como una interpolación.
//  · Se ARRASTRA para cerrar. Es lo único que separa una hoja que se siente
//    nativa de una que se siente pintada.
//  · El cierre respeta la VELOCIDAD: un flick corto pero rápido cierra; un
//    arrastre lento y largo que se suelta a medio camino regresa. Juzgar solo
//    por distancia es lo que hace que las hojas se sientan tercas.
//  · El fondo oscuro sigue el dedo — si la hoja se mueve y el scrim no, la
//    ilusión de que estás agarrando un objeto se rompe.
//
// Ojo: dentro de un <Modal> de React Native los gestos NO funcionan sin un
// GestureHandlerRootView propio adentro. Por eso está aquí y no solo en la raíz.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/icons';
import { haptic } from '@/components/motion';
import { colors, fonts, motion, radius, space, textSize } from '@/lib/theme';

/** Fracción de la hoja que hay que bajar para que se cierre al soltar. */
const DISMISS_RATIO = 0.32;
/** Velocidad (px/s) que cierra aunque no se haya llegado a la fracción. */
const DISMISS_VELOCITY = 900;

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(visible);
  const [measured, setMeasured] = useState(false);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const y = useSharedValue(0);
  const sheetH = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const openedRef = useRef(false);

  const finishClose = useCallback(() => {
    setMounted(false);
    setMeasured(false);
    openedRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    // cierre pedido desde fuera (o por el botón): baja y desmonta
    y.set(
      withTiming(sheetH.value || 420, { duration: motion.exit, easing: Easing.in(Easing.cubic) }, (ok) => {
        if (ok) runOnJS(finishClose)();
      }),
    );
  }, [visible, mounted, y, sheetH, finishClose]);

  /** Se llama al medir: coloca la hoja abajo y la sube de una vez. */
  const onSheetLayout = (h: number) => {
    if (openedRef.current || h <= 0) return;
    openedRef.current = true;
    sheetH.set(h);
    setMeasured(true);
    // Un solo `.set()`: colocar y animar en dos llamadas se pisarían.
    y.set(
      reduced
        ? 0
        : withSequence(withTiming(h, { duration: 0 }), withSpring(0, motion.spring)),
    );
  };

  const requestClose = useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = y.value;
    })
    .onUpdate((e) => {
      // solo hacia abajo: arrastrar hacia arriba no debe despegar la hoja
      y.value = Math.max(0, dragStart.value + e.translationY);
    })
    .onEnd((e) => {
      const h = sheetH.value || 420;
      const far = y.value > h * DISMISS_RATIO;
      const flicked = e.velocityY > DISMISS_VELOCITY;
      if (far || flicked) {
        runOnJS(haptic.tap)();
        y.value = withTiming(h, { duration: motion.exit, easing: Easing.in(Easing.cubic) }, (ok) => {
          if (ok) runOnJS(finishClose)();
        });
      } else {
        // vuelve arriba con la velocidad que traía el dedo: se siente continuo
        y.value = withSpring(0, { ...motion.spring, velocity: e.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: measured ? 1 : 0,
    transform: [{ translateY: y.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => {
    const h = sheetH.value || 1;
    return { opacity: Math.max(0, 1 - y.value / h) };
  });

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => onSheetLayout(Math.round(e.nativeEvent.layout.height))}
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, space.lg) },
              sheetStyle,
            ]}
          >
            <View style={styles.grabber} />
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                onPress={requestClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              >
                <CloseIcon size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.marfil,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.md,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: textSize.h2Lg,
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

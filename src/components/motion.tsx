// Capa de movimiento compartida: háptica + superficie presionable con muelle.
//
// Antes cada botón hacía `pressed && { opacity: 0.7 }` a mano. Sobre BLANCO
// una bajada de opacidad casi no se ve — con el fondo crema anterior tampoco.
// Escalar sí se siente. Esto lo centraliza para que toda la app responda igual.
//
// Espejo de `components/ui.tsx` en la app de Clink: mismo muelle, misma
// háptica, mismo respeto por "Reducir movimiento".

import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** No hace nada fuera del teléfono: expo-haptics no existe en web. */
export const haptic = {
  tap: () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select: () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  /** StyleProp completo: los call sites pasan arreglos con condicionales. */
  style?: StyleProp<ViewStyle>;
  /** Salta el tick háptico (listas largas donde vibraría de más). */
  noHaptic?: boolean;
  /** Escala a la que llega mientras se mantiene apretado. */
  scaleTo?: number;
}

/**
 * Superficie tocable con muelle al presionar. Respeta "Reducir movimiento":
 * si está activo no escala, pero la háptica sigue — es la confirmación para
 * quien apagó las animaciones justamente por mareo.
 */
export function PressableScale({
  children,
  style,
  noHaptic,
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Handlers planos, no useCallback: el React Compiler está encendido y los
  // memoiza solo. Escribir `scale.value` dentro de un useCallback además
  // rompe react-hooks/immutability.
  const handleIn: NonNullable<PressableProps['onPressIn']> = (e) => {
    scale.set(reduced ? 1 : withSpring(scaleTo, motion.spring));
    if (!noHaptic) haptic.tap();
    onPressIn?.(e);
  };

  const handleOut: NonNullable<PressableProps['onPressOut']> = (e) => {
    scale.set(reduced ? 1 : withSpring(1, motion.spring));
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      style={[animated, ...(Array.isArray(style) ? style : [style])] as never}
      onPressIn={handleIn}
      onPressOut={handleOut}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

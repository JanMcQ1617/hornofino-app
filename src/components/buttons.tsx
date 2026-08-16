// Lenguaje de botones 2026-08-11: SLABS cuadrados (radius 10/12), cero bordes.
// Primario = slab con gradiente naranja y texto INK (nunca blanco sobre naranja).
// Secundario = relleno suave verdoso sin borde.
//
// Feedback (2026-08-13): la escala 0.97 era un transform ESTÁTICO — saltaba al
// valor y volvía de golpe. Ahora va por PressableScale: muelle al bajar, muelle
// al soltar, y tick háptico. Son los elementos que más se tocan en la app, así
// que es donde más se nota la diferencia entre "responde" y "conmuta".

import React, { useId } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PressableScale } from '@/components/motion';
import { colors, fonts, naranjaGradient, radius } from '@/lib/theme';

/** Fondo con gradiente naranja para slabs primarios (svg, sin deps nuevas). */
export function GradientSlab({ borderRadius = radius.btnLg }: { borderRadius?: number }) {
  const rawId = useId();
  const id = `grad${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={naranjaGradient[0]} />
            <Stop offset="100%" stopColor={naranjaGradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** texto mientras loading, p. ej. "Enviando…" */
  loadingLabel?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** true cuando el botón vive sobre una superficie oscura (foto/scrim) */
  onDark?: boolean;
};

/** Botón principal: slab con gradiente naranja, texto INK, sombra ambiental suave. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  loadingLabel,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const blocked = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      style={[styles.primary, blocked && !loading ? styles.disabled : null, style]}
    >
      <GradientSlab borderRadius={radius.btnLg} />
      {loading ? <ActivityIndicator color={colors.ink} /> : null}
      <Text style={styles.primaryLabel}>{loading ? (loadingLabel ?? label) : label}</Text>
    </PressableScale>
  );
}

/** Botón secundario: slab sin borde con relleno tenue. */
export function GhostButton({ label, onPress, disabled, accessibilityLabel, style, onDark }: ButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.ghost, onDark ? styles.ghostDark : null, disabled ? styles.disabled : null, style]}
    >
      <Text style={[styles.ghostLabel, onDark && styles.ghostLabelDark]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 58,
    borderRadius: radius.btnLg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    overflow: 'visible',
    shadowColor: colors.naranja,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.45,
  },
  ghost: {
    minHeight: 54,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    backgroundColor: colors.ghostFill,
  },
  ghostDark: {
    backgroundColor: colors.ghostFillDark,
  },
  ghostLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.verdeInk,
  },
  ghostLabelDark: {
    color: colors.naranjaLuz,
  },
});

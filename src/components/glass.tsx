// Superficies de CRISTAL — el material compartido de la app.
//
// Dos implementaciones del mismo material:
//
//   iOS 26+   Liquid Glass de verdad (expo-glass-effect). Refracta lo que
//             tiene detrás, así que reacciona al scroll igual que la barra
//             del sistema.
//   lo demás  una imitación hecha a mano. No hay primitiva de blur en las
//             dependencias, así que en vez de un blur malo armamos una
//             LOSA convincente: relleno translúcido, brillo especular en
//             el tercio de arriba, y un canto claro arriba y tenue en el
//             resto.
//
// Por qué no basta con opacidad: un rectángulo translúcido y plano parece
// un error de render. El cristal necesita canto y brillo o el ojo lo
// archiva como bug, no como material.
//
// Espejo de `components/glass.tsx` en Clink: mismo material, mismos
// nombres, distinta paleta.

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { glass, radius, shadowBar } from '@/lib/theme';

/**
 * Cierto solo donde el sistema puede pintar el material real.
 *
 * Se exporta porque algunos call sites tienen que COMPENSAR: el cristal
 * nativo ya trae su propio canto, y dibujar el nuestro encima lo duplica.
 */
export const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type GlassTone = 'plain' | 'menta';

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  /** Radio de esquina. Recorta el brillo, así que pasa el valor real. */
  cornerRadius?: number;
  /** `menta` tiñe el material con el color de marca — estado activo. */
  tone?: GlassTone;
  /** Bastante opaco para ir encima de fotos, no solo encima de la página. */
  strong?: boolean;
  /** Solo cristal nativo: el material se dobla hacia el dedo. */
  interactive?: boolean;
  /** Sin sombra. Las superficies pegadas a un borde no levantan. */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * El brillo. Gradiente SVG y no una pila de capas con opacidad, porque el
 * banding se ve en OLED a lo largo de una banda de 40pt y un gradiente de
 * verdad cuesta un solo dibujo estático.
 */
function Sheen({ cornerRadius }: { cornerRadius: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="hfGlassSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={glass.sheenFrom} />
          <Stop offset="1" stopColor={glass.sheenTo} />
        </LinearGradient>
      </Defs>
      {/*
       * 62% de alto: el brillo tiene que apagarse bastante antes del borde
       * de abajo, si no se lee como relleno degradado y no como reflejo.
       */}
      <Rect x="0" y="0" width="100%" height="62%" rx={cornerRadius} fill="url(#hfGlassSheen)" />
    </Svg>
  );
}

/**
 * Un panel de cristal. Los hijos van encima del material y recortados al
 * radio, para que nadie tenga que acordarse del `overflow: 'hidden'`.
 */
export function GlassSurface({
  children,
  cornerRadius = radius.xl,
  tone = 'plain',
  strong = false,
  interactive = false,
  flat = false,
  style,
}: GlassSurfaceProps) {
  const lift = flat ? null : shadowBar;

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tone === 'menta' ? glass.fillMenta : glass.nativeTint}
        // La paleta es clara y no sigue la apariencia del sistema; 'auto'
        // oscurecería el material en modo oscuro y dejaría la tinta INK
        // colgada encima.
        colorScheme="light"
        style={[{ borderRadius: cornerRadius, overflow: 'hidden' }, lift, style]}
      >
        {/*
         * El contorno. El cristal nativo trae su propio canto, pero se apoya
         * en lo que tiene detrás: encima de una foto se lee solo, y encima de
         * una pantalla blanca desaparece del todo. Este hairline es la
         * silueta — sin él la rama nativa no tiene borde de ninguna clase,
         * porque el `rim` y el `rimTop` viven únicamente en la imitación.
         *
         * Va aquí dentro y no como `borderWidth` del propio GlassView: es una
         * vista nativa y el borde no se le aplica de forma fiable.
         */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: cornerRadius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: glass.rimContour,
            },
          ]}
        />
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: cornerRadius,
          backgroundColor: strong ? glass.fillStrong : glass.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glass.rim,
          overflow: 'hidden',
        },
        lift,
        style,
      ]}
    >
      <Sheen cornerRadius={cornerRadius} />
      {tone === 'menta' ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: glass.fillMenta }]}
        />
      ) : null}
      {/* El canto iluminado. Un borde completo no puede ser más claro de un solo lado. */}
      <View pointerEvents="none" style={styles.rimTop} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: glass.rimTop,
  },
});

// Arte de platos HORNOFINO Light — ilustraciones de línea estilo grabado
// (como el mural/rama de café del sitio), dibujadas con react-native-svg.
//
// *** PLACEHOLDERS A PROPÓSITO ***
// No usamos fotos de comida falsas para platos que no existen todavía.
// Cuando Jan entregue las fotos reales de cada plato, se cambia el tile por
// un <Image> del mismo tamaño (el layout de la tarjeta ya lo acepta tal cual).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { colors, radius } from '@/lib/theme';

export type PlateKind =
  | 'batida'
  | 'jugo'
  | 'bowl'
  | 'ensalada'
  | 'tostada'
  | 'avena'
  | 'parfait'
  | 'revoltillo'
  | 'bizcocho'
  | 'galleta'
  | 'flan'
  | 'fruta';

/** Escoge la ilustración por palabras clave del nombre del plato. */
export function plateKindFor(name: string): PlateKind {
  const n = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (n.includes('galleta')) return 'galleta';
  if (n.includes('batida')) return 'batida';
  if (n.includes('jugo')) return 'jugo';
  if (n.includes('ensalada')) return 'ensalada';
  if (n.includes('bowl')) return 'bowl';
  if (n.includes('tostada')) return 'tostada';
  if (n.includes('avena')) return 'avena';
  if (n.includes('parfait') || n.includes('yogur')) return 'parfait';
  if (n.includes('revoltillo') || n.includes('claras')) return 'revoltillo';
  if (n.includes('bizcocho')) return 'bizcocho';
  if (n.includes('flan')) return 'flan';
  return 'fruta';
}

function Art({ kind, line }: { kind: PlateKind; line: string }) {
  const s = { stroke: line, strokeWidth: 2.4, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const thin = { ...s, strokeWidth: 1.5 };
  switch (kind) {
    case 'batida':
      return (
        <G>
          <Path d="M34 24 H62 L58 76 H38 Z" {...s} />
          <Path d="M36.5 42 H59.5" {...thin} />
          <Path d="M54 8 L45 36" {...s} />
          <Circle cx="45" cy="54" r="2" {...thin} />
          <Circle cx="51" cy="62" r="1.6" {...thin} />
          <Path d="M40 68 l3 -4 M45 70 l3 -4" {...thin} />
        </G>
      );
    case 'jugo':
      return (
        <G>
          <Path d="M34 32 H60 L57 76 H37 Z" {...s} />
          <Path d="M36 48 H58" {...thin} />
          <Circle cx="63" cy="26" r="10" {...s} />
          <Path d="M63 16 V36 M53.4 26 H72.6 M56.2 19.2 l13.6 13.6 M56.2 32.8 l13.6 -13.6" {...thin} />
          <Path d="M40 68 l3 -4 M45 70 l3 -4" {...thin} />
        </G>
      );
    case 'bowl':
      return (
        <G>
          <Path d="M24 48 H72" {...s} />
          <Path d="M24 48 Q28 72 48 72 Q68 72 72 48" {...s} />
          <Path d="M42 72 v5 h12 v-5" {...thin} />
          <Path d="M38 48 Q36 34 44 28 Q46 38 40 48" {...s} />
          <Path d="M52 48 Q52 32 62 28 Q62 40 54 48" {...s} />
          <Path d="M46 44 q2 -10 2 -14" {...thin} />
          <Path d="M32 58 l4 -5 M36 63 l4 -5" {...thin} />
        </G>
      );
    case 'ensalada':
      return (
        <G>
          <Path d="M24 50 H72" {...s} />
          <Path d="M24 50 Q28 72 48 72 Q68 72 72 50" {...s} />
          <Path d="M34 50 Q30 36 40 30 Q44 40 38 50" {...s} />
          <Path d="M48 50 Q48 30 58 26 Q60 40 52 50" {...s} />
          <Circle cx="62" cy="44" r="4.5" {...s} />
          <Path d="M42 46 q2 -8 2 -12" {...thin} />
          <Path d="M32 60 l4 -5 M37 64 l4 -5" {...thin} />
        </G>
      );
    case 'tostada':
      return (
        <G>
          <Path d="M30 42 Q30 26 40 27 Q48 20 56 27 Q66 26 66 42 V72 H30 Z" {...s} />
          <Path d="M36 52 q6 -7 12 0 q6 7 12 0" {...thin} />
          <Circle cx="42" cy="62" r="1.4" {...thin} />
          <Circle cx="54" cy="60" r="1.4" {...thin} />
          <Path d="M34 68 l4 -5 M40 69 l4 -5" {...thin} />
        </G>
      );
    case 'avena':
      return (
        <G>
          <Path d="M26 50 H70" {...s} />
          <Path d="M26 50 Q30 72 48 72 Q66 72 70 50" {...s} />
          <Path d="M40 22 q5 7 0 14 M54 18 q5 7 0 14" {...thin} />
          <Path d="M70 52 L82 44" {...s} />
          <Circle cx="42" cy="58" r="1.5" {...thin} />
          <Circle cx="52" cy="62" r="1.5" {...thin} />
          <Path d="M32 60 l4 -5" {...thin} />
        </G>
      );
    case 'parfait':
      return (
        <G>
          <Path d="M32 26 H64" {...s} />
          <Path d="M32 26 Q38 50 48 50 Q58 50 64 26" {...s} />
          <Path d="M48 50 V64 M38 68 H58" {...s} />
          <Path d="M37 34 H59 M41 42 H55" {...thin} />
          <Circle cx="48" cy="19" r="4" {...s} />
          <Path d="M48 15 q4 -4 7 -3" {...thin} />
        </G>
      );
    case 'revoltillo':
      return (
        <G>
          <Circle cx="42" cy="54" r="19" {...s} />
          <Path d="M59 46 L82 36" {...s} />
          <Path d="M31 56 q5 -8 11 0 q5 8 11 0" {...thin} />
          <Path d="M38 26 q4 6 0 11" {...thin} />
          <Path d="M30 64 l4 -5" {...thin} />
        </G>
      );
    case 'bizcocho':
      return (
        <G>
          <Path d="M30 64 L68 40 L68 64 Z" {...s} />
          <Path d="M44 55 L68 47 M37 60 L68 55" {...thin} />
          <Circle cx="66" cy="33" r="3.5" {...s} />
          <Path d="M26 70 H74" {...s} />
        </G>
      );
    case 'galleta':
      return (
        <G>
          <Circle cx="42" cy="48" r="17" {...s} />
          <Circle cx="63" cy="62" r="11" {...s} />
          <Circle cx="37" cy="43" r="1.8" {...thin} />
          <Circle cx="48" cy="50" r="1.8" {...thin} />
          <Circle cx="40" cy="56" r="1.8" {...thin} />
          <Circle cx="62" cy="60" r="1.5" {...thin} />
          <Path d="M30 60 l3 -4" {...thin} />
        </G>
      );
    case 'flan':
      return (
        <G>
          <Path d="M34 40 H62 L67 62 H29 Z" {...s} />
          <Path d="M34 40 q4 9 8 0 q4 9 8 0 q4 9 8 0 q3 7 4 0" {...thin} />
          <Path d="M25 68 H71" {...s} />
          <Path d="M33 56 l4 -5" {...thin} />
        </G>
      );
    case 'fruta':
    default:
      return (
        <G>
          <Path d="M48 36 Q30 36 32 54 Q34 72 48 72 Q62 72 64 54 Q66 36 48 36 Z" {...s} />
          <Path d="M48 36 V26" {...s} />
          <Path d="M48 28 q8 -8 14 -4 q-6 9 -14 4 Z" {...s} />
          <Path d="M38 62 l4 -6 M43 66 l4 -6" {...thin} />
        </G>
      );
  }
}

export function PlateArt({
  kind,
  size = 96,
  tone = 'deep',
  /** true = solo las líneas, sin tile de fondo (para héroes/composición) */
  bare = false,
  lineColor,
}: {
  kind: PlateKind;
  size?: number;
  tone?: 'deep' | 'cream';
  bare?: boolean;
  lineColor?: string;
}) {
  // Ambos tonos llevan el mismo trazo verde profundo: 'deep' pasó de verde
  // oscuro + trazo blanco a tile MENTA, así que el trazo claro ya no contrasta.
  // El dibujo es decorativo — el nombre del plato va al lado — así que 3.3:1
  // sobre menta es suficiente.
  const line = lineColor ?? colors.verdeInk;
  const svg = (
    <Svg width={bare ? size : size - 16} height={bare ? size : size - 16} viewBox="0 0 96 96">
      <Art kind={kind} line={line} />
    </Svg>
  );
  if (bare) return svg;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size },
        tone === 'deep' ? styles.tileDeep : styles.tileCream,
      ]}
    >
      {svg}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.btnLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDeep: {
    backgroundColor: colors.menta,
  },
  tileCream: {
    backgroundColor: colors.paper2,
  },
});

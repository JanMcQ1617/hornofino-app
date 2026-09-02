// Sistema visual HORNOFINO — menta/naranja sobre BLANCO.
//
// Cambio 2026-08-13: el marfil/crema salió del sistema (los neutros ahora son
// blanco puro y grises apenas mentolados) y el verde oscuro se volvió MENTA.
//
// Reglas duras de color:
//  1. Botones naranja llevan texto INK (#1A130A), nunca blanco.
//  2. `menta` es una SUPERFICIE, no un control suelto: solo 1.94:1 contra el
//     blanco, así que nunca va como botón sin relleno ni como único portador
//     de significado. Todo texto encima de `menta` es INK (9.46:1).
//  3. Verde que debe VERSE (puntos, trazos, controles, tints) usa `verde`
//     — 3.0:1 mínimo contra blanco, paper y paper2.
//  4. Verde que es TEXTO usa `verdeInk` (≥5.6:1 en las tres superficies).

export const colors = {
  /** menta estructural — puntos, trazos, controles, tints. Cumple 3:1. */
  verde: '#0E9B72',
  /** menta profunda — TEXTO y glifos verdes sobre superficies claras. */
  verdeInk: '#0B6B4F',
  /** menta viva — SUPERFICIE (héroes, banners, washes). Siempre texto INK. */
  menta: '#4ECFA6',
  naranja: '#EF5324',
  naranjaLuz: '#F5794A',
  /** naranja oscurecido para TEXTO sobre superficies claras (el naranja puro no da contraste) */
  naranjaInk: '#B23A12',
  ink: '#1A130A',
  /** el fondo de la app: blanco puro, ya no marfil */
  marfil: '#FFFFFF',
  paper: '#F5F7F5',
  paper2: '#EAF0EC',

  // derivados
  inkSoft: 'rgba(26, 19, 10, 0.64)',
  inkFaint: 'rgba(26, 19, 10, 0.42)',
  line: 'rgba(26, 19, 10, 0.12)',
  lineSoft: 'rgba(26, 19, 10, 0.07)',
  verdeSuave: 'rgba(14, 155, 114, 0.10)',
  mentaSuave: 'rgba(78, 207, 166, 0.18)',
  naranjaSuave: 'rgba(239, 83, 36, 0.10)',
  /** relleno de botón secundario (slab sin borde) sobre superficies claras */
  ghostFill: 'rgba(14, 155, 114, 0.09)',
  /** relleno de botón secundario sobre superficies oscuras */
  ghostFillDark: 'rgba(245, 121, 74, 0.12)',
  /** relleno de pastilla sobre `menta` — el blanco es lo único que separa ahí */
  ghostFillOnMenta: 'rgba(255, 255, 255, 0.92)',
  scrim: 'rgba(26, 19, 10, 0.45)',
  danger: '#B3261E',
  dangerSuave: 'rgba(179, 38, 30, 0.08)',

  // Superficies sobre FOTO (el héroe de Inicio). Distintas del cristal de
  // `glass`: esto es frost plano, sin brillo ni canto.
  /** chip/pastilla frost sobre foto (0.94 y 0.92 son candidatos a fundirse) */
  frostChip: 'rgba(255, 255, 255, 0.94)',
  frostBar: 'rgba(255, 255, 255, 0.92)',
  /** CTA oscuro translúcido sobre foto ("ESCANEA EN TIENDA") */
  inkFrost: 'rgba(26, 19, 10, 0.6)',
  /** puntito inactivo del slideshow */
  dotOnPhoto: 'rgba(255, 255, 255, 0.45)',
} as const;

/**
 * Cristal. En iOS 26 estas superficies las pinta el sistema (Liquid Glass,
 * vía expo-glass-effect); en todo lo demás `components/glass.tsx` lo imita
 * con estos valores: relleno translúcido, un brillo especular en el tercio
 * de arriba, y un canto MÁS CLARO arriba que en el resto del perímetro.
 * Esa asimetría es lo que se lee como "vidrio iluminado desde arriba" —
 * un borde parejo se lee como caja gris.
 *
 * A propósito no son hex: la transparencia es el material entero.
 */
export const glass = {
  /** cuerpo del cristal sobre el blanco de la app */
  fill: 'rgba(255, 255, 255, 0.80)',
  /** más opaco: para cristal que va encima de fotos del menú */
  fillStrong: 'rgba(255, 255, 255, 0.93)',
  /** cristal teñido de menta — el estado activo/seleccionado */
  fillMenta: 'rgba(78, 207, 166, 0.20)',
  /** el canto iluminado de arriba */
  rimTop: 'rgba(255, 255, 255, 0.95)',
  /** el resto del perímetro */
  rim: 'rgba(26, 19, 10, 0.10)',
  /**
   * El ÚNICO canto que recibe el cristal nativo (iOS 26+). Va más fuerte que
   * `rim` porque en esa rama no hay brillo ni canto iluminado que lo
   * acompañen — encima de una pantalla blanca es lo único que separa la
   * barra del fondo. Espejo de `rimContour` en Clink; el alfa se mantiene
   * igual en las dos apps aunque la tinta de cada paleta sea distinta.
   */
  rimContour: 'rgba(26, 19, 10, 0.16)',
  /** paradas del brillo, de arriba hacia abajo */
  sheenFrom: 'rgba(255, 255, 255, 0.65)',
  sheenTo: 'rgba(255, 255, 255, 0)',
  /** tinte que se le pasa al cristal nativo para que no salga azulado */
  nativeTint: 'rgba(255, 255, 255, 0.28)',
  /**
   * `strong` para la rama nativa. `expo-glass-effect` no expone un material
   * más denso — solo `glassEffectStyle` y `tintColor` — así que la opacidad
   * de la tinta es la única palanca que hay.
   *
   * El salto NO es proporcional al de la imitación (0.80 -> 0.93): ese mismo
   * porcentaje aquí daría ~0.33 y no se vería. Está igualado por sensación,
   * no por aritmética. Espejo de `nativeTintStrong` en Clink.
   */
  nativeTintStrong: 'rgba(255, 255, 255, 0.48)',
} as const;

// Familias tipográficas (cargadas en app/_layout.tsx).
// Petrona = display / titulares. Work Sans = interfaz. Números tabulares en precios.
export const fonts = {
  display: 'Petrona_700Bold',
  displaySemi: 'Petrona_600SemiBold',
  displayMedium: 'Petrona_500Medium',
  displayItalic: 'Petrona_500Medium_Italic',
  ui: 'WorkSans_400Regular',
  uiMedium: 'WorkSans_500Medium',
  uiSemi: 'WorkSans_600SemiBold',
  uiBold: 'WorkSans_700Bold',
} as const;

/**
 * Escala tipográfica — nombres para TODO tamaño usado ≥2 veces (inventario
 * 2026-09-01). Valores idénticos a los que ya se renderizaban: esta escala
 * ORGANIZA, no rediseña. Los tamaños de una sola aparición (10, 26, 28, 32,
 * 34, 40 — composiciones de héroe) siguen inline a propósito.
 *
 * Candidatos a fundirse cuando llegue la dirección visual nueva:
 * subhead(17)→lead(16), h3(19)→h4(18) o h2(20), bodyLg(15)→body(14).
 */
export const textSize = {
  micro: 9,
  tiny: 11,
  caption: 12,
  small: 13,
  body: 14,
  bodyLg: 15,
  lead: 16,
  subhead: 17,
  h4: 18,
  h3: 19,
  h2: 20,
  h2Lg: 22,
  h1: 24,
  display: 30,
} as const;

/** Tracking con nombre — solo los valores repetidos (el sistema de caps).
 *  Trackings de una sola aparición (arte de héroe: 2, 3, 4, 6, 10…) quedan inline. */
export const tracking = {
  snug: 0.4,
  base: 0.6,
  wide: 0.8,
  caps: 1.2,
} as const;

// Lenguaje de botones (directiva 2026-08-11): SLABS cuadrados, nunca píldoras,
// nunca bordes/outlines. btn=10 normal, btnLg=12 para flotantes/grandes.
// Las etiquetas y badges SÍ pueden seguir siendo pill — solo los botones no.
export const radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  btn: 10,
  btnLg: 12,
  pill: 999,
} as const;

/** Gradiente del botón primario (naranja → naranja-luz, diagonal). */
export const naranjaGradient = ['#EF5324', '#F5794A'] as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Movimiento. Mismo vocabulario que la app de Clink a propósito: dos apps de
 * la casa que se mueven distinto se sienten como dos casas.
 *
 * Micro-interacciones 150–300ms. Muelles antes que curvas: un muelle asienta
 * como si el objeto tuviera peso, una curva cúbica termina y ya.
 */
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  /** La salida va ~65% de la entrada: irse rápido, llegar con calma. */
  exit: 140,
  /** Retraso entre elementos de una lista al entrar. */
  stagger: 36,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  /**
   * Los botones de HORNOFINO son slabs cuadrados y grandes; 0.97 se lee
   * bien sin que el borde recto parezca que se dobla.
   */
  pressScale: 0.97,
} as const;

/** Estilo compartido para todo precio: siempre números tabulares. */
export const priceTextBase = {
  fontFamily: fonts.uiSemi,
  fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  color: colors.ink,
};

export const shadowCard = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
} as const;

export const shadowBar = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 20,
  elevation: 8,
} as const;

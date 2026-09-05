// Ordenar — pantalla de ELECCIÓN, a pantalla partida (Jan, 2 sep 2026).
//
// Antes esta pestaña ERA el menú Light (directiva light-first del 2026-08-11):
// abría directo en platos que nadie puede pedir todavía y el menú ordenable
// quedaba debajo del scroll. Ahora la pestaña pregunta primero, y desde el
// 2 sep cada opción ocupa LA MITAD DE LA PANTALLA — dos paneles flex:1, sin
// scroll: la decisión entera se ve de una, sin deslizar.
//   · /menu-completo → el menú regular, ordenable (única vía de ingresos hoy)
//   · /menu-light    → HORNOFINO Light, borrador sin precios
//
// HONESTIDAD, regla dura: Light sigue siendo un BORRADOR sin precios
// aprobados (LIGHT_MENU_READY en lib/menu-light.ts). El panel de Light dice
// que es borrador ANTES de que lo toquen — la elección no puede insinuar que
// se puede ordenar de ahí, o la pantalla estaría vendiendo algo que no existe.
// Por lo mismo el panel ordenable va ARRIBA: es lo único que se puede pedir.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { ChevronRightIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { PlateArt } from '@/components/plate-art';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { LIGHT_SECTIONS } from '@/lib/menu-light';
import { useMenuItemCount } from '@/lib/use-menu';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, space, textSize, tracking } from '@/lib/theme';

const LIGHT_PLATE_COUNT = LIGHT_SECTIONS.reduce((n, s) => n + s.plates.length, 0);

/**
 * Scrim en degradado sobre la foto — mismo recurso que hero-slideshow.tsx
 * (no hay expo-linear-gradient en el proyecto; el degradado se dibuja con
 * react-native-svg). Sin esto el texto marfil se pierde en las zonas claras
 * de la foto del panel de arriba.
 */
function Scrim({ position }: { position: 'top' | 'bottom' }) {
  const rawId = useId();
  const id = `ord${position}${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const stops =
    position === 'top'
      ? [
          { offset: '0%', opacity: 0.55 },
          { offset: '100%', opacity: 0 },
        ]
      : [
          { offset: '0%', opacity: 0 },
          { offset: '100%', opacity: 0.82 },
        ];
  return (
    <View
      pointerEvents="none"
      style={[styles.scrim, position === 'top' ? { top: 0, height: '42%' } : { bottom: 0, height: '68%' }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            {stops.map((st) => (
              <Stop key={st.offset} offset={st.offset} stopColor={colors.ink} stopOpacity={st.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export default function OrdenarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const reduced = useReducedMotion();
  // La carta viene del servidor, así que la cuenta se lee en cada render.
  const REGULAR_ITEM_COUNT = useMenuItemCount();

  // Los paneles ocupan la pantalla completa, así que el respiro va DENTRO de
  // cada uno: arriba el notch, abajo la barra flotante de tabs (y la barra de
  // canasta cuando hay algo dentro), que se pintan encima del panel de abajo.
  const bottomInset = insets.bottom + TAB_BAR_CLEARANCE + (cartCount > 0 ? 76 : 0);
  const enter = reduced ? undefined : FadeIn.duration(motion.base);

  return (
    <View style={styles.root}>
      {/* Mitad 1 — el menú de siempre. Va arriba porque es lo único que hoy
          se puede ordenar; la foto lo hace el panel más apetecible. */}
      <PressableScale
        onPress={() => router.push('/menu-completo')}
        accessibilityRole="button"
        accessibilityLabel={`El menú de siempre: ${REGULAR_ITEM_COUNT} delicias para ordenar ahora`}
        scaleTo={0.985}
        style={styles.panel}
      >
        <Image
          source={SECTION_IMAGES.sandwiches}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Sandwiches de HORNOFINO"
        />
        <Scrim position="top" />
        <Scrim position="bottom" />

        {/* Cabecera encima de la foto: el título de la pestaña y la tienda
            donde recoges. Sobre el scrim superior, que existe para esto. */}
        <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
          <Text style={styles.title}>Ordenar</Text>
          <StoreChip onPress={() => setStoreSheetOpen(true)} />
        </View>

        <Animated.View entering={enter} style={styles.panelBody}>
          <Text style={styles.eyebrowOnPhoto}>La carta de siempre</Text>
          <Text style={styles.panelTitleOnPhoto}>El menú de siempre</Text>
          {/* La descripción salió de acá (Jan, 2 sep 2026): sobre la foto,
              eyebrow + título + dos líneas + botón se veía apretado. El
              conteo se mueve al propio botón, que ya tenía que estar. */}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{REGULAR_ITEM_COUNT} delicias · ordena</Text>
            <ChevronRightIcon size={16} color={colors.ink} />
          </View>
        </Animated.View>
      </PressableScale>

      {/* Mitad 2 — Light. Superficie menta (no borde de color): en este
          sistema menta es SUPERFICIE y todo el texto encima va en ink. */}
      <PressableScale
        onPress={() => router.push('/menu-light')}
        accessibilityRole="button"
        accessibilityLabel={`Probar HORNOFINO Light: ${LIGHT_PLATE_COUNT} platos ligeros. Borrador — se estrena pronto, todavía no se puede ordenar`}
        scaleTo={0.985}
        style={[styles.panel, styles.panelLight]}
      >
        <View style={styles.plateArt} pointerEvents="none">
          <PlateArt kind="bowl" size={168} tone="deep" />
        </View>

        <Animated.View entering={enter} style={[styles.panelBody, { paddingBottom: bottomInset }]}>
          <Text style={styles.eyebrow}>Velando tu salud</Text>
          <Text style={styles.panelTitle}>HORNOFINO Light</Text>
          <Text style={styles.panelDesc}>
            {LIGHT_PLATE_COUNT} platos ligeros pa’ comer bien sin perder el sabor de casa.
          </Text>
          <View style={styles.draft}>
            <Text style={styles.draftText}>Borrador · se estrena pronto</Text>
          </View>
        </Animated.View>
      </PressableScale>

      <CartBar bottomOffset={insets.bottom + TAB_BAR_CLEARANCE} />
      <StoreSheet visible={storeSheetOpen} onClose={() => setStoreSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  // Las dos mitades: flex:1 cada una y sin scroll, así que cada panel mide
  // exactamente la mitad de la pantalla en cualquier teléfono.
  panel: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  panelLight: {
    backgroundColor: colors.menta,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: textSize.display,
    color: '#FFFEFA',
  },
  plateArt: {
    position: 'absolute',
    top: space.xl,
    right: space.lg,
    opacity: 0.9,
  },
  panelBody: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: 5,
  },
  eyebrow: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.caption,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.68,
  },
  eyebrowOnPhoto: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.caption,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(255,254,250,0.86)',
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  panelTitleOnPhoto: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: '#FFFEFA',
  },
  panelDesc: {
    fontFamily: fonts.ui,
    fontSize: textSize.bodyLg,
    lineHeight: 21,
    color: colors.inkSoft,
    maxWidth: 320,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: space.md,
    backgroundColor: '#FFFEFA',
    borderRadius: radius.btn,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  ctaText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.small,
    letterSpacing: tracking.snug,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  draft: {
    alignSelf: 'flex-start',
    marginTop: space.md,
    backgroundColor: colors.ghostFillOnMenta,
    borderRadius: radius.btn,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  draftText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.caption,
    letterSpacing: tracking.snug,
    color: colors.naranjaInk,
  },
});

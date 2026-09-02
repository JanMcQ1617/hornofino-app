// Ordenar — pantalla de ELECCIÓN (Jan, 2 sep 2026).
//
// Antes esta pestaña ERA el menú Light (directiva light-first del 2026-08-11):
// abría directo en platos que nadie puede pedir todavía y el menú ordenable
// quedaba debajo del scroll. Ahora la pestaña pregunta primero — el de
// siempre o el Light — y cada carta vive en su propia pantalla:
//   · /menu-completo → el menú regular, ordenable (única vía de ingresos hoy)
//   · /menu-light    → HORNOFINO Light, borrador sin precios
//
// HONESTIDAD, regla dura: Light sigue siendo un BORRADOR sin precios
// aprobados (LIGHT_MENU_READY en lib/menu-light.ts). La tarjeta de Light dice
// que es borrador ANTES de que la toquen — la elección no puede insinuar que
// se puede ordenar de ahí, o la pantalla estaría vendiendo algo que no existe.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { ChevronRightIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { PlateArt } from '@/components/plate-art';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { LIGHT_SECTIONS } from '@/lib/menu-light';
import { MENU_SECTIONS } from '@/lib/menu';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, shadowCard, space, textSize, tracking } from '@/lib/theme';

const REGULAR_ITEM_COUNT = MENU_SECTIONS.reduce((n, s) => n + s.items.length, 0);
const LIGHT_PLATE_COUNT = LIGHT_SECTIONS.reduce((n, s) => n + s.plates.length, 0);

export default function OrdenarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const reduced = useReducedMotion();

  // Las dos tarjetas entran escalonadas, en el orden en que se leen.
  const enter = (i: number) =>
    reduced ? undefined : FadeInDown.duration(motion.base).delay(i * motion.stagger);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + (cartCount > 0 ? 92 : space.lg),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ordenar</Text>
          <StoreChip onPress={() => setStoreSheetOpen(true)} />
        </View>

        <Text style={styles.lede}>¿Qué te provoca hoy?</Text>

        {/* ——— El menú de siempre: lo único ordenable hoy, va primero ——— */}
        <Animated.View entering={enter(0)}>
          <PressableScale
            onPress={() => router.push('/menu-completo')}
            accessibilityRole="button"
            accessibilityLabel={`El menú de siempre: ${REGULAR_ITEM_COUNT} delicias para ordenar ahora`}
            style={styles.card}
          >
            <View style={styles.photo}>
              <Image
                source={SECTION_IMAGES.sandwiches}
                style={styles.photoImg}
                contentFit="cover"
                accessibilityLabel="Sandwiches de HORNOFINO"
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardEyebrow}>La carta de siempre</Text>
              <Text style={styles.cardTitle}>El menú de siempre</Text>
              <Text style={styles.cardDesc}>
                {REGULAR_ITEM_COUNT} delicias pa’ ordenar ahora mismo — panes, quesitos, sandwiches
                y el café de la finca.
              </Text>
              <View style={[styles.stamp, styles.stampReady]}>
                <Text style={[styles.stampText, styles.stampTextReady]}>Ordena ahora</Text>
              </View>
            </View>
            <ChevronRightIcon size={18} color={colors.ink} />
          </PressableScale>
        </Animated.View>

        {/* ——— Light: se presenta como lo que es, un borrador ——— */}
        <Animated.View entering={enter(1)}>
          <PressableScale
            onPress={() => router.push('/menu-light')}
            accessibilityRole="button"
            accessibilityLabel={`Probar HORNOFINO Light: ${LIGHT_PLATE_COUNT} platos ligeros. Borrador — se estrena pronto, todavía no se puede ordenar`}
            style={[styles.card, styles.cardLight]}
          >
            <View style={styles.plateWrap}>
              <PlateArt kind="bowl" size={64} tone="deep" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardEyebrow}>Velando tu salud</Text>
              <Text style={styles.cardTitle}>HORNOFINO Light</Text>
              <Text style={styles.cardDesc}>
                {LIGHT_PLATE_COUNT} platos ligeros pa’ comer bien sin perder el sabor de casa.
              </Text>
              <View style={[styles.stamp, styles.stampDraft]}>
                <Text style={[styles.stampText, styles.stampTextDraft]}>
                  Borrador · se estrena pronto
                </Text>
              </View>
            </View>
            <ChevronRightIcon size={18} color={colors.ink} />
          </PressableScale>
        </Animated.View>

        <Text style={styles.accent}>La salud es felicidad.</Text>
      </ScrollView>

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
  content: {
    paddingHorizontal: space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: textSize.display,
    color: colors.ink,
  },
  lede: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.subhead,
    color: colors.inkSoft,
    marginBottom: space.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadowCard,
  },
  // Light se distingue por SUPERFICIE, no por un borde de color: menta es
  // superficie en este sistema (regla 2), y todo el texto encima sigue INK.
  cardLight: {
    backgroundColor: colors.mentaSuave,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.btn,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  // Mismo bloque de 72 que la foto, para que las dos tarjetas alineen el
  // texto en la misma columna aunque una lleve grabado y la otra foto.
  plateWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardEyebrow: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.tiny,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.ink,
  },
  cardDesc: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  stamp: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 5,
  },
  stampReady: {
    backgroundColor: colors.ghostFill,
  },
  stampDraft: {
    backgroundColor: colors.ghostFillOnMenta,
  },
  stampText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.tiny,
    letterSpacing: tracking.snug,
  },
  stampTextReady: {
    color: colors.verdeInk,
  },
  stampTextDraft: {
    color: colors.naranjaInk,
  },
  accent: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.subhead,
    color: colors.verdeInk,
    textAlign: 'center',
    marginTop: space.lg,
  },
});

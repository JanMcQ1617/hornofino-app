// Ordenar — LIGHT-FIRST (directiva Jan 2026-08-11). La experiencia principal
// es HORNOFINO Light: platos ligeros y saludables, presentados en grande.
//
// HONESTIDAD, regla dura: el menú Light es un BORRADOR sin precios aprobados
// (ni aquí ni en el servidor). Estas tarjetas NO se pueden añadir a la
// canasta — se presentan como "Probando lo nuevo · Borrador" hasta que el
// cliente apruebe la carta (ver LIGHT_MENU_READY en lib/menu-light.ts).
//
// El menú regular (239 items, la única vía de ingresos hoy) sigue completo y
// ordenable en /menu-completo, enlazado abajo. Su flujo no cambió en nada.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/buttons';
import { CartBar } from '@/components/cart-bar';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { ChevronRightIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { PlateArt, plateKindFor } from '@/components/plate-art';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { LIGHT_SECTIONS } from '@/lib/menu-light';
import { MENU_SECTIONS } from '@/lib/menu';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, shadowCard, space } from '@/lib/theme';

const REGULAR_ITEM_COUNT = MENU_SECTIONS.reduce((n, s) => n + s.items.length, 0);

export default function OrdenarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const reduced = useReducedMotion();

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

        {/* ——— La historia Light ——— */}
        <View style={styles.lightHero}>
          <Text style={styles.eyebrow}>Velando tu salud</Text>
          <Text style={styles.lightTitle}>HORNOFINO Light</Text>
          <View style={styles.draftBadge}>
            <Text style={styles.draftBadgeText}>Probando lo nuevo · Borrador</Text>
          </View>
          <Text style={styles.lightBody}>
            Platos ligeros pensados pa’ comer bien sin perder el sabor de casa.{' '}
            <Text style={styles.lightBodyStrong}>Se estrena pronto en las tres panaderías.</Text>
          </Text>

          {/*
            Light va primero (directiva 2026-08-11) pero Light TODAVÍA NO se
            puede ordenar: son ideas sin precio aprobado. Sin este botón la
            pestaña "Ordenar" abre en comida que nadie puede pedir y la carta
            de verdad queda debajo del scroll — se siente como que el app no
            tiene canasta. Esto deja la jerarquía Light intacta y pone el
            camino a ordenar por encima de la línea de flotación.
          */}
          <PrimaryButton
            label="Ver el menú completo"
            onPress={() => router.push('/menu-completo')}
            accessibilityLabel={`Ver el menú completo: ${REGULAR_ITEM_COUNT} delicias para ordenar ahora`}
            style={{ marginTop: space.lg }}
          />
        </View>

        {LIGHT_SECTIONS.map((section, si) => {
          const tone = si % 2 === 0 ? ('deep' as const) : ('cream' as const);
          return (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.intro ? <Text style={styles.sectionIntro}>{section.intro}</Text> : null}
              <View style={{ gap: space.md }}>
                {section.plates.map((plate, pi) => (
                  <Animated.View
                    key={plate.id}
                    // Entran escalonadas para que la lista se lea de arriba a
                    // abajo en vez de aparecer toda de golpe. El tope de 5 evita
                    // que el último plato espere medio segundo.
                    entering={
                      reduced
                        ? undefined
                        : FadeInDown.duration(motion.base).delay(
                            Math.min(si * 2 + pi, 5) * motion.stagger,
                          )
                    }
                    style={styles.plateCard}
                    accessibilityLabel={`${plate.name}: ${plate.desc}. Idea en borrador — se estrena pronto, todavía no se puede ordenar`}
                  >
                    {/* Placeholder de grabado — se cambia por <Image> cuando
                        Jan entregue las fotos reales del plato. */}
                    <PlateArt kind={plateKindFor(plate.name)} size={104} tone={tone} />
                    <View style={styles.plateInfo}>
                      <View style={styles.plateNameRow}>
                        <Text style={styles.plateName}>{plate.name}</Text>
                      </View>
                      <Text style={styles.plateDesc}>{plate.desc}</Text>
                      <View style={styles.ideaStamp}>
                        <Text style={styles.ideaStampText}>Idea · se estrena pronto</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.accent}>La salud es felicidad.</Text>

        {/* ——— El menú de siempre, demovido pero completo ——— */}
        <PressableScale
          onPress={() => router.push('/menu-completo')}
          accessibilityRole="button"
          accessibilityLabel={`El menú de siempre: ${REGULAR_ITEM_COUNT} delicias para ordenar ahora`}
          style={styles.regularCard}
        >
          <View style={styles.regularPhoto}>
            <Image
              source={SECTION_IMAGES.sandwiches}
              style={styles.regularPhotoImg}
              contentFit="cover"
              accessibilityLabel="Sandwiches de HORNOFINO"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.regularTitle}>El menú de siempre</Text>
            <Text style={styles.regularSub}>{REGULAR_ITEM_COUNT} delicias pa’ ordenar ahora</Text>
          </View>
          <ChevronRightIcon size={18} color={colors.ink} />
        </PressableScale>
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
    marginBottom: space.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
  },
  // Héroe menta: superficie clara, así que todo el texto encima es INK
  // (regla 2 del sistema). Antes era verde oscuro con texto marfil.
  lightHero: {
    backgroundColor: colors.menta,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.xl,
    gap: space.sm,
  },
  eyebrow: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.72,
  },
  lightTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
  },
  draftBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ghostFillOnMenta,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  draftBadgeText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.naranjaInk,
    letterSpacing: 0.4,
  },
  lightBody: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  lightBodyStrong: {
    fontFamily: fonts.uiSemi,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionIntro: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginBottom: space.md,
  },
  plateCard: {
    flexDirection: 'row',
    gap: space.lg,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    ...shadowCard,
  },
  plateInfo: {
    flex: 1,
    gap: 4,
    paddingVertical: 2,
  },
  plateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  plateName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 24,
    color: colors.ink,
  },
  plateDesc: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  ideaStamp: {
    alignSelf: 'flex-start',
    backgroundColor: colors.paper2,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 3,
  },
  ideaStampText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.verdeInk,
  },
  accent: {
    fontFamily: fonts.displayItalic,
    fontSize: 17,
    color: colors.verdeInk,
    textAlign: 'center',
    marginBottom: space.xl,
  },
  regularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.paper,
    borderRadius: radius.btnLg,
    padding: space.md,
    ...shadowCard,
  },
  regularPhoto: {
    width: 64,
    height: 64,
    borderRadius: radius.btn,
    overflow: 'hidden',
  },
  regularPhotoImg: {
    width: '100%',
    height: '100%',
  },
  regularTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
  },
  regularSub: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
});

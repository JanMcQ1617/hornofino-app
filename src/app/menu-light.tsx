// HORNOFINO Light — la carta ligera, en su propia pantalla.
//
// Vivía dentro de (tabs)/ordenar.tsx cuando "Ordenar" ERA Light (directiva
// 2026-08-11, light-first). Desde el 2 sep 2026 "Ordenar" es una pantalla de
// elección (siempre / Light) y este contenido se mudó acá sin cambiarlo.
//
// HONESTIDAD, regla dura que NO se toca al mudarla: el menú Light es un
// BORRADOR sin precios aprobados (ni aquí ni en el servidor). Estas tarjetas
// NO se pueden añadir a la canasta — se presentan como "Probando lo nuevo ·
// Borrador" hasta que el cliente apruebe la carta (LIGHT_MENU_READY en
// lib/menu-light.ts). Ordenarlas fallaría igual: menu-prices.json no las
// conoce.

import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/buttons';
import { CartBar } from '@/components/cart-bar';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { PlateArt, plateKindFor } from '@/components/plate-art';
import { LIGHT_SECTIONS } from '@/lib/menu-light';
import { useMenuItemCount } from '@/lib/use-menu';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, shadowCard, space, textSize, tracking } from '@/lib/theme';


export default function MenuLightScreen() {
  const REGULAR_ITEM_COUNT = useMenuItemCount();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useApp();
  const reduced = useReducedMotion();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: space.md,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + (cartCount > 0 ? 92 : space.lg),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        {/*
          Salida a comida que SÍ se puede pedir. Light entero es borrador, así
          que una pantalla que termina sin canasta se siente como un callejón
          sin salida — este botón es la vía de vuelta al menú ordenable.
        */}
        <PrimaryButton
          label="Ver el menú de siempre"
          onPress={() => router.replace('/menu-completo')}
          accessibilityLabel={`Ver el menú de siempre: ${REGULAR_ITEM_COUNT} delicias para ordenar ahora`}
        />
      </ScrollView>

      <CartBar bottomOffset={insets.bottom + TAB_BAR_CLEARANCE} />
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
    fontSize: textSize.caption,
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
    fontSize: textSize.caption,
    color: colors.naranjaInk,
    letterSpacing: tracking.snug,
  },
  lightBody: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
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
    fontSize: textSize.h1,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionIntro: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.bodyLg,
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
    fontSize: textSize.h3,
    lineHeight: 24,
    color: colors.ink,
  },
  plateDesc: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
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
    fontSize: textSize.tiny,
    letterSpacing: tracking.snug,
    color: colors.verdeInk,
  },
  accent: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.subhead,
    color: colors.verdeInk,
    textAlign: 'center',
    marginBottom: space.xl,
  },
});

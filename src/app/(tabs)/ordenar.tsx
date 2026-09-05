// Ordenar — la pantalla donde se escoge carta.
//
// HISTORIA, para no repetir el mismo error dos veces:
//   · 11 ago — la pestaña ERA el menú Light: abría en platos que nadie puede
//              pedir, y el menú ordenable quedaba debajo del scroll.
//   ·  2 sep — dos mitades iguales: foto arriba, menta abajo.
//   ·  4 sep — esto.
//
// POR QUÉ SE REHIZO. Las dos mitades iguales le daban el mismo peso a lo que
// da de comer y a un borrador, y la mitad de menta quedaba plana. Encima
// llevaba una pastilla que decía "Borrador · se estrena pronto": ese punto
// medio pegando dos fragmentos es justo el tic que hace que una interfaz
// parezca generada, y fue lo que Jan marcó.
//
// LO QUE HAY AHORA. No son dos mitades: es una CARTA y una NOTA AL PIE. La
// carta ordenable se queda con la foto y con 62% de la pantalla, porque es lo
// único que se puede pedir hoy. Light baja a una banda de menta más corta,
// donde el estado se dice en una frase entera en vez de en una etiqueta.
// Sin pastillas y sin "·" pegando trozos: cada línea es una oración.
//
// HONESTIDAD, la regla que no se toca: Light NO tiene precios aprobados
// (LIGHT_MENU_READY en lib/menu-light.ts). La banda dice que es borrador ANTES
// de que nadie la toque, y la carta que sí se puede pedir va primero.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { ChevronRightIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { PlateArt } from '@/components/plate-art';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { LIGHT_SECTIONS } from '@/lib/menu-light';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { useMenuItemCount } from '@/lib/use-menu';
import { colors, fonts, motion, radius, space, textSize, tracking } from '@/lib/theme';

const LIGHT_PLATE_COUNT = LIGHT_SECTIONS.reduce((n, s) => n + s.plates.length, 0);

/**
 * Scrim sobre la foto. No hay expo-linear-gradient en el proyecto, así que el
 * degradado se dibuja con react-native-svg — mismo recurso que hero-slideshow.
 * Sin esto el texto blanco se pierde en las migas claras del pan.
 */
function Scrim() {
  const rawId = useId();
  const id = `ord${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={styles.scrim}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.ink} stopOpacity={0} />
            <Stop offset="55%" stopColor={colors.ink} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={colors.ink} stopOpacity={0.92} />
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
  const itemCount = useMenuItemCount();

  const bottomInset = insets.bottom + TAB_BAR_CLEARANCE + (cartCount > 0 ? 76 : 0);
  const enter = reduced ? undefined : FadeInDown.duration(motion.base);

  return (
    <View style={styles.root}>
      {/* ——— La carta que sí se puede pedir ——— */}
      <PressableScale
        onPress={() => router.push('/menu-completo')}
        accessibilityRole="button"
        accessibilityLabel={`El menú de siempre. Ver las ${itemCount} delicias y ordenar`}
        scaleTo={0.99}
        style={styles.carta}
      >
        <Image
          source={SECTION_IMAGES.sandwiches}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Sandwich de HORNOFINO"
        />
        <Scrim />

        <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
          <Text style={styles.title}>Ordenar</Text>
          <StoreChip onPress={() => setStoreSheetOpen(true)} />
        </View>

        <Animated.View entering={enter} style={styles.cartaBody}>
          <Text style={styles.kicker}>La carta de la panadería</Text>
          <Text style={styles.cartaTitle}>El menú{'\n'}de siempre</Text>
          {/* Barra ancha, no un botón chiquito: es la única acción de esta
              mitad, y el conteo va DENTRO, que es donde se lee sin adornos. */}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Ver las {itemCount} delicias</Text>
            <ChevronRightIcon size={17} color={colors.ink} />
          </View>
        </Animated.View>
      </PressableScale>

      {/* ——— Light: nota al pie, no segunda mitad ———
          Menta es SUPERFICIE (1.94:1), así que todo el texto encima va en ink.
          Ver la nota de contraste al principio de theme.ts. */}
      <PressableScale
        onPress={() => router.push('/menu-light')}
        accessibilityRole="button"
        accessibilityLabel={`HORNOFINO Light: ${LIGHT_PLATE_COUNT} platos ligeros. Todavía es un borrador y no se puede ordenar`}
        scaleTo={0.99}
        style={[styles.light, { paddingBottom: bottomInset }]}
      >
        {/* El bowl se sale por el borde: da profundidad sin pedir una foto que
            para estos platos todavía no existe. */}
        <View style={styles.lightArt} pointerEvents="none">
          <PlateArt kind="bowl" size={190} tone="deep" />
        </View>

        <View style={styles.lightBody}>
          <Text style={styles.lightKicker}>Velando tu salud</Text>
          <Text style={styles.lightTitle}>HORNOFINO Light</Text>
          <Text style={styles.lightNote}>
            {LIGHT_PLATE_COUNT} platos ligeros que todavía estamos afinando. Puedes verlos, pero
            por ahora no se piden: las recetas y los precios los deciden ellos.
          </Text>
          <View style={styles.lightLinkRow}>
            <Text style={styles.lightLink}>Míralos igual</Text>
            <ChevronRightIcon size={15} color={colors.verdeInk} />
          </View>
        </View>
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
  /* 62/38 en vez de 50/50: manda la carta que da de comer, y la banda de Light
     se lee como pie de página en vez de como una opción equivalente. */
  carta: {
    flex: 62,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
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
    color: '#FFFFFF',
  },
  cartaBody: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  kicker: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.caption,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 6,
  },
  cartaTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 43,
    color: '#FFFFFF',
    marginBottom: space.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.btn,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
  },
  ctaText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.bodyLg,
    letterSpacing: tracking.snug,
    color: colors.ink,
  },

  light: {
    flex: 38,
    backgroundColor: colors.menta,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lightArt: {
    position: 'absolute',
    right: -42,
    top: -28,
    opacity: 0.42,
  },
  lightBody: {
    paddingHorizontal: space.lg,
  },
  lightKicker: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.caption,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  lightTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    color: colors.ink,
    marginBottom: 7,
  },
  lightNote: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
    lineHeight: 20,
    color: colors.ink,
    opacity: 0.82,
    maxWidth: 300,
  },
  lightLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: space.md,
  },
  lightLink: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.body,
    letterSpacing: tracking.snug,
    color: colors.verdeInk,
  },
});

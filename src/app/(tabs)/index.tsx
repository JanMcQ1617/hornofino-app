// Inicio — hogar a pantalla completa estilo Pura Vida (directiva 5):
// foto de comida de borde a borde detrás de todo, banda de saludo arriba,
// tarjeta de premio flotante, dos CTAs grandes abajo y la barra de tabs
// flotante encima de todo. Cero banners inventados: el contador muestra
// SELLOS reales y la tarjeta de premio solo aparece con un QSTO real.

import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientSlab } from '@/components/buttons';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { HeroSlideshow } from '@/components/hero-slideshow';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { getOrderStatus, type OrderStatusName } from '@/lib/api';
import { money } from '@/lib/format';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { colors, fonts, radius, shadowCard, space, textSize, tracking } from '@/lib/theme';

const STATUS_LABEL: Record<OrderStatusName, string> = {
  nueva: 'Recibida',
  preparando: 'En el horno',
  lista: '¡Lista! Pasa a recogerla',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
};

/**
 * Los sellos de la tarjeta, en chiquito, para la banda superior.
 *
 * Antes esto era el texto "0 de 6". Tres problemas: lo primero que veía un
 * cliente nuevo era un CERO enorme, había dos etiquetas ("Horno Rewards" y
 * "Sellos") para un solo número, y se tiraba a la basura el lenguaje visual
 * propio de la marca — la tarjeta ponchada, que el app ya dibuja en Mi QR.
 *
 * Seis puntos dicen lo mismo sin leer, y con la tarjeta vacía se leen como
 * "aquí está tu tarjeta" en vez de "no tienes nada".
 */
function StampDots({ filled, goal }: { filled: number; goal: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: goal }, (_, i) => (
        <View key={i} style={[styles.dot, i < filled ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

export default function InicioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, card, lastOrder, localOrders, repeatLastOrder, refreshCard } = useApp();
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<OrderStatusName | null>(null);
  const [headerH, setHeaderH] = useState(150);

  const firstName = name.trim().split(/\s+/)[0] ?? '';
  /* Saludo por hora del día, en hora de Puerto Rico (AST, sin horario de
     verano) — no en la del teléfono, que puede venir de viaje. Se recalcula
     en cada render: la pantalla se vuelve a montar al cambiar de pestaña, así
     que a las 12:01 ya dice "Buenas tardes" sin nada que lo refresque. */
  const greeting = (() => {
    const pr = new Date(Date.now() + new Date().getTimezoneOffset() * 60_000 - 4 * 3600_000);
    const h = pr.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const recent = localOrders[0];
  const recentIsFresh = recent != null && Date.now() - recent.ts < 3 * 60 * 60 * 1000;

  useFocusEffect(
    useCallback(() => {
      refreshCard();
      let alive = true;
      if (recentIsFresh && recent) {
        getOrderStatus(recent.id)
          .then((info) => {
            if (alive) setActiveStatus(info.status);
          })
          .catch(() => {
            if (alive) setActiveStatus(null);
          });
      }
      return () => {
        alive = false;
      };
    }, [refreshCard, recentIsFresh, recent]),
  );

  const repeat = () => {
    if (repeatLastOrder()) router.push('/carrito');
    else router.push('/ordenar');
  };

  const stampsLeft = card ? Math.max(0, card.goal - card.stamps) : null;
  const firstReward = card?.rewards[0] ?? null;
  const showEncouragement =
    card != null && firstReward == null && card.stamps >= 4 && stampsLeft != null && stampsLeft > 0;
  const bottomPad = insets.bottom + TAB_BAR_CLEARANCE + space.md;

  return (
    <View style={styles.root}>
      <HeroSlideshow
        paused={storeSheetOpen}
        dotsStyle={{ top: headerH + 10, right: space.lg }}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        {/* ——— Banda superior ——— */}
        <View
          style={[styles.headerBand, { paddingTop: insets.top + space.sm }]}
          onLayout={(e) => setHeaderH(Math.round(e.nativeEvent.layout.height))}
        >
          {/* Cabecera más fina (Jan, 5 sep 2026): el saludo a la izquierda y,
              a la derecha, Horno Rewards con la panadería DEBAJO. Antes la
              tienda colgaba del saludo y empujaba la banda hacia abajo; ahora
              las dos columnas comparten alto y la banda encoge sola.
              Fuera "Velando tu salud": es el lema de Light, no del inicio, y
              era la tercera línea que engordaba la cabecera. */}
          <View style={styles.headerRow}>
            <Text style={styles.hello} numberOfLines={2}>
              {greeting}
              {firstName ? `, ${firstName}` : ''}.
            </Text>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push('/qr')}
                accessibilityRole="button"
                accessibilityLabel={
                  card
                    ? `Horno Rewards: ${card.stamps} de ${card.goal} sellos. Ver mi tarjeta`
                    : 'Horno Rewards: únete gratis'
                }
                style={({ pressed }) => [styles.counter, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.counterLabel}>Horno Rewards</Text>
                {card ? (
                  <StampDots filled={card.stamps} goal={card.goal} />
                ) : (
                  <View style={styles.joinPill}>
                    <Text style={styles.joinPillText}>Únete gratis</Text>
                  </View>
                )}
              </Pressable>
              <StoreChip onPress={() => setStoreSheetOpen(true)} />
            </View>
          </View>
        </View>

        {/* ——— Notificaciones flotantes ——— */}
        <View style={styles.floatStack} pointerEvents="box-none">
          {recentIsFresh &&
          recent &&
          activeStatus &&
          activeStatus !== 'entregada' &&
          activeStatus !== 'cancelada' ? (
            <Pressable
              onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: recent.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Tu orden ${recent.id}: ${STATUS_LABEL[activeStatus]}. Ver seguimiento`}
              style={({ pressed }) => [styles.activeChip, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.activeDot} />
              <Text style={styles.activeText} numberOfLines={1}>
                {recent.id} · {STATUS_LABEL[activeStatus]}
              </Text>
            </Pressable>
          ) : null}

          {firstReward ? (
            <Pressable
              onPress={() => router.push('/qr')}
              accessibilityRole="button"
              accessibilityLabel={`Premio desbloqueado: quesito gratis, código ${firstReward}. Muéstralo en caja. Ver en Mi QR`}
              style={({ pressed }) => [styles.rewardCard, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Image
                source={SECTION_IMAGES['mega-quesito']}
                style={styles.rewardThumb}
                contentFit="cover"
                accessibilityLabel="Quesito de HORNOFINO"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardKicker}>Premio desbloqueado 🥐</Text>
                <Text style={styles.rewardTitle}>Quesito gratis</Text>
                <Text style={styles.rewardSub}>Muéstralo en caja · {firstReward}</Text>
              </View>
            </Pressable>
          ) : showEncouragement ? (
            <Pressable
              onPress={() => router.push('/qr')}
              accessibilityRole="button"
              accessibilityLabel={`Ya casi: te ${stampsLeft === 1 ? 'falta 1 sello' : `faltan ${stampsLeft} sellos`} pa'l quesito gratis. Ver mi tarjeta`}
              style={({ pressed }) => [styles.rewardCard, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Image
                source={SECTION_IMAGES['mega-quesito']}
                style={styles.rewardThumb}
                contentFit="cover"
                accessibilityLabel="Quesito de HORNOFINO"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardKicker, { color: colors.verdeInk }]}>Ya casi 🥐</Text>
                <Text style={styles.rewardTitle}>
                  {stampsLeft === 1 ? 'Te falta 1 pa’l quesito' : `Te faltan ${stampsLeft} pa’l quesito`}
                </Text>
                <Text style={styles.rewardSub}>Cada orden poncha un sello</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* ——— Grupo inferior: repetir + los dos CTAs ——— */}
        <View style={[styles.bottomGroup, { paddingBottom: bottomPad }]} pointerEvents="box-none">
          {lastOrder ? (
            <Pressable
              onPress={repeat}
              accessibilityRole="button"
              accessibilityLabel={`Repetir tu última orden por ${money(lastOrder.total)}`}
              style={({ pressed }) => [styles.repeatChip, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.repeatText}>Repetir lo de siempre</Text>
              <Text style={styles.repeatTotal}>{money(lastOrder.total)}</Text>
            </Pressable>
          ) : null}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.push('/ordenar')}
              accessibilityRole="button"
              accessibilityLabel="Ordena ahora"
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <GradientSlab borderRadius={radius.btnLg} />
              <Text style={styles.ctaPrimaryText}>Ordena ahora</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/qr')}
              accessibilityRole="button"
              accessibilityLabel="Escanea en tienda: abre tu QR de Horno Rewards"
              style={({ pressed }) => [styles.cta, styles.ctaFrosted, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.ctaFrostedText}>Escanea en tienda</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <StoreSheet visible={storeSheetOpen} onClose={() => setStoreSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // telón detrás de la foto a sangre: solo se ve mientras carga el slideshow
    flex: 1,
    backgroundColor: colors.menta,
  },
  overlay: {
    flex: 1,
  },
  // Borde DURO contra la foto, no degradado (directiva Jan 2026-08-14).
  // Un degradado mediocre se lee como un error; un corte recto se lee como una
  // decisión. De paso la foto queda sin velo: color pleno desde el primer píxel.
  headerBand: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,          // era space.lg — banda más fina
    backgroundColor: colors.marfil,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  /* Rewards arriba, panadería debajo, ambos alineados a la derecha. */
  headerRight: {
    alignItems: 'flex-end',
    gap: space.sm,
  },
  hello: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
    color: colors.ink,
  },
  counter: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  counterLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  dotFilled: {
    backgroundColor: colors.verde,
  },
  dotEmpty: {
    // aro en vez de relleno pálido: sobre una foto un relleno claro desaparece
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
  },
  // Sin tarjeta esto es una ACCIÓN, así que se ve como pastilla, no como dato.
  joinPill: {
    marginTop: 6,
    backgroundColor: colors.naranja,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  joinPillText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.tiny,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  floatStack: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.frostChip,
    borderRadius: radius.btn,
    paddingHorizontal: space.md,
    paddingVertical: 9,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.verde,
  },
  activeText: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.small,
    color: colors.verdeInk,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.marfil,
    borderRadius: radius.btnLg,
    padding: space.md,
    ...shadowCard,
  },
  rewardThumb: {
    width: 54,
    height: 54,
    borderRadius: radius.btn,
  },
  rewardKicker: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color: colors.naranjaInk,
  },
  rewardTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h4,
    color: colors.ink,
    marginTop: 1,
  },
  rewardSub: {
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    color: colors.inkSoft,
    marginTop: 1,
  },
  bottomGroup: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  repeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.frostBar,
    borderRadius: radius.btn,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  repeatText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.small,
    color: colors.ink,
  },
  repeatTotal: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.small,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  ctaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cta: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.btnLg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  ctaPrimaryText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.small,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
  },
  ctaFrosted: {
    backgroundColor: colors.inkFrost,
  },
  ctaFrostedText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.small,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.marfil,
    textAlign: 'center',
  },
});

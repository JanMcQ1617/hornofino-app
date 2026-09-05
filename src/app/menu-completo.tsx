// El menú de siempre — la carta completa (239 delicias), totalmente ordenable.
// Hoy es la única vía de ingresos: el flujo de canasta/checkout NO se toca.
// Un toque añade; la barra de canasta siempre a mano. Lista aplanada
// (headers + items) con offsets precalculados para los chips de categoría.

import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CartBar } from '@/components/cart-bar';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { PressableScale } from '@/components/motion';
import { StoreChip, StoreSheet } from '@/components/store-sheet';
import { VariantSheet } from '@/components/variant-sheet';
import { menuPrice } from '@/lib/format';
import { type MenuItem, type MenuSection } from '@/lib/menu';
import { useMenu } from '@/lib/use-menu';
import { SECTION_IMAGES } from '@/lib/section-images';
import { useApp } from '@/lib/state';
import { colors, fonts, motion, radius, space, textSize } from '@/lib/theme';

/**
 * Chip de categoría. La placa de menta CRECE por detrás de la foto en vez de
 * aparecer de golpe: el ojo sigue un objeto que llega, no un color que cambia.
 * Escala desde 0.85 porque a tamaño 62 un arranque menor se ve como un parpadeo.
 */
function SectionChip({
  section,
  active,
  onPress,
}: {
  section: MenuSection;
  active: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const p = useDerivedValue(() =>
    reduced
      ? active
        ? 1
        : 0
      : withSpring(active ? 1 : 0, motion.spring),
  );
  const plateStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.85 + 0.15 * p.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    // el peso no se puede animar, pero el color sí acompaña al muelle
    opacity: reduced ? 1 : 0.65 + 0.35 * p.value,
  }));

  return (
    <PressableScale
      onPress={onPress}
      noHaptic
      accessibilityRole="button"
      accessibilityLabel={`Ir a ${section.title}`}
      accessibilityState={{ selected: active }}
      style={styles.chip}
    >
      <View style={styles.chipPhotoWrap}>
        <Animated.View pointerEvents="none" style={[styles.chipPlate, plateStyle]} />
        <Image source={SECTION_IMAGES[section.photo]} style={styles.chipPhoto} contentFit="cover" />
      </View>
      <Animated.Text
        style={[styles.chipLabel, active && styles.chipLabelActive, labelStyle]}
        numberOfLines={1}
      >
        {section.title}
      </Animated.Text>
    </PressableScale>
  );
}

/**
 * El número de cantidad REBOTA cuando cambia — esa es la confirmación de que
 * "sí, se añadió", sin necesidad de un toast.
 *
 * Ojo: la animación la dispara el CAMBIO DE VALOR, no el montaje. Esta lista
 * está virtualizada (239 filas), así que una fila que vuelve a entrar en
 * pantalla se remonta; con `entering` los steppers estarían apareciendo solos
 * mientras uno hace scroll. Comparando contra el valor anterior, un remonte
 * simplemente pinta el estado final.
 */
function QtyBump({ qty, style }: { qty: number; style: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const prev = useRef(qty);

  useEffect(() => {
    if (qty !== prev.current && !reduced) {
      scale.set(
        withSequence(withSpring(1.25, { damping: 9, stiffness: 340 }), withSpring(1, motion.spring)),
      );
    }
    prev.current = qty;
  }, [qty, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[style, animated]}>{qty}</Animated.Text>;
}

const ROW_H = 76;
const HEADER_H = 150;

type Row =
  | { type: 'header'; section: MenuSection }
  | { type: 'item'; item: MenuItem; sectionId: string };

/*
 * El layout de la lista se derivaba de la carta COMPILADA, en el módulo. Ahora
 * la carta llega del servidor y puede cambiar mientras la pantalla vive, así
 * que se calcula por render (useMemo). Son 252 filas: barato, y evita que
 * getItemLayout mienta después de un refresco — que es lo que haría saltar el
 * scroll a una posición que ya no existe.
 */
type MenuLayout = {
  rows: Row[];
  firstIndex: Record<string, number>;
  heights: number[];
  offsets: number[];
};

function buildLayout(sections: MenuSection[]): MenuLayout {
  const rows: Row[] = [];
  const firstIndex: Record<string, number> = {};
  for (const section of sections) {
    firstIndex[section.id] = rows.length;
    rows.push({ type: 'header', section });
    for (const item of section.items) {
      rows.push({ type: 'item', item, sectionId: section.id });
    }
  }
  const heights = rows.map((r) => (r.type === 'header' ? HEADER_H : ROW_H));
  const offsets: number[] = [];
  let acc = 0;
  for (const h of heights) {
    offsets.push(acc);
    acc += h;
  }
  return { rows, firstIndex, heights, offsets };
}

/** Sección visible dada la posición de scroll (búsqueda binaria sobre offsets). */
function sectionAtOffset(layout: MenuLayout, y: number): string {
  let lo = 0;
  let hi = layout.offsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (layout.offsets[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  const row = layout.rows[lo];
  return row.type === 'header' ? row.section.id : row.sectionId;
}

function ItemRow({
  item,
  onAdd,
  onOpenVariants,
  qty,
}: {
  item: MenuItem;
  qty: number;
  onAdd: (item: MenuItem) => void;
  onOpenVariants: (item: MenuItem) => void;
}) {
  const { decrementLine } = useApp();
  const priceLabel = menuPrice(item);
  const hasVariants = !!item.variants?.length;

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[rowStyles.price, item.ask && rowStyles.priceAsk]}>{priceLabel}</Text>
      </View>
      {item.ask ? null : hasVariants ? (
        <PressableScale
          onPress={() => onOpenVariants(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}: escoger tamaño y añadir`}
          style={[rowStyles.addBtn, qty > 0 && rowStyles.addBtnActive]}
        >
          {qty > 0 ? (
            <QtyBump qty={qty} style={rowStyles.qtyBadge} />
          ) : (
            <PlusIcon size={17} color={colors.ink} strokeWidth={2.6} />
          )}
        </PressableScale>
      ) : qty > 0 ? (
        <View style={rowStyles.stepper}>
          <Pressable
            onPress={() => {
              decrementLine(item.id);
              Haptics.selectionAsync().catch(() => {});
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Quitar un ${item.name}`}
            style={({ pressed }) => [rowStyles.stepBtn, pressed && rowStyles.pressed]}
          >
            <MinusIcon size={15} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
          <QtyBump qty={qty} style={rowStyles.stepQty} />
          <Pressable
            onPress={() => onAdd(item)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Añadir otro ${item.name}`}
            style={({ pressed }) => [rowStyles.stepBtn, rowStyles.stepBtnPlus, pressed && rowStyles.pressed]}
          >
            <PlusIcon size={15} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : (
        <PressableScale
          onPress={() => onAdd(item)}
          accessibilityRole="button"
          accessibilityLabel={`Añadir ${item.name}, ${priceLabel}`}
          style={rowStyles.addBtn}
        >
          <PlusIcon size={17} color={colors.ink} strokeWidth={2.6} />
        </PressableScale>
      )}
    </View>
  );
}

export default function MenuCompletoScreen() {
  const { addToCart, qtyInCart, cartCount } = useApp();
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null);
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const sections = useMenu();
  const layout = useMemo(() => buildLayout(sections), [sections]);
  const [activeSection, setActiveSection] = useState(sections[0].id);

  const listRef = useRef<FlatList<Row>>(null);
  const chipsRef = useRef<FlatList<MenuSection>>(null);
  const scrollingFromChip = useRef(false);

  const add = useCallback(
    (item: MenuItem) => {
      addToCart(item);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [addToCart],
  );

  const jumpTo = useCallback((sectionId: string) => {
    const index = layout.firstIndex[sectionId];
    if (index == null) return;
    scrollingFromChip.current = true;
    setActiveSection(sectionId);
    listRef.current?.scrollToOffset({ offset: layout.offsets[index], animated: true });
    setTimeout(() => {
      scrollingFromChip.current = false;
    }, 600);
  }, [layout]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (scrollingFromChip.current) return;
      const id = sectionAtOffset(layout, e.nativeEvent.contentOffset.y + 10);
      setActiveSection((prev: string) => {
        if (prev === id) return prev;
        const chipIndex = sections.findIndex((s: MenuSection) => s.id === id);
        if (chipIndex >= 0) {
          chipsRef.current?.scrollToIndex({ index: chipIndex, viewPosition: 0.5, animated: true });
        }
        return id;
      });
    },
    [layout, sections],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: Row }) => {
      if (row.type === 'header') {
        const img = SECTION_IMAGES[row.section.photo];
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBanner}>
              {img ? (
                <Image
                  source={img}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                  accessibilityLabel={row.section.title}
                />
              ) : null}
              <View style={styles.sectionScrim} />
              <Text style={styles.sectionTitle}>{row.section.title}</Text>
            </View>
          </View>
        );
      }
      return (
        <ItemRow
          item={row.item}
          qty={qtyInCart(row.item.id)}
          onAdd={add}
          onOpenVariants={setVariantItem}
        />
      );
    },
    [add, qtyInCart],
  );

  const chips = useMemo(
    () => (
      <FlatList
        ref={chipsRef}
        data={sections}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        style={styles.chipsBar}
        contentContainerStyle={styles.chipsContent}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: section }) => (
          <SectionChip
            section={section}
            active={section.id === activeSection}
            onPress={() => jumpTo(section.id)}
          />
        )}
      />
    ),
    [activeSection, jumpTo],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View />
          <StoreChip onPress={() => setStoreSheetOpen(true)} />
        </View>
      </View>
      {chips}
      <FlatList
        ref={listRef}
        data={layout.rows}
        renderItem={renderRow}
        keyExtractor={(row, i) => (row.type === 'header' ? `h-${row.section.id}` : `${row.item.id}-${i}`)}
        getItemLayout={(_, index) => ({ length: layout.heights[index], offset: layout.offsets[index], index })}
        onScroll={onScroll}
        scrollEventThrottle={80}
        initialNumToRender={14}
        maxToRenderPerBatch={16}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 120 : space.xxl }}
        showsVerticalScrollIndicator={false}
      />
      <CartBar />
      <VariantSheet item={variantItem} onClose={() => setVariantItem(null)} />
      <StoreSheet visible={storeSheetOpen} onClose={() => setStoreSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  /* El riel es hermano flex de la lista vertical de 239 filas. Los hijos
     flex traen flexShrink:1 por defecto, así que la lista grande le comía
     alto al riel y las etiquetas salían CORTADAS a la mitad (Jan, 2 sep
     2026). flexGrow/Shrink 0 lo fija a su contenido. */
  chipsBar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsContent: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.md,
  },
  chip: {
    alignItems: 'center',
    width: 74,
  },
  // Activo = placa verde detrás de la foto (relleno, nunca anillo/borde).
  chipPhotoWrap: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    padding: 3,
    backgroundColor: 'transparent',
  },
  chipPlate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: colors.verde,
  },
  chipPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chipLabel: {
    marginTop: 5,
    fontFamily: fonts.uiMedium,
    fontSize: textSize.tiny,
    // lineHeight explícito: sin él la caja la decide la fuente y las tildes
    // y descendentes de "Repostería"/"Pastelería" quedaban al filo.
    lineHeight: 15,
    color: colors.inkSoft,
    maxWidth: 74,
    textAlign: 'center',
  },
  chipLabelActive: {
    fontFamily: fonts.uiBold,
    color: colors.verdeInk,
  },
  sectionHeader: {
    height: HEADER_H,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  sectionBanner: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sectionScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h1,
    color: colors.marfil,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineSoft,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.bodyLg,
    lineHeight: 20,
    color: colors.ink,
  },
  price: {
    marginTop: 2,
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  priceAsk: {
    fontFamily: fonts.displayItalic,
    color: colors.inkFaint,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.btn,
    backgroundColor: colors.naranja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: {
    backgroundColor: colors.naranjaLuz,
  },
  qtyBadge: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.bodyLg,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper2,
    borderRadius: radius.btn,
    padding: 3,
    gap: 2,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    backgroundColor: colors.marfil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: {
    backgroundColor: colors.naranja,
  },
  stepQty: {
    minWidth: 26,
    textAlign: 'center',
    fontFamily: fonts.uiBold,
    fontSize: textSize.bodyLg,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});

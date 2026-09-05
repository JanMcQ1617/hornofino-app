// Barra de tabs FLOTANTE (directiva 5, estilo Pura Vida): contenedor
// redondeado despegado de los bordes, blanco translúcido + sombra suave.
// Reemplaza el tab bar pegado de expo-router vía la prop `tabBar` — cero
// dependencias nuevas. Los iconos siguen siendo nuestros SVG y las
// etiquetas van en versalitas chiquitas.
//
// Movimiento (2026-08-13): antes solo cambiaba de color. Ahora una pastilla
// de menta se DESLIZA con muelle de un tab al otro — un solo objeto que se
// mueve, no dos que se prenden y se apagan. Eso es lo que hace que la barra
// se sienta continua en vez de conmutada. El icono activo sube un pelo y
// escala; la háptica es `select`, no `tap`, porque cambiar de sección es una
// selección, no un golpe.
//
// Material (2026-08-15): la barra pasó de blanco al 95% a CRISTAL
// (components/glass.tsx). El blanco casi opaco sobre un fondo blanco no se
// leía como algo flotando — se leía como un recorte. El cristal deja pasar
// el contenido que corre por debajo, que es justo lo que dice "esto flota
// encima de la página".
//
// La pastilla además se ESTIRA en su dirección de viaje y vuelve a asentar
// — squash-and-stretch, prestado de la animación de personajes. Es lo que
// hace que el movimiento se lea como peso y no como un valor interpolado.
//
// Tipado estructural a propósito: expo-router SDK 57 tiene bottom-tabs
// "vendored" (sin subpath público para BottomTabBarProps), así que
// declaramos solo la forma que usamos — compatible con lo que Tabs pasa.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass';
import { haptic } from '@/components/motion';
import { colors, fonts, motion, radius, textSize, tracking } from '@/lib/theme';

/**
 * Espacio vertical que la barra flotante ocupa sobre el borde inferior.
 * Las pantallas de tabs suman `insets.bottom + TAB_BAR_CLEARANCE` a su
 * padding inferior (o al offset de la barra de canasta) para no quedar
 * escondidas debajo.
 */
export const TAB_BAR_CLEARANCE = 84;

/** padding horizontal interno de la barra; la pastilla arranca aquí */
const BAR_PAD = 6;

/** cuánto se estira la pastilla a viaje completo. 18% se lee; 30% es caricatura */
const STRETCH = 0.18;

/**
 * Muelle propio de la pastilla, MÁS RÁPIDO que `motion.spring`.
 *
 * El token compartido mueve doce cosas — hojas, barra de canasta, escala de
 * pulsación — y a la pastilla se le pedía ir más rápido a ella sola, así que
 * subirlo allí habría acelerado la app entera.
 *
 * El cambio es de VELOCIDAD, no de carácter. Se sube la frecuencia natural
 * y se mantiene el amortiguamiento relativo, así el rebote es el mismo, solo
 * que llega antes:
 *
 *   token compartido   ωn = √(220/0.9) = 15.6 rad/s   ζ = 18/(2√198)  = 0.64
 *   pastilla           ωn = √(640/0.9) = 26.7 rad/s   ζ = 31/(2√576)  = 0.65
 *
 * ~1.7x más rápido con el mismo sobrepaso. El asentamiento pasa de ~0.40s a
 * ~0.23s.
 *
 * El estirón no se resiente: `stretch` se deriva del retraso normalizado, y
 * al arrancar el retraso vale 1 sea cual sea el muelle — el máximo se sigue
 * alcanzando, solo que se resuelve antes.
 */
const PILL_SPRING = { damping: 31, stiffness: 640, mass: 0.9 } as const;

type TabBarIconProps = { focused: boolean; color: string; size: number };

type FloatingTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarAccessibilityLabel?: string;
        tabBarIcon?: (props: TabBarIconProps) => React.ReactNode;
      };
    }
  >;
  navigation: {
    // sintaxis de método a propósito: bivariante, acepta el emit real
    emit(event: {
      type: 'tabPress';
      target?: string;
      canPreventDefault: true;
    }): { defaultPrevented: boolean };
    navigate(name: string): void;
  };
};

/** Un tab: el icono activo escala y sube apenas. */
function TabItem({
  focused,
  reduced,
  children,
}: {
  focused: boolean;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    if (reduced) return { transform: [{ scale: 1 }, { translateY: 0 }] };
    return {
      transform: [
        // Mismo muelle que la pastilla, no el compartido: el icono y la
        // pastilla son UN solo gesto. Si la pastilla llega 1.7x antes que el
        // icono que va cargando, la selección se parte en dos tiempos.
        { scale: withSpring(focused ? 1.08 : 1, PILL_SPRING) },
        { translateY: withSpring(focused ? -1 : 0, PILL_SPRING) },
      ],
    };
  });
  return <Animated.View style={[styles.itemInner, style]}>{children}</Animated.View>;
}

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [barW, setBarW] = useState(0);

  const count = Math.max(state.routes.length, 1);
  const itemW = barW > 0 ? (barW - BAR_PAD * 2) / count : 0;

  /*
   * Un número normal que capturan los worklets de abajo — NO un shared
   * value. Escribir un shared value durante el render es justo de lo que
   * avisa Reanimated, y aquí no compra nada: el plugin de babel toma
   * `targetX` como dependencia del closure, así que los dos worklets se
   * vuelven a correr apenas cambia el índice activo.
   */
  const targetX = state.index * itemW;

  // La pastilla persigue el índice activo. useDerivedValue para que el
  // muelle arranque solo cuando cambia el índice, sin efectos ni estado.
  const x = useDerivedValue(() =>
    reduced
      ? withTiming(targetX, { duration: motion.fast })
      : withSpring(targetX, PILL_SPRING),
  );

  /*
   * Lo que le falta por recorrer es lo que manda el estiramiento: así
   * llega al máximo a mitad de vuelo y vuelve a 1 exacto cuando el muelle
   * asienta. Derivarlo del retraso (y no de una línea de tiempo aparte)
   * hace imposible que los dos se desincronicen — nunca queda una
   * pastilla estirada por un gesto interrumpido.
   */
  const stretch = useDerivedValue(() => {
    if (reduced || itemW === 0) return 1;
    const lag = Math.abs(targetX - x.value) / itemW;
    return 1 + Math.min(lag, 1) * STRETCH;
  });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scaleX: stretch.value },
      // Conserva el área: una pastilla que solo se ensancha parece inflada.
      { scaleY: 2 - stretch.value },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 2 }]}
    >
      <GlassSurface cornerRadius={radius.xl} style={styles.bar}>
        <View
          style={styles.row}
          onLayout={(e) => setBarW(Math.round(e.nativeEvent.layout.width))}
        >
          {itemW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, { width: itemW - 6, left: BAR_PAD + 3 }, pillStyle]}
            />
          ) : null}

          {state.routes.map((route, i) => {
            const options = descriptors[route.key]?.options ?? {};
            const focused = state.index === i;
            const color = focused ? colors.verdeInk : colors.inkFaint;
            const label = (options.title ?? route.name).toUpperCase();
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                haptic.select();
                navigation.navigate(route.name);
              }
            };
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={
                  options.tabBarAccessibilityLabel ?? options.title ?? route.name
                }
                accessibilityState={{ selected: focused }}
                hitSlop={4}
                style={styles.item}
              >
                <TabItem focused={focused} reduced={reduced}>
                  {options.tabBarIcon?.({ focused, color, size: 24 })}
                  <Text style={[styles.label, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </TabItem>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  // El relleno, el canto y la sombra los pone GlassSurface. Aquí solo
  // queda dónde va la barra.
  bar: {
    marginHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: BAR_PAD,
  },
  pill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    borderRadius: 4, // casi a escuadra, como el resto
    backgroundColor: colors.mentaSuave,
  },
  item: {
    flex: 1,
    paddingVertical: 3,
  },
  itemInner: {
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.micro,
    letterSpacing: tracking.wide,
  },
});

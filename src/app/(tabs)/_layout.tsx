import { Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { BreadIcon, HomeIcon, PersonIcon, QrIcon } from '@/components/icons';
import { colors, motion } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.marfil },
        /*
         * Las pantallas se cruzan en vez de cortar en seco. El default es
         * 'none': cambia la escena en un solo frame, así que la pastilla
         * de la barra se anima y la página a la que apunta no — y la barra
         * termina leyéndose como adorno y no como control.
         *
         * 'shift' desliza apenas la que sale y la que entra en la
         * dirección del cambio. Sutil a propósito: esto pasa en CADA
         * toque de tab, y cualquier cosa más grande cansa al vigésimo.
         */
        animation: 'shift',
        transitionSpec: {
          animation: 'spring',
          // El mismo muelle que la pastilla, para que la barra y la
          // página asienten juntas en vez de una arrastrando a la otra.
          config: { ...motion.spring, overshootClamping: true },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarAccessibilityLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon size={24} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ordenar"
        options={{
          title: 'Ordenar',
          tabBarAccessibilityLabel: 'Ordenar',
          tabBarIcon: ({ color, focused }) => (
            <BreadIcon size={24} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'Mi QR',
          tabBarAccessibilityLabel: 'Mi QR, tarjeta Horno Rewards',
          tabBarIcon: ({ color, focused }) => (
            <QrIcon size={24} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarAccessibilityLabel: 'Cuenta',
          tabBarIcon: ({ color, focused }) => (
            <PersonIcon size={24} color={color} filled={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

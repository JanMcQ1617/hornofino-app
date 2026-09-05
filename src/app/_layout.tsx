// Importes por peso (subpath) a propósito: el índice raíz de cada paquete
// arrastraría TODOS los .ttf de la familia al bundle.
import { Petrona_500Medium } from '@expo-google-fonts/petrona/500Medium';
import { Petrona_500Medium_Italic } from '@expo-google-fonts/petrona/500Medium_Italic';
import { Petrona_600SemiBold } from '@expo-google-fonts/petrona/600SemiBold';
import { Petrona_700Bold } from '@expo-google-fonts/petrona/700Bold';
import { WorkSans_400Regular } from '@expo-google-fonts/work-sans/400Regular';
import { WorkSans_500Medium } from '@expo-google-fonts/work-sans/500Medium';
import { WorkSans_600SemiBold } from '@expo-google-fonts/work-sans/600SemiBold';
import { WorkSans_700Bold } from '@expo-google-fonts/work-sans/700Bold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { HornoIntro } from '@/components/horno-intro';
import { hydrateMenu } from '@/lib/menu-sync';
import { ensureAndroidChannel } from '@/lib/push';
import { AppProvider, useApp } from '@/lib/state';
import { colors, fonts, textSize } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Tocar el aviso "tu orden está lista" abre esa orden, no el inicio.
 * Cubre los dos casos: app en segundo plano (listener) y app cerrada del todo
 * (getLastNotificationResponseAsync), que es el que más se olvida.
 */
function useOrderNotificationTaps(enabled: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const go = (data: unknown) => {
      const id = (data as { orderId?: string } | undefined)?.orderId;
      if (typeof id === 'string' && id) {
        router.push({ pathname: '/pedido/[id]', params: { id } });
      }
    };
    let alive = true;
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        if (alive && res) go(res.notification.request.content.data);
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      go(res.notification.request.content.data);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [enabled, router]);
}

function RootNavigator() {
  const { ready } = useApp();
  const [introDone, setIntroDone] = useState(false);

  // se engancha solo cuando el navegador existe, si no el push se pierde
  useOrderNotificationTaps(ready);
  const [fontsLoaded] = useFonts({
    Petrona_500Medium,
    Petrona_500Medium_Italic,
    Petrona_600SemiBold,
    Petrona_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.marfil }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.marfil },
          /*
           * El push nativo de iOS: la pantalla que sale se desliza a un
           * tercio de la velocidad de la que entra, bajo una capa que la
           * oscurece. Rehacer eso en JS es la forma clásica de que una
           * app se sienta "casi pero no": react-native-screens nos da el
           * de verdad.
           */
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="carrito"
          options={{
            presentation: 'modal',
            // La canasta SUBE; no entra de lado como una pantalla más.
            // Es una tarea que se abre encima de lo que estabas haciendo.
            animation: 'slide_from_bottom',
            headerShown: true,
            headerTitle: 'Tu canasta',
            headerTitleStyle: { fontFamily: fonts.display, fontSize: textSize.h3, color: colors.ink },
            headerStyle: { backgroundColor: colors.marfil },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="menu-completo"
          options={{
            headerShown: true,
            headerTitle: 'El menú de siempre',
            headerBackTitle: 'Atrás',
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.display, fontSize: textSize.h3, color: colors.ink },
            headerStyle: { backgroundColor: colors.marfil },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="menu-light"
          options={{
            headerShown: true,
            headerTitle: 'HORNOFINO Light',
            headerBackTitle: 'Atrás',
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.display, fontSize: textSize.h3, color: colors.ink },
            headerStyle: { backgroundColor: colors.marfil },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="pedido/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Atrás',
            headerTintColor: colors.ink,
            headerStyle: { backgroundColor: colors.marfil },
            headerShadowVisible: false,
          }}
        />
      </Stack>

      {introDone ? null : <HornoIntro onDone={() => setIntroDone(true)} />}
    </View>
  );
}

export default function RootLayout() {
  // La carta se hidrata al arrancar: primero la caché en disco (instantánea),
  // luego el puente en segundo plano. Nunca bloquea el arranque — la semilla
  // compilada ya está puesta, así que si esto falla la app abre igual.
  useEffect(() => {
    void hydrateMenu();
    // El canal de Android también al arrancar, no solo al pedir permiso: quien
    // ya lo concedió en una instalación anterior nunca vuelve a pasar por ahí.
    void ensureAndroidChannel();
  }, []);

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProvider>
  );
}

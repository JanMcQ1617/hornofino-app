// Notificaciones push — "tu orden está lista".
//
// Diseño deliberado:
//  · El permiso se pide en el CHECKOUT, no al abrir la app. Ahí el porqué es
//    obvio ("te avisamos cuando esté lista") y la gente dice que sí. Pedirlo
//    en frío al arrancar es la forma más rápida de que te lo nieguen para
//    siempre — en iOS solo puedes preguntar UNA vez.
//  · El token viaja PEGADO A LA ORDEN, no en un registro aparte. Así funciona
//    igual para quien tiene tarjeta y para quien ordena de invitado, y no hay
//    que cruzar identidades en el servidor.
//  · Nada de esto puede tumbar una orden. Si el permiso se niega, si no hay
//    projectId, si el servicio falla — se devuelve null y la orden sigue.
//
// PENDIENTE DE CREDENCIALES: `getExpoPushTokenAsync` necesita el projectId de
// EAS y una llave APNs registrada. Mientras no existan, esto devuelve null en
// silencio y la app funciona igual, solo que sin avisos. Ver README.

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Con la app abierta igual queremos que el aviso se vea y suene. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android exige que TODA notificación pertenezca a un canal (API 26+, Android
 * 8). Sin canal el aviso NO se muestra: no falla, no avisa, simplemente no
 * aparece — el fallo más silencioso de la plataforma.
 *
 * El id es `default` a propósito: el servidor (sendOrderPush en api.mjs) manda
 * a Expo sin `channelId`, y Expo entrega al canal `default`. Crearlo con ese id
 * exacto le pone nombre en español, importancia alta y el verde de la marca,
 * sin tocar el servidor. Si algún día el servidor mandara un channelId propio,
 * hay que crear ESE canal aquí también.
 *
 * Idempotente: volver a llamarla actualiza el canal, no lo duplica. En iOS no
 * hace nada.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Tu orden',
      description: 'Avisos de cuándo tu orden se está preparando y cuándo está lista.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0E9B72',
    });
  } catch (err) {
    // Un canal que no se pudo crear no puede tumbar nada: la orden manda.
    console.warn('[push] no se pudo crear el canal de Android:', err);
  }
}

/** El projectId de EAS. Sin él Expo no puede emitir un push token. */
function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

/**
 * Pide permiso (si hace falta) y devuelve el token de Expo.
 * Devuelve null —sin lanzar— en cualquier caso en que no se pueda: simulador,
 * permiso negado, credenciales sin configurar, o fallo del servicio.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    // iOS solo deja preguntar una vez: si ya lo negaron, no insistimos.
    if (!granted && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return null;

    // El canal ANTES de pedir el token: en Android tiene que existir para que
    // el primer aviso se vea, y el primero es justo el de esta orden.
    await ensureAndroidChannel();

    const id = projectId();
    if (!id) {
      // Todavía no hay proyecto EAS — se registra en consola y se sigue.
      console.warn('[push] sin projectId de EAS: no se puede pedir token');
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data ?? null;
  } catch (err) {
    console.warn('[push] no se pudo obtener el token:', err);
    return null;
  }
}

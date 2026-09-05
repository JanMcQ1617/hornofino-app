// El badge OFICIAL "Añadir a Apple Wallet".
//
// Apple exige que se use SU artwork: el badge no se puede redibujar, ni
// recolorear, ni rehacer con texto y un icono parecido. Por eso este archivo
// existe en vez de un botón que lo imite — imitarlo es una violación de las
// guías y una de las cosas que App Review marca.
//
// CÓMO ACTIVARLO (un minuto, una sola vez):
//   1. developer.apple.com/wallet/add-to-apple-wallet-guidelines/
//      → descargar el paquete de badges (hay que aceptar los términos de
//        Apple, y eso lo tiene que hacer una persona, no un script).
//   2. Coger la versión en ESPAÑOL — "Añadir a Apple Wallet" — en @2x/@3x.
//   3. Guardarla como assets/brand/add-to-apple-wallet-es.png
//   4. Descomentar el require de abajo y borrar el `null`.
//
// Mientras tanto la pantalla enseña un botón de texto normal, que NO imita el
// badge: es preferible un botón honesto a una falsificación del de Apple.
//
// Reglas del badge, para cuando esté puesto: alto mínimo 30 pt, espacio libre
// alrededor de al menos el 10% de su alto, y no se le cambia el color.

import type { ImageSourcePropType } from 'react-native';

export const WALLET_BADGE: ImageSourcePropType | null = null;
// export const WALLET_BADGE: ImageSourcePropType | null =
//   require('../../assets/brand/add-to-apple-wallet-es.png');

/** Proporción del badge de Apple (ancho ÷ alto), para escalarlo sin deformarlo. */
export const WALLET_BADGE_RATIO = 3.3;

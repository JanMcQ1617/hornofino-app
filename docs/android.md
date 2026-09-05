# HORNOFINO en Android

La app es una sola base de código. Android no necesitó portar nada: el material
de cristal (`components/glass.tsx`) ya se bifurca por plataforma, las sombras de
`theme.ts` ya llevan `elevation`, el botón de Apple Wallet ya está detrás de
`Platform.OS === 'ios'`, y `expo-symbols` (que sería lo único de iOS puro) no se
usa en ninguna pantalla. Lo que faltaba era configuración, y está hecha.

## Lo que hace falta de fuera (y solo lo puede dar Jan)

| Qué | Dónde se consigue | Para qué |
|---|---|---|
| `google-services.json` | Firebase → proyecto → app Android `com.mcqueenygroup.hornofino` | Notificaciones push. iOS usa APNs; Android necesita FCM o el aviso de "tu orden está lista" no llega. |
| Cuenta de Expo | expo.dev, gratis | Compilar en la nube. `npx eas-cli login` desde la terminal — la contraseña nunca pasa por aquí. |
| Cuenta de Play Console | play.google.com/console, $25 una vez | Publicar. **El tipo de cuenta no se puede cambiar después** (ver abajo). |

**El archivo de Firebase va en la raíz del repo y NO se sube a git** (está en
.gitignore: identifica el proyecto de Firebase). Sin él, `eas build` falla con un
error claro que nombra el archivo — no es un fallo silencioso.

## Números de versión

`versionCode` es el número de build de Android: un entero, y Play rechaza
cualquier subida cuyo número no sea MAYOR que el anterior. Se lleva a mano, igual
que el de iOS (`appVersionSource: "local"` en eas.json), para que no cambie solo
entre compilaciones. **Es independiente del `buildNumber` de iOS**: pueden
divergir sin problema, y lo harán.

Al subir una build nueva a Play hay que subir `versionCode` en `app.json`.

## Permisos

`blockedPermissions` quita cámara, micrófono y ubicación del manifiesto. La app
no usa ninguna, pero las librerías a veces los arrastran solas, y en Play **cada
permiso del manifiesto hay que justificarlo** en el formulario de seguridad de
datos. Bloquearlos deja el formulario corto y honesto.

El icono de notificación de Android usa SOLO el canal alfa: es una silueta que el
sistema tiñe con el color que se le pase. Sin uno, Android pinta un cuadrado gris.
Se reusa el monocromo del icono adaptativo, que ya es exactamente esa silueta.

## Compilar

```
npx eas-cli login
npx eas-cli build --platform android --profile preview      # APK, para instalar a mano
npx eas-cli build --platform android --profile production   # AAB, para subir a Play
```

`preview` da un APK que se instala directo en un teléfono; `production` da el
Android App Bundle que pide Play. No hace falta el SDK de Android en el Mac: EAS
compila en la nube (el SDK son ~15 GB y aquí no sobran).

## La regla de Play que decide el calendario

Una cuenta **personal** creada después del 13 nov 2023 tiene que correr una
prueba cerrada con **12 testers, 14 días seguidos**, y solo entonces puede
SOLICITAR acceso a producción — la solicitud la revisa Google y puede
rechazarla. En total, unas tres semanas.

Una cuenta de **organización** está exenta de eso, pero pide número D‑U‑N‑S,
documentos de registro del negocio, prueba de dirección física y verificación de
identidad del representante.

**Una cuenta personal no se convierte en cuenta de organización.** Hay que crear
otra (otros $25) y transferir la app. Y una cuenta personal publica bajo el
nombre de la PERSONA, no del negocio: en la ficha diría "Jan McQueeny" donde
debería decir McQueenyGroup.

La pista **internal testing** (hasta 100 testers) no tiene ninguna de esas
esperas y sirve para que el cliente instale la app desde Google Play mientras el
resto avanza.

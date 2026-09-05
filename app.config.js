// La configuración sigue viviendo en app.json. Este archivo solo existe para
// UNA cosa: resolver dónde está google-services.json en cada sitio.
//
// EL PROBLEMA. `android.googleServicesFile` apunta a un archivo que está en
// .gitignore, porque este repo es PÚBLICO y ese archivo lleva la API key de
// Android del proyecto de Firebase. EAS compila subiendo lo que el repo tiene
// versionado, así que el archivo no llegaba al builder: la primera compilación
// de Android murió por eso, después de avisarlo en una línea fácil de pasar por
// alto ("...is not checked in to your repository and won't be uploaded").
//
// LA SOLUCIÓN. El archivo se sube a EAS como variable de entorno de tipo
// `file` con visibilidad `secret` (GOOGLE_SERVICES_JSON). Durante la
// compilación EAS lo escribe en disco y deja la RUTA en process.env; aquí se
// lee esa ruta. En local la variable no existe y se usa la copia del disco.
//
// Nunca se versiona el archivo: el repo público solo ve este código.

const appJson = require('./app.json');

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? appJson.expo.android.googleServicesFile,
  },
});

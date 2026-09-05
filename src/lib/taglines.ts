// La línea que va bajo el saludo en Inicio.
//
// HISTORIA. Antes decía siempre "Velando tu salud" — que además es el lema de
// Light, no el de la panadería. Se quitó el 5 sep 2026 al adelgazar la
// cabecera, y Jan la echó de menos ese mismo día: el hueco se veía. Vuelve,
// pero cambiando: una distinta cada vez que se abre la app.
//
// CÓMO ROTA. Se escoge UNA al cargar este módulo, o sea una por arranque del
// motor JS. Eso es exactamente "cada vez que abres la app": si el usuario
// vuelve desde el fondo, la línea se queda igual en vez de saltar mientras
// mira la pantalla. Y como se escoge una sola vez, no cambia al ir y venir
// entre pestañas — un texto que muta al volver a Inicio parece un error, no
// una gracia.
//
// Con 100 frases, la probabilidad de repetir la del arranque anterior es 1%.
// No se guarda nada en disco por eso: no vale una lectura de AsyncStorage en
// el arranque, ni el riesgo de que la línea cambie DESPUÉS de pintarse.
//
// LAS REGLAS DE LA VOZ, para quien añada más:
//   · Cortas. Caben bajo un saludo de 26px sin partirse en dos líneas.
//   · Español de Puerto Rico, como habla el mostrador. "Café colao", no
//     "café filtrado".
//   · Nada de "·" pegando dos fragmentos: eso es el tic que delata un texto
//     generado, y es justo lo que Jan marcó en la revisión anterior.
//   · Ciertas. La finca está "en la montaña" y el café se tuesta en casa:
//     ambas cosas salen del sitio. No inventar pueblo, ni hora de amasado,
//     ni premios. El quesito gratis a los seis sellos sí es real.
//   · Ninguna depende de la hora: el saludo de arriba ya dice si es mañana,
//     tarde o noche, y una frase de desayuno a las 8 PM canta.

export const TAGLINES: readonly string[] = [
  'El pan sale ahora mismo',
  'Café de nuestra propia finca',
  'Hoy también hay quesitos',
  'El horno lleva despierto desde temprano',
  'Pan de agua, todavía tibio',
  'Aquí se hornea todos los días',
  'La mallorca no se hace esperar',
  'Seis sellos y el quesito va por nosotros',
  'De la montaña a tu taza',
  'Tu pan, sin fila',
  'Masa fresca cada mañana',
  'Lo bueno huele desde la puerta',
  'Nada sale de aquí frío',
  'Pan boricua, del de verdad',
  'El café se cuela solo para ti',
  'Hoy hay repostería nueva',
  'Un quesito nunca viene mal',
  'Pídelo aquí, recógelo caliente',
  'Harina, agua, sal y tiempo',
  'La panadería de la familia',
  'Café tostado en casa',
  'El pan de la casa te espera',
  'Hay mallorcas recién salidas',
  'Nuestra finca queda en la montaña',
  'Se hornea, no se calienta',
  'Tu orden entra directo a la caja',
  'Pan caliente, café colao',
  'Aquí el café tiene apellido',
  'Buenos panes, mejores mañanas',
  'Sin fila, sin prisa',
  'El sexto quesito es gratis',
  'Todo empieza con la masa',
  'Del horno a tu mano',
  'Pan del día, siempre',
  'La bandeja para compartir ya está lista',
  'Hoy es buen día para un quesito',
  'El sandwich se arma al momento',
  'Aquí nadie apura al pan',
  'Café de cosecha propia',
  'Tu panadería del área metro',
  'El pan no espera, pero tú tampoco',
  'Recoge cuando quieras',
  'Nos levantamos temprano por ti',
  'Hay pan hasta que se acabe',
  'Lo hacemos aquí mismo',
  'Tres panaderías, un mismo horno',
  'La receta no ha cambiado',
  'Pan, café y algo dulce',
  'Tu mesa empieza aquí',
  'El olor no se puede empacar',
  'Hoy amasamos de madrugada',
  'Café que no viene de lejos',
  'Los quesitos se acaban temprano',
  'Pide ahora, come caliente',
  'Aquí el pan tiene nombre',
  'Se hace lento, sabe mejor',
  'La mañana sabe a pan',
  'Pan artesanal, sin adornos',
  'Todo el sabor de la casa',
  'El horno decide la hora',
  'Los buenos días empiezan aquí',
  'Un café, un quesito, listo',
  'La masa descansa, tú también',
  'Del campo nuestro a tu taza',
  'Hay algo dulce esperándote',
  'Pan recién hecho, siempre',
  'Tu sello suma solito',
  'Nada congelado, nada de eso',
  'La panadería de siempre',
  'Se hornea con calma',
  'El café huele desde la acera',
  'Pan de verdad, hecho a mano',
  'Hoy hay de todo un poco',
  'La fila la hacemos nosotros',
  'Café de casa, tostado aquí',
  'Sabe a Puerto Rico',
  'El pan más fresco del día',
  'Tu orden ya va para la caja',
  'Un pedazo de la finca',
  'Lo dulce también es serio aquí',
  'Hoy salió bien bueno',
  'El horno no descansa',
  'Pan tibio, café caliente',
  'Cada día se empieza de cero',
  'Aquí se cocina, no se recalienta',
  'Tres tiendas, la misma masa',
  'Tu quesito está más cerca',
  'El café de la casa nunca falla',
  'Pan que se acaba rápido',
  'Hecho hoy, para hoy',
  'La repostería sale a media mañana',
  'Café colao como debe ser',
  'Todo empieza antes que el sol',
  'Guarda tu tarjeta en Apple Wallet',
  'El pan es la excusa, el café el plan',
  'Aquí siempre hay algo saliendo',
  'La masa manda',
  'Un pan nunca viene solo',
  'Tu panadería, en tu bolsillo',
  'Nos vemos en el mostrador',
];

/**
 * La frase de ESTE arranque. Constante mientras la app viva: la escoge el
 * módulo al cargarse, no la pantalla al pintarse.
 */
const PICKED = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

export function tagline(): string {
  return PICKED;
}

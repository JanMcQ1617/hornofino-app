// HORNOFINO Light — generado del MENU_LIGHT del sitio (menu-data.js, 2026-08-11).
//
// [PENDIENTE DE APROBACIÓN DEL CLIENTE] Estos platos son PROPUESTAS de Jan
// para arrancar la conversación con HORNOFINO — NO recetas confirmadas.
// Regla que no se rompe (igual que en el sitio): mientras LIGHT_MENU_READY
// sea false, NINGÚN plato de aquí lleva precio ni se puede echar a la
// canasta. Son ideas, no una carta. El servidor tampoco tiene precios
// (menu-prices.json no los conoce), así que ordenarlos fallaría igual.
//
// Cuando los dueños aprueben: el sitio pone LIGHT_MENU_READY = true y añade
// precios/ids reales; aquí se hace lo mismo (ids del server + price) y las
// tarjetas se vuelven ordenables con el mismo flujo del menú regular.

export const LIGHT_MENU_READY = false;
export const LIGHT_MENU_DRAFT = true;

export type LightPlate = {
  /** slug local para keys de React — NO es un id del servidor (no existe) */
  id: string;
  name: string;
  desc: string;
};

export type LightSection = {
  id: string;
  title: string;
  intro: string;
  plates: LightPlate[];
};

export const LIGHT_SECTIONS: LightSection[] = [
  {
    id: 'light-bowls',
    title: 'Bowls y Ensaladas',
    intro: 'Algo que llene sin pesar, con vegetales del país y la proteína que pidan.',
    plates: [
      { id: 'bowl-de-pollo-y-aguacate', name: 'Bowl de Pollo y Aguacate', desc: 'Pollo a la plancha, aguacate, arroz integral y vegetales.' },
      { id: 'bowl-de-proteina', name: 'Bowl de Proteína', desc: 'Base de granos, huevo o pollo, y garbanzos.' },
      { id: 'ensalada-de-la-casa', name: 'Ensalada de la Casa', desc: 'Verdes frescos, tomate, queso y vinagreta de la casa.' },
    ],
  },
  {
    id: 'light-tostadas',
    title: 'Tostadas Light',
    intro: 'El mismo pan del horno de siempre — lo de encima es lo que cambia.',
    plates: [
      { id: 'tostada-de-aguacate', name: 'Tostada de Aguacate', desc: 'Sobre pan integral, con limón y sal marina.' },
      { id: 'tostada-de-pavo-y-tomate', name: 'Tostada de Pavo y Tomate', desc: 'Pavo, tomate fresco y un toque de albahaca.' },
      { id: 'tostada-de-ricotta-y-fruta', name: 'Tostada de Ricotta y Fruta', desc: 'Ricotta, fresas o guineo, y miel por encima.' },
    ],
  },
  {
    id: 'light-sin-azucar',
    title: 'Repostería Sin Azúcar Añadida',
    intro: 'La misma repostería de HORNOFINO, endulzada de otra forma.',
    plates: [
      { id: 'bizcocho-sin-azucar-anadida', name: 'Bizcocho Sin Azúcar Añadida', desc: 'La receta de siempre, endulzada con fruta.' },
      { id: 'galletas-de-avena', name: 'Galletas de Avena', desc: 'Avena, pasas y canela.' },
      { id: 'flan-sin-azucar-anadida', name: 'Flan Sin Azúcar Añadida', desc: 'Flan de la casa, versión liviana.' },
    ],
  },
  {
    id: 'light-batidas',
    title: 'Jugos y Batidas',
    intro: 'Fruta de verdad, exprimida ahí mismo.',
    plates: [
      { id: 'batida-de-parcha', name: 'Batida de Parcha', desc: 'Parcha fresca, sin azúcar añadida.' },
      { id: 'jugo-de-china-y-zanahoria', name: 'Jugo de China y Zanahoria', desc: 'Exprimido del día.' },
      { id: 'batida-de-guineo-y-avena', name: 'Batida de Guineo y Avena', desc: 'Guineo, avena y canela — llena de verdad.' },
    ],
  },
  {
    id: 'light-desayuno',
    title: 'Desayuno Liviano',
    intro: 'Para el que entra temprano y no quiere salir pesado.',
    plates: [
      { id: 'avena-con-frutas', name: 'Avena con Frutas', desc: 'Avena caliente con fruta fresca del día.' },
      { id: 'parfait-de-yogur', name: 'Parfait de Yogur', desc: 'Yogur, fruta y granola en capas.' },
      { id: 'revoltillo-de-claras', name: 'Revoltillo de Claras', desc: 'Claras con vegetales y tostada integral.' },
    ],
  },
];

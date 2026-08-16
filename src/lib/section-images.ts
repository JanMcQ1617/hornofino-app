// Fotos por sección de la carta. Las claves son el campo `photo` de menu.ts
// (que a su vez viene de los nombres de archivo del sitio web).
// Nota: requires estáticos a propósito — Metro necesita rutas literales.

import type { ImageSourcePropType } from 'react-native';

export const SECTION_IMAGES: Record<string, ImageSourcePropType> = {
  'mega-quesito': require('../../assets/menu/mega-quesito.webp'),
  panes: require('../../assets/menu/panes.webp'),
  reposteria: require('../../assets/menu/reposteria.webp'),
  pasteleria: require('../../assets/menu/pasteleria.webp'),
  sandwiches: require('../../assets/menu/sandwiches.webp'),
  tostadas: require('../../assets/menu/tostadas.webp'),
  desayuno: require('../../assets/menu/desayuno.webp'),
  brunch: require('../../assets/menu/brunch.webp'),
  sopas: require('../../assets/menu/sopas.webp'),
  'cafe-y-te': require('../../assets/menu/cafe-y-te.webp'),
  bizcochos: require('../../assets/menu/bizcochos.webp'),
  'cortes-frios': require('../../assets/menu/cortes-frios.webp'),
  bandejas: require('../../assets/menu/bandejas.webp'),
};

export const LOGO = require('../../assets/brand/logo-color.png');

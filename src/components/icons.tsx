// Iconos propios en SVG — trazo consistente, nada de librerías de iconos genéricas.

import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/lib/theme';

type IconProps = {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

/**
 * Los cuatro iconos de la barra aceptan además `filled`.
 *
 * Antes el tab activo solo cambiaba de color y engordaba el trazo de 1.8
 * a 2.2 — una diferencia que en un teléfono al sol no se ve, y que para
 * quien no distingue el verde del gris no existe. Relleno vs. contorno es
 * un cambio de FORMA: se lee sin color y se lee de reojo. Es la convención
 * de iOS por esa razón.
 */
type TabIconProps = IconProps & { filled?: boolean };

const defaults = { size: 24, color: colors.ink, strokeWidth: 1.8 };

export function HomeIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth, filled = false }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        // Sólido: la casa entera menos la puerta, recortada con evenodd —
        // así el hueco queda limpio en vez de pintado del color del fondo,
        // que se rompería encima del cristal.
        <Path
          d="M11.06 3.24a1.5 1.5 0 0 1 1.88 0l8 6.5a1.5 1.5 0 0 1 .56 1.16V19a2.5 2.5 0 0 1-2.5 2.5h-4.5V16h-5v5.5H5a2.5 2.5 0 0 1-2.5-2.5v-8.1a1.5 1.5 0 0 1 .56-1.16Z"
          fill={color}
          fillRule="evenodd"
        />
      ) : (
        <Path
          d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4V15h-5v5.5h-4A1.5 1.5 0 0 1 4 19v-8.5Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/** Pan sobao — el icono de Ordenar. */
export function BreadIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth, filled = false }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 13.5c0-4 3.6-7 8.5-7s8.5 3 8.5 7c0 2.5-1.8 4-4.4 4H7.9c-2.6 0-4.4-1.5-4.4-4Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/*
       * Los dos cortes del sobao. Sobre el pan relleno se dibujan en
       * marfil (el fondo de la app) porque un hueco transparente dejaría
       * ver el cristal de la barra a través del pan.
       */}
      <Path
        d="M9 9.75c-.8.9-1 1.9-.9 2.75M13.4 9.4c-.8.9-1 1.9-.9 2.75"
        stroke={filled ? colors.marfil : color}
        strokeWidth={filled ? strokeWidth + 0.2 : strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function QrIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth, filled = false }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/*
       * Un QR sólido sería una mancha, así que "activo" aquí es rellenar
       * los tres ojos de registro y dejar el resto igual. Sigue siendo un
       * cambio de forma, no solo de color.
       */}
      <Rect x="4" y="4" width="6.5" height="6.5" rx="1.2" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M13.5 13.5h2.8v2.8h-2.8zM17.2 17.2H20V20h-2.8z" fill={color} />
      <Path d="M20 13.5h-1.5M13.5 20v-1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth, filled = false }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <>
          <Circle cx="12" cy="8" r="4.2" fill={color} />
          {/*
           * Hombros como forma cerrada, no como trazo engordado: un trazo
           * grueso con cap redondo termina en dos bolitas en las puntas.
           */}
          <Path d="M12 13.9c-4.1 0-7.2 2.6-7.2 6.2a.9.9 0 0 0 .9.9h12.6a.9.9 0 0 0 .9-.9c0-3.6-3.1-6.2-7.2-6.2Z" fill={color} />
        </>
      ) : (
        <>
          <Circle cx="12" cy="8.2" r="3.7" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M4.8 20c1-3.4 3.9-5.2 7.2-5.2s6.2 1.8 7.2 5.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, color = defaults.color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m6 9.5 6 6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color = defaults.color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9.5 6 6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = defaults.color, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color = defaults.color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function MinusIcon({ size = 18, color = defaults.color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = defaults.color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PinIcon({ size = 16, color = defaults.color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-6.5-5.3-6.5-10.2A6.4 6.4 0 0 1 12 4.5a6.4 6.4 0 0 1 6.5 6.3C18.5 15.7 12 21 12 21Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10.7" r="2.2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ClockIcon({ size = 16, color = defaults.color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Ticket de premio (quesito gratis). */
export function TicketIcon({ size = 18, color = defaults.color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v1.7a2 2 0 0 0 0 3.6v1.7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5v-1.7a2 2 0 0 0 0-3.6V8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path d="M14.5 7v10" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2.4 2.6" />
    </Svg>
  );
}

/** Sello lleno de la tarjeta: círculo verde con quesito (triangulito) dentro. */
export function StampFullIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Circle cx="15" cy="15" r="13.5" fill={colors.verde} />
      <Path d="m10 19.5 5.4-9.6a.6.6 0 0 1 1 0l4 9.2a.6.6 0 0 1-.6.9H10.5a.6.6 0 0 1-.4-.5Z" fill={colors.marfil} />
    </Svg>
  );
}

export function StampEmptyIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Circle cx="15" cy="15" r="13" stroke={colors.line} strokeWidth={2} strokeDasharray="3.4 3.4" fill={colors.paper} />
    </Svg>
  );
}

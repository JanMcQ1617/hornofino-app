/**
 * Auditoría WCAG de la paleta HORNOFINO (menta/naranja sobre blanco).
 *
 * Correr: node scripts/check-contrast.mjs
 * Sale con código ≠0 si algún par declarado no llega a su mínimo.
 *
 * Los mínimos: 4.5 para texto normal, 3.0 para texto grande y para
 * componentes de interfaz (puntos, trazos, placas) — WCAG 1.4.3 y 1.4.11.
 */

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lum = (h) =>
  hex(h)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    })
    .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0);

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Espejo de src/lib/theme.ts — si cambias allá, cambia acá.
const C = {
  verde: '#0E9B72',
  verdeInk: '#0B6B4F',
  menta: '#4ECFA6',
  naranja: '#EF5324',
  naranjaInk: '#B23A12',
  ink: '#1A130A',
  marfil: '#FFFFFF',
  paper: '#F5F7F5',
  paper2: '#EAF0EC',
  danger: '#B3261E',
};

// [frente, fondo, mínimo, etiqueta]
const PARES = [
  [C.ink, C.marfil, 4.5, 'ink sobre blanco'],
  [C.ink, C.paper, 4.5, 'ink sobre paper'],
  [C.ink, C.paper2, 4.5, 'ink sobre paper2'],

  // Regla 2: todo texto sobre `menta` es ink.
  [C.ink, C.menta, 4.5, 'ink sobre menta (héroe / banner)'],
  [C.naranjaInk, C.marfil, 4.5, 'naranjaInk sobre blanco (pastilla en menta)'],

  // Regla 4: verde que es texto usa verdeInk.
  [C.verdeInk, C.marfil, 4.5, 'verdeInk texto sobre blanco'],
  [C.verdeInk, C.paper, 4.5, 'verdeInk texto sobre paper'],
  [C.verdeInk, C.paper2, 4.5, 'verdeInk texto sobre paper2'],

  // Regla 3: verde que debe verse cumple 3:1 en las tres superficies.
  [C.verde, C.marfil, 3.0, 'verde control/punto sobre blanco'],
  [C.verde, C.paper, 3.0, 'verde control/punto sobre paper'],
  [C.verde, C.paper2, 3.0, 'verde control/punto sobre paper2'],

  // Regla 1: botones naranja llevan ink.
  [C.ink, C.naranja, 4.5, 'ink sobre naranja (regla de botón)'],
  [C.naranjaInk, C.paper, 4.5, 'naranjaInk texto sobre paper'],
  [C.danger, C.marfil, 4.5, 'danger sobre blanco'],
];

let fallos = 0;
for (const [f, b, min, etiqueta] of PARES) {
  const r = ratio(f, b);
  const ok = r >= min;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${r.toFixed(2).padStart(6)} / ${min.toFixed(1)}  ${etiqueta}`);
}

// `menta` es superficie, nunca control suelto: se documenta, no se exige.
console.log(
  `\nnota: menta vs blanco = ${ratio(C.menta, C.marfil).toFixed(2)}:1 — por eso ` +
    'menta solo va como SUPERFICIE, nunca como botón suelto ni como único\n' +
    'portador de significado (regla 2 de src/lib/theme.ts).',
);

if (fallos) {
  console.error(`\n${fallos} par(es) por debajo del mínimo.`);
  process.exit(1);
}
console.log('\nTodos los pares cumplen.');

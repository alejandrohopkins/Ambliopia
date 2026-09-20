/**
 * Genera los iconos PNG de la PWA a partir de public/icono.svg.
 *
 * Tamaños: 192 y 512 para Android y escritorio, y 180 para iOS.
 * Se ejecuta a mano con `npm run iconos`; los PNG quedan versionados, así que
 * compilar y desplegar no necesita sharp.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'public', 'icono.svg');
const destino = join(raiz, 'public', 'iconos');

const TAMANOS = [
  { nombre: 'icono-192.png', lado: 192 },
  { nombre: 'icono-512.png', lado: 512 },
  { nombre: 'icono-ios-180.png', lado: 180 },
  // Icono enmascarable: el mismo dibujo con margen para que Android lo recorte.
  { nombre: 'icono-maskable-512.png', lado: 512, margen: 0.1 },
];

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('Falta sharp. Instálalo con: npm install -D sharp');
  process.exit(1);
}

await mkdir(destino, { recursive: true });
const svg = readFileSync(origen);

for (const { nombre, lado, margen = 0 } of TAMANOS) {
  const interior = Math.round(lado * (1 - margen * 2));
  const relleno = Math.round((lado - interior) / 2);

  let imagen = sharp(svg, { density: 512 }).resize(interior, interior, { kernel: 'nearest' });
  if (relleno > 0) {
    imagen = imagen.extend({
      top: relleno,
      bottom: lado - interior - relleno,
      left: relleno,
      right: lado - interior - relleno,
      background: '#1B1446',
    });
  }

  await writeFile(join(destino, nombre), await imagen.png().toBuffer());
  console.log(`${nombre} (${lado}×${lado})`);
}

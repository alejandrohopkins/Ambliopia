# Misión Pixel

Juego web (PWA) para tablet y computadora, pensado como **complemento** del
tratamiento de ambliopía indicado por el oftalmólogo.

> Misión Pixel no es un dispositivo médico, no diagnostica y no reemplaza el
> parche, los lentes ni las consultas. Las métricas que muestra son estimaciones
> del propio juego. Si aparece dolor de cabeza, visión doble, dolor o cansancio
> en los ojos, suspender y consultar. Antes de usar el modo lentes, consultar
> con el oftalmólogo, en especial si hay estrabismo.

## Qué hace

Desde la base se elige entre dos modos de entrenamiento:

- **Parche** — con el parche sobre el ojo dominante. Todo se ve con colores
  normales; la dificultad está en objetivos pequeños, tenues o amontonados.
- **Lentes rojo/cian** — con los dos ojos abiertos. Cada ojo ve elementos
  distintos, así que el cerebro tiene que usar los dos juntos.

Catorce minijuegos. Los cuatro primeros se juegan en los dos modos; los otros
diez forman dos módulos, uno para cada modo, y la base solo muestra los del
modo elegido.

| Juego | Modo | Habilidad |
|---|---|---|
| Minero de cristales | Los dos | Agudeza (tamaño mínimo) y sensibilidad al contraste |
| ¿Quién es el saboteador? | Los dos | Agudeza con amontonamiento y discriminación de detalle |
| Torre de bloques | Los dos | Visión binocular, planificación y coordinación |
| Lluvia de meteoritos | Los dos | Seguimiento visual y coordinación ojo-mano |
| Cazador de objetivos | Parche | Reacción y búsqueda con la mirada |
| Rebote ágil | Parche | Anticipar trayectorias |
| Detector de patrones | Parche | Sensibilidad al contraste (parches de Gabor) |
| Corte de precisión | Parche | Seguir objetos en movimiento |
| Laberinto de trazado | Parche | Control fino con la mirada fija |
| Pozo de bloques | Lentes | Juntar lo que ve cada ojo |
| La serpiente | Lentes | Buscar con el ojo ambliope |
| El ave voladora | Lentes | Guiar con los dos ojos |
| El sapo cruzador | Lentes | Seguir al personaje con el ojo ambliope |
| Mosaicos y secuencias | Lentes | Detalle fino y lógica |

En **Lluvia de meteoritos** caen oleadas de varios objetos a la vez: se atrapan
las estrellas y las rocas se esquivan o se destruyen con disparos (barra
espaciadora o botón en pantalla); **Z** y **X** dan un salto grande a la
izquierda y a la derecha. En **Rebote ágil**, cada tres devoluciones seguidas
una bola se parte en dos, hasta cuatro a la vez; cada bola nueva sale con un
ángulo que la paleta puede alcanzar, así que siempre se puede ganar.

La dificultad visual la lleva una **escalera adaptativa** invisible, que busca
el punto donde acierta alrededor del 79 % de las veces. Los mundos y niveles
cambian temática, velocidad y variedad: un nivel se **supera con 85 % de
aciertos** (tres estrellas) y entonces el juego guarda ese nivel y la próxima
partida empieza en el siguiente; si no, se repite el mismo. Nunca se baja, y
fallar nunca quita monedas ni progreso.

Cada día y cada semana:

- Antes de cada juego se muestran sus teclas y gestos. **Z** hace lo mismo que
  Enter y **X** lo mismo que la barra espaciadora (salvo en Meteoritos, donde
  son el salto grande).
- Un **reloj del día** siempre visible cuenta el tiempo de juego activo contra
  la meta (20 minutos por defecto). Al cumplirla con 85 % de aciertos en el
  día sale una felicitación con nombre, fecha, minutos y precisión, para hacer
  una captura y reclamar 15 minutos extra de pantalla.
- **Rotación semanal**: cada juego del modo pide 2 intentos (niveles
  terminados) de lunes a domingo. Los que ya los tienen descansan mientras
  falten más de dos juegos; esos dos puede dejarlos para otro día, salvo el
  domingo, que toca completarlos. El juego de la misión del día nunca descansa.
- **Premio de la semana**: si termina un nivel sin ningún fallo (100 %) en la
  mitad de los juegos de la semana, gana una bolsa de platanitos. Sale una
  felicitación para hacer una captura y reclamarla, y en la base se ve cuántos
  juegos con 100 % lleva.
- El botón atrás del navegador (y el gesto atrás de la tablet) cierra la
  pantalla de encima en vez de salir de la app.

El avatar es **pixel art**: cara, casco, traje, visor, accesorios, mascota y
paisaje, con tono de piel y color de pelo a elegir. Se dibuja con vectores y se
pixela en el momento (con los colores exactos del dibujo y contorno nítido), de
modo que cada combinación sale bien sin dibujar a mano cada una. En la tienda
cada artículo se ve y se puede probar antes de comprarlo. Dentro de los juegos
el avatar es el sprite de bloques, que es lo que permite los cuatro colores del
modo lentes.

Un panel de adultos, con PIN, muestra minutos por modo, umbrales a lo largo del
tiempo y permite exportar los datos para llevarlos a consulta.

## Privacidad

Todo vive en el dispositivo, en `localStorage`. Sin cuentas, sin analítica, sin
backend y sin ninguna petición a servidores externos: las fuentes van
empaquetadas y el arte y los sonidos se generan por código.

## Poner en marcha

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm test          # toda la lógica bajo prueba
npm run build     # comprobación de tipos + build de producción en dist/
npm run preview   # servir dist/ para probar la PWA y el modo sin conexión
```

`npm run dev` no registra el service worker a propósito; para probar el modo
sin conexión hay que usar `npm run build && npm run preview`.

### Modo desarrollo

Abriendo la app con `?debug=1` aparece un panel con el valor y el umbral de cada
escalera, los fps, los colores de cada capa y un botón para **simular el día
siguiente**, útil para probar racha, cofre semanal y regla de balance sin
esperar a mañana.

### Iconos

Los PNG de la PWA están versionados en `public/iconos/`. Si se cambia
`public/icono.svg`, se regeneran con:

```bash
npm install -D sharp
npm run iconos
```

## Desplegar

El build es un sitio estático en `dist/`, con rutas relativas, así que funciona
igual en la raíz de un dominio o en un subdirectorio.

### Vercel

1. Importar el repositorio en Vercel.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Desplegar. No hacen falta variables de entorno: no hay backend.

O desde la terminal:

```bash
npx vercel --prod
```

### GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

Y en el repositorio, *Settings → Pages → Branch: `gh-pages`*.

Como `vite.config.ts` usa `base: './'`, el sitio funciona igual servido desde
`https://usuario.github.io/Ambliopia/` que desde un dominio propio.

### Instalarlo en la tablet

Abrir el sitio una vez con conexión y usar *Añadir a la pantalla de inicio*.
Desde la segunda visita funciona sin conexión.

## Primer uso

El asistente inicial pide, en este orden: aviso, PIN de adultos, nombre y ojo
ambliope, calibración de pantalla, si hay lentes rojo/cian, tiempos de juego y
el avatar de arranque.

Merece la pena hacer las dos calibraciones:

- **Pantalla** — con una tarjeta bancaria sobre la pantalla. Convierte píxeles a
  milímetros, y sin ella las métricas salen marcadas como estimadas.
- **Lentes** — identifica qué lente cubre cada ojo y baja la intensidad de cada
  color hasta que el ojo contrario deja de verlo. Sin este paso aparece un
  fantasma que arruina la separación entre ojos.

`docs/checklist-lentes.md` recoge lo que solo se puede comprobar a mano con los
lentes puestos.

## Estructura

```
src/
  config.ts          todos los parámetros ajustables del juego
  i18n/es.ts         todos los textos visibles
  engine/            color, renderer dicóptico, escalera, sesión, audio, bucle
  calibration/       pantalla, lentes, escáner previo, patrón de verificación
  games/             un minijuego por carpeta, con el contrato común
  rewards/           economía, tienda, insignias, misión del día, cofre
  avatar/            sprites de los juegos, dibujos vectoriales y pixelado
  storage/           esquema versionado, migraciones, selectores, CSV
  ui/                base, pantalla de juego y panel de adultos
tests/               pruebas de toda la lógica
docs/                checklist manual con lentes
```

Las reglas críticas del proyecto y el orden de construcción están en
[`CLAUDE.md`](CLAUDE.md).

## Sobre el CSV

Pensado para abrir directo en Excel en español: separador `;`, decimales con
coma, UTF-8 con BOM y fechas `AAAA-MM-DD`. Una fila por sesión, juego y
parámetro medido; filtrando por `parametro_umbral` queda una fila por sesión y
juego. Los minutos de cada sesión se reparten entre sus juegos en proporción a
los ensayos, de modo que la columna suma los minutos reales del día.

## Licencias

Código y arte, originales. Las fuentes **Pixelify Sans** y **Fredoka** se
incluyen bajo SIL Open Font License 1.1 (ver `public/fuentes/LICENCIA.md`).

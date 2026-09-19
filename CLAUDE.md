# Misión Pixel — reglas del proyecto

Juego web (PWA) para tablet y computadora, complemento del tratamiento de ambliopía.
Usuaria: Alana, 12 años, ojo ambliope derecho. Interfaz en español neutro, textos para la
jugadora en femenino.

## Reglas críticas (no negociables)

1. **Modo lentes: solo 4 colores.** Durante el juego en modo lentes existen únicamente:
   fondo negro puro (`#000000`), el color del lente del ojo ambliope, el color del lente del
   ojo dominante y gris neutro para lo que ven ambos ojos. Ningún otro color, degradado,
   sombra de color, partícula de otro tono ni imagen a color.
2. **Todo se deriva de `config.ojoAmbliope`** (por defecto `'derecho'`). Nunca codificar
   `'derecho'` o `'izquierdo'` en duro en la lógica ni en los textos.
3. **Arte y sonidos 100 % originales y generados por código.** Prohibido usar personajes,
   nombres, logos, texturas, fuentes, sonidos o diseños de Minecraft, Roblox, Among Us u
   otras marcas. Solo el estilo genérico: bloques, pixel art y tripulación espacial.
4. **No es un dispositivo médico:** no mostrar diagnósticos ni prometer resultados. Las
   métricas se presentan como estimaciones del juego.
5. **Sin destellos:** ningún parpadeo ni cambio brusco de luminancia más de 3 veces por segundo.
6. **Los minutos solo cuentan con juego activo:** minijuego en curso, pestaña visible e
   interacción en los últimos 30 s.
7. **Nunca se pierden monedas ni progreso por fallar.** El tono con la jugadora siempre es positivo.
8. **Funciona offline y guarda los datos solo en el dispositivo.** Sin backend, sin analítica,
   sin peticiones externas.
9. **La jugadora usa siempre sus lentes de graduación** (debajo del parche o de los lentes
   rojo/cian). Recordarlo en cada chequeo previo.

## Reglas de código

- Todos los parámetros numéricos (tiempos, factores, umbrales, premios, precios) van en
  `src/config.ts`.
- Todos los textos visibles van en `src/i18n/es.ts`. Ningún texto codificado dentro de los
  componentes.
- Código mínimo y legible. Nada fuera de la especificación. Sin dependencias innecesarias.
- Canvas 2D: escalar por `devicePixelRatio`, `imageSmoothingEnabled = false`, coordenadas enteras.
- Estado con React Context + `useReducer`. Navegación por estado de pantalla (sin router).
- Gráficas: componentes SVG propios. Audio: Web Audio API sintetizada. Sin librerías externas.

## Orden de construcción

| Fase | Nombre | Criterio para cerrarla |
|---|---|---|
| 0 | Preparación | `npm run dev` muestra paleta y fuentes; `npm test` pasa |
| 1 | Datos, configuración y asistente | Tests de guardado ida y vuelta, migración y racha; recargar conserva datos |
| 2 | Motor visual y calibraciones | Test: el renderer en lentes solo produce colores permitidos; contraste ida y vuelta; límite de 8 bits |
| 3 | Escalera, sesión y cierre del día | Observador simulado ±15 % sobre 200 simulaciones; reglas de balance; minutos no avanzan en pausa/segundo plano/sin interacción |
| 4 | Minero de cristales | Jugable con toque y teclado; `?debug=1` muestra la escalera moverse |
| 5 | Saboteador y Meteoritos | Ambos jugables en los dos modos |
| 6 | Torre de bloques | Test: todas las figuras construibles por gravedad y caben (altura ≤ filas − 2) |
| 7 | Recompensas y avatar | Tests de economía, misión con semilla y cofre |
| 8 | Panel de adultos | CSV abre en Excel en español; importar restaura todo; cambiar ojoAmbliope invierte capas y textos |
| 9 | Pulido, PWA y despliegue | Funciona sin conexión; se instala en tablet; 60 fps |

No empezar una fase sin cumplir los criterios de la anterior. Al cerrar cada fase: ejecutar
las pruebas, verificar sus criterios y hacer commit con un mensaje descriptivo.

## Fuera de alcance v1

Cuentas, sincronización o backend; medición de distancia con cámara; multijugador; compras
reales o anuncios.

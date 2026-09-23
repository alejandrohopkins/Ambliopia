/**
 * Todos los textos visibles de Misión Pixel.
 * Regla crítica: ningún componente escribe texto en duro.
 * Los textos para la jugadora van en femenino.
 * Nada de "derecho"/"izquierdo" en duro: se derivan del ojo ambliope.
 */
import type { Ojo, Modo, IdJuego } from '../config';

/** El ojo que se tapa en modo parche es siempre el contrario al ambliope. */
export function ojoContrario(ojo: Ojo): Ojo {
  return ojo === 'derecho' ? 'izquierdo' : 'derecho';
}

const NOMBRE_DE_OJO: Record<Ojo, string> = {
  derecho: 'derecho',
  izquierdo: 'izquierdo',
};

export function nombreDeOjo(ojo: Ojo): string {
  return NOMBRE_DE_OJO[ojo];
}

export const es = {
  app: {
    nombre: 'Misión Pixel',
    cargando: 'Cargando…',
  },

  comun: {
    si: 'Sí',
    no: 'No',
    continuar: 'Continuar',
    volver: 'Volver',
    cancelar: 'Cancelar',
    guardar: 'Guardar',
    listo: 'Listo',
    entendido: 'Entendido',
    omitir: 'Omitir',
    ahora: 'Hacerlo ahora',
    despues: 'Hacerlo después',
    cerrar: 'Cerrar',
    minutos: 'min',
    monedas: 'monedas',
    cristales: 'cristales',
    racha: 'racha',
    dias: 'días',
    volverALaBase: 'Volver a la base',
  },

  aviso: {
    titulo: 'Antes de empezar',
    texto:
      'Misión Pixel es un complemento del tratamiento indicado por el oftalmólogo. ' +
      'No es un dispositivo médico, no diagnostica y no reemplaza el parche, los lentes ni las consultas. ' +
      'Las métricas son estimaciones del juego. ' +
      'Si aparece dolor de cabeza, visión doble, dolor o cansancio en los ojos, suspender y consultar. ' +
      'Antes de usar el modo lentes, consultar con el oftalmólogo, en especial si hay estrabismo.',
  },

  pantallaPequena: 'En pantallas pequeñas el entrenamiento es más limitado.',

  modos: {
    parche: 'Parche',
    lentes: 'Lentes',
    lentesLargo: 'Lentes rojo/cian',
    bloqueado: 'Necesitas lentes rojo/cian para este modo.',
    fijo: 'El modo de hoy ya está elegido.',
  },

  juegos: {
    minero: 'Minero de cristales',
    saboteador: '¿Quién es el saboteador?',
    torre: 'Torre de bloques',
    meteoritos: 'Lluvia de meteoritos',
    tunel: 'Túnel de escape',
  } as Record<IdJuego, string>,

  mundos: {
    minero: ['Cueva de piedra', 'Mina de ámbar', 'Caverna de hielo', 'Núcleo de lava', 'Geoda gigante'],
    saboteador: ['Nave Alfa', 'Estación lunar', 'Base en Marte', 'Anillos de Saturno', 'Nebulosa misteriosa'],
    torre: ['Pradera de bloques', 'Ciudad flotante', 'Luna', 'Planeta rojo', 'Estación orbital'],
    meteoritos: ['Órbita baja', 'Cinturón de asteroides', 'Lluvia de cometas', 'Viento solar', 'Galaxia lejana'],
    tunel: ['Corredor de carga', 'Ducto de ventilación', 'Anillo exterior', 'Túnel de hielo', 'Núcleo de la estación'],
  } as Record<IdJuego, string[]>,

  habilidades: {
    minero: 'Agudeza y contraste',
    saboteador: 'Agudeza con amontonamiento',
    torre: 'Visión binocular y planificación',
    meteoritos: 'Seguimiento y coordinación',
    tunel: 'Agudeza en movimiento y reflejos',
  } as Record<IdJuego, string>,

  base: {
    saludo: (nombre: string) => `¡Hola, ${nombre}! ¿Lista para la misión de hoy?`,
    saludoCorto: (nombre: string) => `Hola, ${nombre}`,
    empezarMision: 'Empezar misión',
    metaDeHoy: (hechos: number, meta: number) => `${hechos} de ${meta} min`,
    etiquetaMetaDeHoy: 'Meta de hoy',
    misionDelDia: 'Misión del día',
    tienda: 'Tienda',
    miAvatar: 'Mi avatar',
    insignias: 'Insignias',
    galeria: 'Galería',
    misRecords: 'Mis récords',
    panelDeAdultos: 'Panel de adultos',
    mundo: (n: number) => `Mundo ${n}`,
  },

  chequeo: {
    parche: (ojoTapado: Ojo) =>
      `¿Tienes el parche en el ojo ${nombreDeOjo(ojoTapado)} y tus lentes puestos?`,
    parcheListo: 'Sí, estoy lista',
    lentesOk: '¡Lentes listos! Tus dos ojos están en la misión.',
    distancia: 'Siéntate a un antebrazo de la pantalla.',
    recomendaciones: [
      'Brillo de la pantalla al máximo.',
      'Desactiva Night Shift, True Tone, filtro de luz azul o modo lectura: cambian los colores y rompen la separación entre ojos.',
      'Luz ambiente tenue y sin reflejos sobre la pantalla.',
    ],
  },

  figuras: {
    circulo: 'Círculo',
    triangulo: 'Triángulo',
    cuadrado: 'Cuadrado',
    rombo: 'Rombo',
    cruz: 'Cruz',
  } as Record<string, string>,

  calibracion: {
    pantalla: {
      titulo: 'Calibrar la pantalla',
      instruccion:
        'Pon una tarjeta bancaria o una credencial sobre la pantalla y ajusta el control hasta que el rectángulo mida exactamente lo mismo que la tarjeta.',
      control: 'Ajustar el tamaño',
      medida: (pxPorMm: number) => `${pxPorMm.toFixed(2)} píxeles por milímetro`,
      guardar: 'Coincide, guardar',
      sinCalibrar: 'Sin calibrar: las métricas son estimadas.',
      distancia: 'Distancia de juego (cm)',
      distanciaNota: 'Un antebrazo de la pantalla suele ser la distancia correcta.',
    },
    lentes: {
      titulo: 'Calibrar los lentes rojo/cian',
      ponerse: 'Ponte los lentes rojo/cian encima de tus lentes de graduación.',
      identificar: {
        titulo: 'Paso 1: identificar los lentes',
        instruccion: (ojoQueSeCierra: string) =>
          `Cierra el ojo ${ojoQueSeCierra}. ¿Qué cuadrado ves?`,
        rojo: 'El rojo',
        cian: 'El cian',
        ambos: 'Los dos igual de brillantes',
        revisar:
          'Revisa que tengas los lentes puestos y bien orientados, y vuelve a intentarlo.',
      },
      fugas: {
        titulo: 'Paso 2: quitar el efecto fantasma',
        instruccion: (ojoAbierto: string, ojoCerrado: string) =>
          `Deja abierto el ojo ${ojoAbierto} y cierra el ${ojoCerrado}. Baja el control hasta que el cuadrado desaparezca por completo.`,
        control: 'Intensidad',
        desaparecio: 'Ya no lo veo',
      },
      verificar: {
        titulo: 'Paso 3: comprobar',
        instruccion: 'Abre los dos ojos. ¿Ves las dos figuras?',
        siVeoLasDos: 'Sí, veo las dos',
        noVeoUna: 'No, falta una',
        listo: '¡Lentes listos!',
      },
      calidad:
        'La separación entre ojos quedó justa. Unos lentes rojo/cian de mejor calidad ayudarían bastante.',
      ultimaCalibracion: (fecha: string) => `Última calibración: ${fecha}`,
      recalibrar: 'Recalibrar lentes',
      cambioDeDispositivo:
        'La pantalla cambió desde la última calibración. Conviene recalibrar los lentes.',
    },
    escaner: {
      titulo: 'Escáner de lentes',
      instruccion: (ojoQueSeCierra: string) => `Cierra el ojo ${ojoQueSeCierra}. ¿Qué ves?`,
      lasDos: 'Las dos',
      correcto: '¡Listo! Empezamos.',
      alReves: '¿Tienes los lentes al revés?',
      revisar: 'Revisa que tengas los lentes rojo/cian puestos.',
      reintentar: 'Intentar otra vez',
    },
    patron: {
      titulo: 'Patrón de verificación',
      explicacion:
        'Cierra un ojo y luego el otro: cada figura debe verse solo con el ojo que le toca, y la gris con los dos.',
      ojoAmbliope: (ojo: string) => `Ojo ${ojo} (ambliope)`,
      ojoDominante: (ojo: string) => `Ojo ${ojo} (dominante)`,
      ambos: 'Ambos ojos',
    },
  },

  juego: {
    aciertos: ['¡Bien visto!', '¡Cristal encontrado!', '¡Saboteador atrapado!', '¡Pieza perfecta!'],
    fallos: ['¡Casi! Estaba aquí.', 'Buen intento. ¡La próxima es tuya!'],
    record: '¡Nuevo récord! Encontraste el cristal más pequeño hasta ahora.',
    pausa: 'Pausa',
    seguirJugando: 'Seguir jugando',
    molestiaVista: 'Me molesta la vista',
    siguienteNivel: 'Siguiente nivel',
    repetir: 'Repetir',
  },

  sesion: {
    limiteAlcanzado: '¡Misión cumplida por hoy! Vuelve mañana por más cristales.',
    extenderTitulo: 'Minutos extra',
    extender: (min: number) => `Añadir ${min} min`,
    resumen: {
      titulo: 'Resumen de la misión',
      minutos: 'Minutos',
      monedas: 'Monedas',
      estrellas: 'Estrellas',
      records: 'Récords',
      mision: 'Misión del día',
    },
  },

  depuracion: {
    titulo: 'Modo desarrollo',
    fps: 'fps',
    escaleras: 'Escaleras',
    valor: 'valor',
    umbral: 'umbral',
    inversiones: 'inversiones',
    ensayos: 'ensayos',
    capas: 'Colores de capa',
    ojoAmbliope: 'Ojo ambliope',
    ojoDominante: 'Ojo dominante',
    ambos: 'Ambos ojos',
    fondo: 'Fondo',
    tiempo: 'Tiempo',
    contando: 'contando',
    detenido: 'detenido',
    minutosActivos: 'min activos',
    diaSiguiente: 'Simular día siguiente',
    motivos: {
      enPausa: 'en pausa',
      pestanaOculta: 'pestaña oculta',
      sinInteraccion: 'sin interacción',
      sinJuego: 'sin juego en curso',
    } as Record<string, string>,
    balance: 'Contraste del ojo dominante',
  },

  nombresDeFigura: {
    escalera: 'Escalera',
    piramide: 'Pirámide',
    torre: 'Torre',
    copa: 'Copa',
    muralla: 'Muralla',
    castillo: 'Castillo',
    cohete: 'Cohete',
    pino: 'Pino',
    puente: 'Puente',
    antena: 'Antena',
    ciudad: 'Ciudad',
    montana: 'Montaña',
    faro: 'Faro',
    corona: 'Corona',
    cascada: 'Cascada',
    robot: 'Robot gigante',
    castillo_grande: 'Castillo grande',
    puerto_espacial: 'Puerto espacial',
    dragon: 'Dragón de bloques',
    doble_torre: 'Doble torre',
    cohete_lunar: 'Cohete lunar',
    estacion_orbital: 'Estación orbital',
    antena_larga: 'Antena larga',
    cometa: 'Cometa',
    cristal_gigante: 'Cristal gigante',
  } as Record<string, string>,

  galeria: {
    titulo: 'Galería de figuras',
    vacia: 'Todavía no has construido ninguna figura. ¡La Torre de bloques te espera!',
    construidas: (hechas: number, total: number) => `${hechas} de ${total} construidas`,
    porConstruir: 'Por construir',
  },

  torre: {
    figuraCompleta: (nombre: string) => `¡${nombre} terminada!`,
    izquierda: 'Mover a la izquierda',
    girar: 'Girar la pieza',
    derecha: 'Mover a la derecha',
    bajar: 'Bajar rápido',
  },

  tunel: {
    izquierda: 'Carril de la izquierda',
    saltar: 'Saltar',
    rodar: 'Rodar por el suelo',
    derecha: 'Carril de la derecha',
  },

  finDeNivel: {
    titulo: '¡Nivel completado!',
    tituloAMedias: '¡Hasta aquí llegó la torre!',
    objetivo: (hecho: number, total: number) => `Colocaste ${hecho} de ${total} bloques`,
    figuraAMedias:
      'Un hueco quedó tapado y ya no se podía rellenar. Todo lo que ganaste se queda contigo, y esta figura te espera para otro intento.',
    intentarla: 'Intentarla otra vez',
    estrellas: (n: number) => `${n} de 3 estrellas`,
    precision: (pct: number) => `${Math.round(pct)} % de aciertos`,
    monedasGanadas: (n: number) => `+${n} monedas`,
    nuevoRecord: '¡Nuevo récord!',
    siguienteNivel: 'Siguiente nivel',
    repetir: 'Repetir',
    mundoDesbloqueado: (nombre: string) => `¡Se abrió ${nombre}!`,
    modoInfinito: '¡Terminaste los cinco mundos! Ahora puedes seguir en modo infinito.',
  },

  elegirJuego: {
    titulo: '¿Con qué empezamos?',
  },

  pausa: {
    titulo: 'Pausa',
    seguir: 'Seguir jugando',
    molestia: 'Me molesta la vista',
    salir: 'Volver a la base',
    molestiaRegistrada: 'Listo, lo anotamos. Descansa la vista.',
  },

  descanso: {
    titulo: 'Hora de descansar la vista',
    texto: 'Hora de descansar la vista: mira algo lejano por la ventana.',
    saltar: 'Seguir jugando',
    segundos: (s: number) => `${s} s`,
  },

  limiteDiario: '¡Misión cumplida por hoy! Vuelve mañana por más cristales.',

  paleta: {
    cieloProfundo: 'Cielo profundo',
    nebulosa: 'Nebulosa',
    cristal: 'Cristal',
    ambarEstelar: 'Ámbar estelar',
    musgoPixel: 'Musgo pixel',
    polvoLunar: 'Polvo lunar',
  },

  comparacionesDeRecord: {
    granoDeArena: '¡Del tamaño de un grano de arena!',
    semillaDeChia: '¡Como una semilla de chía!',
    hormiga: '¡Como una hormiga!',
    lenteja: '¡Como una lenteja!',
    botonDeCamisa: '¡Como un botón de camisa!',
    moneda: '¡Como una moneda!',
  } as Record<string, string>,

  asistente: {
    titulo: 'Preparar Misión Pixel',
    paso: (n: number, total: number) => `Paso ${n} de ${total}`,
    bienvenida: {
      titulo: '¡Bienvenidos a Misión Pixel!',
      texto:
        'Un juego para acompañar el tratamiento del oftalmólogo. Primero lo preparamos entre los dos: ' +
        'unos datos, la pantalla y los lentes. Toma un par de minutos.',
    },
    pin: {
      titulo: 'PIN de adultos',
      explicacion:
        'Cuatro dígitos para entrar al panel de adultos. Es un candado para que la jugadora no cambie la configuración.',
      escribir: 'Escribe el PIN',
      repetir: 'Escríbelo otra vez',
      noCoincide: 'Los dos PIN no coinciden.',
      formato: 'El PIN son 4 dígitos.',
    },
    jugadora: {
      titulo: 'La jugadora',
      nombre: 'Nombre',
      ojoAmbliope: '¿Cuál es el ojo ambliope?',
      nota: 'Todo el juego se ajusta a partir de este dato.',
    },
    pantalla: {
      titulo: 'Calibrar la pantalla',
      explicacion:
        'Con una tarjeta sobre la pantalla medimos cuántos píxeles son un milímetro. Sirve para que las métricas sean comparables entre sesiones y dispositivos.',
      recomendado: 'Recomendado. También se puede hacer después desde el panel de adultos.',
    },
    lentes: {
      titulo: 'Lentes rojo/cian',
      pregunta: '¿Tienen lentes rojo/cian?',
      tieneSi: 'Sí, los tenemos',
      tieneNo: 'Todavía no',
      sinLentes:
        'Sin problema: se juega en modo parche. El modo lentes queda bloqueado hasta calibrarlos.',
      nota: 'Van encima de los lentes de graduación (clip-on o sobrepuestos).',
    },
    tiempos: {
      titulo: 'Tiempos de juego',
      metaDiaria: 'Meta diaria (min)',
      maxDiario: 'Máximo diario (min)',
      nota: 'Ajusta estos tiempos según lo que indique el oftalmólogo.',
      error: 'El máximo diario no puede ser menor que la meta diaria.',
    },
    avatar: {
      titulo: 'Tu pixelnauta',
      explicacion: 'Elige tu casco y el color del traje. Después podrás comprar más en la tienda.',
      casco: 'Casco',
      traje: 'Color del traje',
    },
    terminar: 'Ir a la base',
  },

  articulos: {
    'casco-clasico': 'Casco clásico',
    'casco-antena': 'Casco con antena',
    'casco-gato': 'Orejas de gato',
    'casco-dragon': 'Cuernos de dragón',
    'casco-burbuja': 'Burbuja de cristal',
    'casco-corona': 'Corona estelar',
    'traje-cristal': 'Traje cristal',
    'traje-ambar': 'Traje ámbar',
    'traje-musgo': 'Traje musgo',
    'traje-nebulosa': 'Traje nebulosa',
    'traje-coral': 'Traje coral',
    'traje-cielo': 'Traje cielo',
    'traje-lila': 'Traje lila',
    'traje-lunar': 'Traje lunar',
    'traje-galaxia': 'Traje galaxia',
    'traje-lava': 'Traje lava',
    'traje-arcoiris': 'Traje arcoíris pixel',
    'visor-cristal': 'Visor cristal',
    'visor-ambar': 'Visor ámbar',
    'visor-musgo': 'Visor musgo',
    'visor-coral': 'Visor coral',
    'visor-cielo': 'Visor cielo',
    'visor-espejo': 'Visor espejo',
    'accesorio-mochila': 'Mochila cohete',
    'accesorio-bufanda': 'Bufanda',
    'accesorio-capa': 'Capa',
    'accesorio-alas': 'Alas pixel',
    'mascota-gato': 'Gato pixel',
    'mascota-zorro': 'Zorro',
    'mascota-robotito': 'Robotito',
    'mascota-pulpo': 'Pulpo espacial',
    'mascota-ajolote': 'Ajolote',
    'mascota-dragon': 'Dragón bebé',
    'nave-exploradora': 'Nave exploradora',
    'nave-cometa': 'Nave cometa',
    'nave-ballena': 'Ballena estelar',
    'nave-castillo': 'Castillo volador',
    'estela-chispas': 'Estela de chispas',
    'estela-burbujas': 'Estela de burbujas',
    'estela-corazones': 'Estela de corazones',
    'estela-estrellas': 'Estela de estrellas',
    'estela-arcoiris': 'Estela arcoíris',
    'pico-basico': 'Pico básico',
    'pico-dorado': 'Pico dorado',
    'pico-hielo': 'Pico de hielo',
    'pico-laser': 'Pico láser',
    'fondo-base-lunar': 'Base lunar',
    'fondo-jardin': 'Jardín de bloques',
    'fondo-nebulosa': 'Nebulosa',
  } as Record<string, string>,

  categorias: {
    cascos: 'Cascos',
    trajes: 'Trajes',
    visores: 'Visores',
    accesorios: 'Accesorios',
    mascotas: 'Mascotas',
    naves: 'Naves',
    estelas: 'Estelas',
    picos: 'Picos',
    fondos: 'Fondos de la base',
  } as Record<string, string>,

  rarezas: {
    gratis: 'Gratis',
    comun: 'Común',
    raro: 'Raro',
    legendario: 'Legendario',
  } as Record<string, string>,

  tienda: {
    titulo: 'Tienda',
    comprar: 'Comprar',
    equipar: 'Equipar',
    equipado: 'Equipado',
    enUso: 'En uso',
    sinMonedas: 'Te faltan monedas. ¡Sigue jugando!',
    sinCristales: 'Te faltan cristales. Cumple la meta diaria para ganarlos.',
    vistaPrevia: 'Así te verías',
  },

  avatar: {
    titulo: 'Mi avatar',
    explicacion: 'Elige lo que llevas puesto. Todo lo que compres aparece aquí.',
  },

  insignias: {
    primer_cristal: { nombre: 'Primer cristal', criterio: 'Tu primer acierto en Minero de cristales' },
    ojo_de_halcon: { nombre: 'Ojo de halcón', criterio: 'Encontrar objetos cada vez más pequeños' },
    detective: { nombre: 'Detective espacial', criterio: 'Atrapar 50 saboteadores' },
    arquitecta: { nombre: 'Arquitecta', criterio: 'Completar 10 figuras' },
    piloto: { nombre: 'Piloto estelar', criterio: 'Atrapar 500 estrellas de energía' },
    corredora: { nombre: 'Corredora veloz', criterio: 'Recoger 300 celdas de energía' },
    constancia: { nombre: 'Constancia', criterio: 'Rachas de 3, 7, 14 y 30 días' },
    dos_ojos: { nombre: 'Equipo de dos ojos', criterio: 'Subir tres veces el contraste del otro ojo' },
    balance: { nombre: 'Balance perfecto', criterio: 'Llegar al contraste máximo con los dos ojos' },
    perseverante: { nombre: 'Perseverante', criterio: 'Terminar un nivel después de tres fallos seguidos' },
    coleccionista: { nombre: 'Coleccionista', criterio: 'Tener 10 artículos' },
    exploradora: { nombre: 'Exploradora', criterio: 'Jugar todos los minijuegos en un mismo día' },
  } as Record<string, { nombre: string; criterio: string }>,

  pantallaDeInsignias: {
    titulo: 'Insignias',
    conseguidas: (hechas: number, total: number) => `${hechas} de ${total}`,
    nivel: (n: number, total: number) => `Nivel ${n} de ${total}`,
    bloqueada: 'Todavía no',
  },

  records: {
    titulo: 'Mis récords',
    vacio: 'Todavía no hay récords. ¡Cada partida cuenta!',
    masPequeno: 'Lo más pequeño que has encontrado',
    sinCalibrar: 'Sin calibrar: la medida en milímetros es estimada.',
    enPx: (px: number) => `${px.toFixed(1)} px`,
    enMm: (mm: number) => `${mm.toFixed(2)} mm`,
    enArcmin: (arcmin: number) => `${arcmin.toFixed(1)} minutos de arco`,
  },

  misiones: {
    minutos: (n: number) => `Juega ${n} minutos`,
    cristales: (n: number) => `Encuentra ${n} cristales`,
    saboteadores: (n: number) => `Atrapa ${n} saboteadores`,
    figuras: (n: number) => `Construye ${n} ${n === 1 ? 'figura' : 'figuras'}`,
    estrellasDeEnergia: (n: number) => `Atrapa ${n} estrellas de energía`,
    celdas: (n: number) => `Recoge ${n} celdas de energía`,
    estrellasDeNivel: (n: number) => `Gana ${n} estrellas de nivel`,
    juegosDistintos: (n: number) => `Juega ${n} minijuegos distintos`,
  } as Record<string, (n: number) => string>,

  cofre: {
    titulo: '¡Cofre semanal!',
    texto: 'Cumpliste la meta cinco días esta semana.',
    abrir: 'Abrir el cofre',
  },

  insigniaNueva: (nombre: string) => `¡Insignia nueva: ${nombre}!`,

  parametros: {
    tamano: 'Tamaño del objetivo',
    contraste: 'Contraste del objetivo',
    diametro: 'Diámetro del visor',
    abertura: 'Abertura del muro',
  } as Record<string, string>,

  /** 'diametro:1.2' → 'Diámetro del visor (separación 1.2×)'. */
  nombreDeParametro: (clave: string): string => {
    const [base, espaciado] = clave.split(':');
    const nombre = es.parametros[base] ?? base;
    return espaciado ? `${nombre} (separación ${espaciado}×)` : nombre;
  },

  adultos: {
    titulo: 'Panel de adultos',
    pin: 'PIN de adultos',
    entrar: 'Entrar',
    pinIncorrecto: 'Ese PIN no es correcto.',
    olvide: 'Olvidé mi PIN',
    preguntaDeAdulto: (a: number, b: number) => `¿Cuánto es ${a} × ${b}?`,
    respuesta: 'Respuesta',
    nuevoPin: 'PIN nuevo',
    respuestaIncorrecta: 'Esa no es la respuesta. Vuelve a intentarlo.',
    salir: 'Salir del panel',

    secciones: {
      resumen: 'Resumen',
      graficas: 'Gráficas',
      configuracion: 'Configuración',
      calibraciones: 'Calibraciones',
      eventos: 'Eventos',
      notas: 'Notas',
      datos: 'Datos',
    } as Record<string, string>,

    calendario: 'Calendario de minutos por día',
    diasDeSemana: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    leyendaCalendario: 'Ámbar: parche. Cristal: lentes. Borde verde: meta cumplida.',
    minutosHoy: 'Hoy',
    minutosSemana: 'Esta semana',
    minutosMes: 'Este mes',
    porModo: (parche: number, lentes: number) =>
      `${Math.round(parche)} min parche · ${Math.round(lentes)} min lentes`,
    constanciaReal: 'Constancia real (sin protectores)',
    constanciaTexto: (dias: number, de: number) => `${dias} de ${de} días`,
    rachaActual: 'Racha actual',
    mejorRacha: 'Mejor racha',

    sinDatos: 'Todavía no hay datos suficientes para esta gráfica.',
    mejora: (pct: number) =>
      `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)} % frente a la primera semana`,
    mejoraNota: 'Más bajo es mejor: mide el objeto más pequeño que logra encontrar.',

    comoLeer: {
      umbralTamano:
        'Umbral de tamaño: el objeto más pequeño que logra encontrar con cerca de 70 % de aciertos. Más bajo es mejor.',
      umbralContraste:
        'Umbral de contraste: la diferencia de brillo más pequeña que logra distinguir. Más bajo es mejor.',
      balance:
        'Contraste del ojo dominante: cuánta señal recibe el ojo que ve bien. Sube cuando el otro ojo aguanta el reto y baja si le cuesta demasiado.',
      precision:
        'Precisión: porcentaje de aciertos. El juego la mantiene cerca del 71 %, así que casi no cambia; sirve para detectar días raros.',
      tiempo:
        'Tiempo de reacción: lo que tarda en responder. Bajar es señal de soltura, no de mejor visión.',
    } as Record<string, string>,

    graficaDe: (juego: string, parametro: string) => `${juego} · ${parametro}`,
    medianaMovil: 'Línea gruesa: mediana móvil de 7 días.',

    configuracion: {
      nombre: 'Nombre de la jugadora',
      ojoAmbliope: 'Ojo ambliope',
      metaDiaria: 'Meta diaria (min)',
      maxDiario: 'Máximo diario (min)',
      descansoCada: 'Descanso cada (min)',
      modosPermitidos: 'Modos permitidos',
      modoFijo: 'Modo fijo de hoy',
      sinModoFijo: 'Que elija ella',
      distancia: 'Distancia de juego (cm)',
      sonido: 'Sonido',
      musica: 'Música',
      volumen: 'Volumen',
      reducirMovimiento: 'Reducir movimiento',
      balanceAutomatico: 'Ajustar el contraste automáticamente',
      balanceManual: 'Contraste del ojo dominante',
      historialDeBalance: 'Historial del contraste',
      extender: (min: number) => `Dar ${min} minutos extra hoy`,
      extendido: (min: number) => `${min} min extra concedidos hoy`,
      guardado: 'Guardado.',
    },

    calibraciones: {
      pantalla: 'Calibración de pantalla',
      lentes: 'Calibración de lentes',
      nunca: 'Sin calibrar',
      hecha: (fecha: string) => `Última calibración: ${fecha}`,
      calibrarPantalla: 'Calibrar pantalla',
      calibrarLentes: 'Calibrar lentes',
      intensidades: (rojo: number, cian: number) => `Rojo máx. ${rojo} · Cian máx. ${cian}`,
    },

    eventos: {
      titulo: 'Veces que tocó "Me molesta la vista"',
      vacio: 'Ninguna. ',
      fila: (fecha: string, hora: string, modo: string, juego: string) =>
        `${fecha} ${hora} · ${modo} · ${juego}`,
      sinJuego: 'fuera de un minijuego',
    },

    notas: {
      titulo: 'Notas',
      explicacion:
        'Indicaciones del oftalmólogo, cambios de graduación o lo que convenga recordar. Aparecen como marcas en las gráficas.',
      nueva: 'Nota nueva',
      agregar: 'Agregar nota',
      borrar: 'Borrar',
      vacio: 'Todavía no hay notas.',
    },

    datos: {
      titulo: 'Datos',
      exportarCSV: 'Exportar CSV (para consulta)',
      exportarJSON: 'Exportar respaldo JSON',
      importarJSON: 'Importar respaldo JSON',
      importado: 'Respaldo importado.',
      errorAlImportar: 'Ese archivo no es un respaldo válido.',
      borrarTodo: 'Borrar todos los datos',
      confirmar1: '¿Seguro? Se borrará todo el progreso de este dispositivo.',
      confirmar2: 'Esto no se puede deshacer. ¿Borrar de verdad?',
      problemaDeGuardado:
        'El navegador no pudo guardar: puede que no quede espacio. Exporta un respaldo y libera espacio.',
      privacidad: 'Los datos viven solo en este dispositivo. Sin cuentas, sin analítica, sin envíos.',
    },
  },

  nombreDeModo: (modo: Modo): string => (modo === 'parche' ? 'Parche' : 'Lentes rojo/cian'),
} as const;

export type Textos = typeof es;

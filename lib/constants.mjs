// lib/constants.js
// Constantes y configuraciones centralizadas de la aplicación

/**
 * CONFIGURACIÓN DE TIPOS DE EVENTOS
 * Define todos los tipos de eventos soportados por la aplicación
 * Cada tipo tiene un label, ícono (nombre de Lucide), color de fondo y color de texto
 */
export const EVENT_TYPES = {
  fire: {
    id: 'fire',
    label: 'Incendio',
    labelPlural: 'Incendios',
    icon: 'Flame',
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Incendios forestales, estructurales o de vegetación',
    severity: 'critical' // critical, high, medium, low
  },
  smoke: {
    id: 'smoke',
    label: 'Humo denso',
    labelPlural: 'Humo denso',
    icon: 'Cloud',
    color: 'bg-gray-500',
    hoverColor: 'hover:bg-gray-600',
    textColor: 'text-gray-600',
    bgLight: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Humo denso que reduce visibilidad o calidad del aire',
    severity: 'high'
  },
  pollution: {
    id: 'pollution',
    label: 'Contaminación alta',
    labelPlural: 'Contaminación alta',
    icon: 'AlertTriangle',
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-600',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Niveles anormalmente altos de contaminación atmosférica',
    severity: 'medium'
  },
  good: {
    id: 'good',
    label: 'Aire limpio',
    labelPlural: 'Aire limpio',
    icon: 'ThumbsUp',
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Condiciones de aire excepcionalmente buenas',
    severity: 'low'
  }
}

/**
 * CONFIGURACIÓN DE NIVELES DE CONFIANZA
 * Define cómo se clasifican los reportes según su validación
 */
export const TRUST_LEVELS = {
  verified: {
    id: 'verified',
    label: 'Verificado',
    color: 'green',
    badgeColor: 'bg-green-500',
    textColor: 'text-green-700',
    minConfirmations: 5,
    description: 'Confirmado por múltiples usuarios o fuente oficial'
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    color: 'blue',
    badgeColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    description: 'Reporte sin validación suficiente aún'
  },
  disputed: {
    id: 'disputed',
    label: 'En disputa',
    color: 'yellow',
    badgeColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    minFalseReports: 3,
    maxConfirmations: 1,
    description: 'Reportado como falso por varios usuarios'
  },
  hidden: {
    id: 'hidden',
    label: 'Oculto',
    color: 'red',
    badgeColor: 'bg-red-500',
    textColor: 'text-red-700',
    minFalseReports: 5,
    description: 'Reporte ocultado por exceso de reportes negativos'
  }
}

/**
 * MAPEO DE CATEGORÍAS DE NASA EONET
 * Convierte las categorías de EONET a nuestros tipos de eventos
 */
export const NASA_CATEGORY_MAP = {
  'wildfires': 'fire',
  'volcanoes': 'fire',
  'severeStorms': 'pollution',
  'floods': 'pollution',
  'dustHaze': 'smoke',
  'drought': 'pollution',
  'snow': 'good',
  'seaLakeIce': 'good',
  'tempExtremes': 'pollution',
  'landslides': 'pollution',
  'manmade': 'pollution'
}

/**
 * CONFIGURACIÓN DE LA API DE NASA
 */
export const NASA_CONFIG = {
  baseURL: 'https://eonet.gsfc.nasa.gov/api/v3',
  endpoints: {
    events: '/events',
    categories: '/categories',
    sources: '/sources',
    layers: '/layers'
  },
  defaultParams: {
    limit: 100,
    days: 30,
    status: 'open' // 'open', 'closed', or 'all'
  },
  // Tiempo de caché en segundos
  cacheTime: 300, // 5 minutos
  // Límites de rate con DEMO_KEY
  rateLimits: {
    perHour: 30,
    perDay: 50
  }
}

/**
 * CONFIGURACIÓN DEL MAPA
 */
export const MAP_CONFIG = {
  // Ubicación por defecto si no se puede obtener geolocalización
  defaultCenter: {
    lat: 40.4168,
    lng: -3.7038,
    city: 'Madrid',
    country: 'España'
  },
  // Radio por defecto para buscar eventos cercanos (km)
  defaultRadius: 500,
  // Zoom levels si usas un mapa real
  zoom: {
    min: 2,
    max: 18,
    default: 10
  },
  // Configuración del grid simulado
  gridSize: 50, // píxeles
  gridOpacity: 0.1
}

/**
 * LÍMITES Y VALIDACIONES
 */
export const VALIDATION = {
  // Descripción de reporte
  description: {
    minLength: 10,
    maxLength: 500,
    required: true
  },
  // Coordenadas
  coordinates: {
    lat: {
      min: -90,
      max: 90
    },
    lng: {
      min: -180,
      max: 180
    }
  },
  // Usuario
  user: {
    nameMinLength: 2,
    nameMaxLength: 50,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    passwordMinLength: 8
  }
}

/**
 * MENSAJES DE LA APLICACIÓN
 */
export const MESSAGES = {
  errors: {
    generic: 'Ha ocurrido un error. Por favor, intenta de nuevo.',
    network: 'Error de conexión. Verifica tu internet.',
    unauthorized: 'Debes iniciar sesión para realizar esta acción.',
    invalidCoordinates: 'Las coordenadas proporcionadas no son válidas.',
    invalidDescription: 'La descripción debe tener entre 10 y 500 caracteres.',
    locationDenied: 'Permiso de ubicación denegado. Por favor, habilítalo en tu navegador.',
    locationUnavailable: 'No se pudo obtener tu ubicación. Intenta de nuevo.',
    nasaAPIError: 'Error al obtener datos de la NASA. Intenta más tarde.',
    alreadyVoted: 'Ya has votado en este reporte.'
  },
  success: {
    reportCreated: '¡Reporte creado exitosamente!',
    reportConfirmed: 'Reporte confirmado. Gracias por tu validación.',
    reportMarkedFalse: 'Reporte marcado como falso.',
    locationUpdated: 'Ubicación actualizada correctamente.'
  },
  info: {
    loadingEvents: 'Cargando eventos...',
    noEvents: 'No hay eventos en esta área.',
    anonymousUser: 'Usuario anónimo',
    verifiedByNASA: 'Verificado por NASA EONET',
    verifiedByCommunity: 'Verificado por la comunidad'
  },
  warnings: {
    disputed: 'Este reporte ha sido cuestionado por varios usuarios.',
    oldEvent: 'Este evento fue reportado hace más de 24 horas.',
    farEvent: 'Este evento está a más de 100km de tu ubicación.',
    criticalEvent: '⚠️ Evento crítico: mantente informado y sigue las indicaciones de autoridades.'
  }
}

/**
 * CONFIGURACIÓN DE TIEMPO
 */
export const TIME_CONFIG = {
  // Intervalos de actualización automática (ms)
  updateIntervals: {
    events: 300000, // 5 minutos
    location: 60000, // 1 minuto
    stats: 30000 // 30 segundos
  },
  // Tiempo que un reporte se considera "reciente" (ms)
  recentThreshold: 3600000, // 1 hora
  // Tiempo que un reporte se considera "antiguo" (ms)
  oldThreshold: 86400000 // 24 horas
}

/**
 * CONFIGURACIÓN DE NOTIFICACIONES
 */
export const NOTIFICATION_CONFIG = {
  // Tipos de notificaciones
  types: {
    newNearbyEvent: {
      id: 'newNearbyEvent',
      title: 'Nuevo evento cercano',
      icon: '🔔',
      priority: 'high'
    },
    criticalEvent: {
      id: 'criticalEvent',
      title: '⚠️ Evento crítico',
      icon: '🚨',
      priority: 'urgent'
    },
    reportVerified: {
      id: 'reportVerified',
      title: 'Tu reporte fue verificado',
      icon: '✓',
      priority: 'medium'
    },
    reportDisputed: {
      id: 'reportDisputed',
      title: 'Tu reporte fue cuestionado',
      icon: '❌',
      priority: 'medium'
    }
  },
  // Radio para considerar un evento como "cercano" (km)
  nearbyRadius: 50,
  // Duración de notificaciones en pantalla (ms)
  displayDuration: 5000
}

/**
 * CONFIGURACIÓN DE UI
 */
export const UI_CONFIG = {
  // Animaciones
  animations: {
    fadeIn: 'fade-in 0.3s ease-out',
    slideIn: 'slide-in 0.3s ease-out',
    ping: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
  },
  // Colores del tema
  theme: {
    primary: '#3b82f6', // blue-500
    secondary: '#6b7280', // gray-500
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#06b6d4' // cyan-500
  },
  // Tamaños de breakpoints (coinciden con Tailwind)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
}

/**
 * CONFIGURACIÓN DE ALMACENAMIENTO LOCAL
 * Nota: Usar con precaución, no guardar información sensible
 */
export const STORAGE_KEYS = {
  userPreferences: 'airwatch_user_preferences',
  lastLocation: 'airwatch_last_location',
  recentSearches: 'airwatch_recent_searches',
  votedReports: 'airwatch_voted_reports'
}

/**
 * ENLACES EXTERNOS
 */
export const EXTERNAL_LINKS = {
  nasaEONET: 'https://eonet.gsfc.nasa.gov/',
  nasaAPI: 'https://api.nasa.gov/',
  emergencySpain: 'https://www.112.es/',
  airQualityInfo: 'https://www.eea.europa.eu/themes/air',
  github: 'https://github.com/tu-repo/airwatch-community',
  documentation: 'https://docs.airwatch.example.com'
}

/**
 * CONFIGURACIÓN DE ANALYTICS (si lo implementas)
 */
export const ANALYTICS_CONFIG = {
  events: {
    reportCreated: 'report_created',
    reportValidated: 'report_validated',
    eventViewed: 'event_viewed',
    mapInteraction: 'map_interaction',
    searchPerformed: 'search_performed'
  }
}

/**
 * FEATURE FLAGS
 * Para activar/desactivar características fácilmente
 */
export const FEATURES = {
  enableGeolocation: true,
  enableNotifications: true,
  enableAnonymousMode: true,
  enableNASAData: true,
  enableReportValidation: true,
  enableMapClustering: false, // Para implementar en el futuro
  enableRealTimeUpdates: false, // Para implementar con WebSockets
  enableDarkMode: false // Para implementar en el futuro
}

// Exportar todo como objeto por defecto también
export default {
  EVENT_TYPES,
  TRUST_LEVELS,
  NASA_CATEGORY_MAP,
  NASA_CONFIG,
  MAP_CONFIG,
  VALIDATION,
  MESSAGES,
  TIME_CONFIG,
  NOTIFICATION_CONFIG,
  UI_CONFIG,
  STORAGE_KEYS,
  EXTERNAL_LINKS,
  ANALYTICS_CONFIG,
  FEATURES
}
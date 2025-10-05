// lib/utils.js
// Funciones de utilidad reutilizables en toda la aplicación

/**
 * Calcula la distancia entre dos coordenadas geográficas usando la fórmula de Haversine
 * Esta fórmula es precisa para distancias cortas y medias (hasta ~1000km)
 * 
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Radio de la Tierra en kilómetros
  
  // Convertir grados a radianes
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

/**
 * Convierte grados a radianes
 * @param {number} degrees - Ángulo en grados
 * @returns {number} Ángulo en radianes
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Formatea una distancia en un texto legible
 * Muestra en metros si es menor a 1km, en kilómetros si no
 * 
 * @param {number} kilometers - Distancia en kilómetros
 * @returns {string} Distancia formateada
 */
export function formatDistance(kilometers) {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)} m`
  }
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} km`
  }
  return `${Math.round(kilometers)} km`
}

/**
 * Calcula hace cuánto tiempo ocurrió un evento
 * Devuelve una cadena legible como "hace 5m", "hace 3h", "hace 2d"
 * 
 * @param {Date} date - Fecha del evento
 * @returns {string} Tiempo transcurrido formateado
 */
export function getTimeAgo(date) {
  const now = new Date()
  const diffMs = now - new Date(date)
  const diffMinutes = Math.floor(diffMs / 60000)
  
  if (diffMinutes < 1) return 'Ahora mismo'
  if (diffMinutes < 60) return `hace ${diffMinutes}m`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `hace ${diffDays}d`
  
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `hace ${diffWeeks}sem`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `hace ${diffMonths}mes`
}

/**
 * Filtra eventos que están dentro de un radio específico de una ubicación
 * Útil para mostrar solo eventos cercanos al usuario
 * 
 * @param {Array} events - Array de eventos con propiedades lat y lng
 * @param {Object} userLocation - Ubicación del usuario {lat, lng}
 * @param {number} radiusKm - Radio en kilómetros
 * @returns {Array} Eventos filtrados dentro del radio
 */
export function filterEventsByRadius(events, userLocation, radiusKm) {
  return events.filter(event => {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      event.lat,
      event.lng
    )
    return distance <= radiusKm
  })
}

/**
 * Ordena eventos por distancia desde una ubicación
 * Los eventos más cercanos aparecen primero
 * 
 * @param {Array} events - Array de eventos con propiedades lat y lng
 * @param {Object} userLocation - Ubicación del usuario {lat, lng}
 * @returns {Array} Eventos ordenados por distancia
 */
export function sortEventsByDistance(events, userLocation) {
  return [...events].sort((a, b) => {
    const distanceA = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      a.lat,
      a.lng
    )
    const distanceB = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      b.lat,
      b.lng
    )
    return distanceA - distanceB
  })
}

/**
 * Valida si una coordenada es válida
 * Latitud debe estar entre -90 y 90
 * Longitud debe estar entre -180 y 180
 * 
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {boolean} true si las coordenadas son válidas
 */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  )
}

/**
 * Obtiene la ubicación del usuario usando la Geolocation API
 * Retorna una Promise con las coordenadas o un error
 * 
 * @returns {Promise<Object>} Promesa que resuelve con {lat, lng, accuracy}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada por el navegador'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        let errorMessage
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado'
            break
          default:
            errorMessage = 'Error desconocido al obtener ubicación'
        }
        reject(new Error(errorMessage))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Formatea una fecha de manera legible en español
 * 
 * @param {Date} date - Fecha a formatear
 * @param {boolean} includeTime - Si debe incluir la hora
 * @returns {string} Fecha formateada
 */
export function formatDate(date, includeTime = false) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  
  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  
  return new Date(date).toLocaleDateString('es-ES', options)
}

/**
 * Debounce una función - útil para búsquedas y validaciones
 * Espera un tiempo antes de ejecutar la función si no hay nuevas llamadas
 * 
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en milisegundos
 * @returns {Function} Función con debounce aplicado
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Genera un ID único basado en timestamp y random
 * Útil para generar IDs temporales del lado del cliente
 * 
 * @returns {string} ID único
 */
export function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Combina clases CSS de manera segura, eliminando duplicados y valores falsy
 * Similar a la función clsx/classnames pero más simple
 * 
 * @param  {...any} classes - Clases a combinar
 * @returns {string} String de clases combinadas
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Trunca un texto a una longitud específica y agrega puntos suspensivos
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Sanitiza una entrada de texto eliminando caracteres peligrosos
 * Básico - para producción usar una librería como DOMPurify
 * 
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
export function sanitizeInput(text) {
  if (!text) return ''
  return text
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers
    .trim()
}

/**
 * Mapea categorías de NASA EONET a tipos de eventos de nuestra aplicación
 * 
 * @param {string} nasaCategory - Categoría de EONET
 * @returns {string} Tipo de evento de nuestra app
 */
export function mapNASACategoryToEventType(nasaCategory) {
  const mapping = {
    'wildfires': 'fire',
    'volcanoes': 'fire',
    'severeStorms': 'pollution',
    'floods': 'pollution',
    'dustHaze': 'smoke',
    'drought': 'pollution',
    'snow': 'good',
    'seaLakeIce': 'good',
    'tempExtremes': 'pollution',
    'landslides': 'pollution'
  }
  
  return mapping[nasaCategory] || 'pollution'
}

/**
 * Obtiene el color hexadecimal para un tipo de evento
 * Útil para gráficos y visualizaciones
 * 
 * @param {string} eventType - Tipo de evento
 * @returns {string} Color hex
 */
export function getEventColor(eventType) {
  const colors = {
    'fire': '#ef4444',      // red-500
    'smoke': '#6b7280',     // gray-500
    'pollution': '#f97316', // orange-500
    'good': '#22c55e'       // green-500
  }
  
  return colors[eventType] || colors.pollution
}

/**
 * Agrupa eventos por tipo
 * Útil para estadísticas y dashboards
 * 
 * @param {Array} events - Array de eventos
 * @returns {Object} Eventos agrupados por tipo
 */
export function groupEventsByType(events) {
  return events.reduce((acc, event) => {
    const type = event.type || 'unknown'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(event)
    return acc
  }, {})
}

/**
 * Calcula estadísticas básicas de eventos
 * 
 * @param {Array} events - Array de eventos
 * @returns {Object} Objeto con estadísticas
 */
export function calculateEventStats(events) {
  const grouped = groupEventsByType(events)
  const nasaEvents = events.filter(e => e.source === 'nasa')
  const communityEvents = events.filter(e => e.source === 'community')
  
  return {
    total: events.length,
    byType: Object.keys(grouped).reduce((acc, type) => {
      acc[type] = grouped[type].length
      return acc
    }, {}),
    fromNASA: nasaEvents.length,
    fromCommunity: communityEvents.length,
    verified: events.filter(e => {
      if (e.source === 'nasa') return true
      return e.confirmations >= 5
    }).length,
    disputed: events.filter(e => 
      e.source === 'community' && 
      e.falseReports >= 3 && 
      e.confirmations < 2
    ).length
  }
}
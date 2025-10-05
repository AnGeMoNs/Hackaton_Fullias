'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame, Cloud, AlertTriangle, ThumbsUp, Droplet, Zap } from 'lucide-react';
import { renderToString } from 'react-dom/server';

const reportIcons = {
  fire: { icon: Flame, color: '#ef4444' },
  smoke: { icon: Cloud, color: '#6b7280' },
  pollution: { icon: AlertTriangle, color: '#f97316' },
  toxic: { icon: Zap, color: '#a855f7' },
  waste: { icon: Droplet, color: '#ca8a04' },
  good: { icon: ThumbsUp, color: '#10b981' }
};

export default function MapView({ events, onEventClick, userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Ref para el marcador del usuario
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar mapa solo si no existe
    if (!mapInstanceRef.current) {
      // Pequeño delay para asegurar que el contenedor tenga tamaño
      setTimeout(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        
        // CAMBIO IMPORTANTE: zoomControl: false para luego agregarlo en posición personalizada
        mapInstanceRef.current = L.map(mapRef.current, {
          // Configuración específica para móviles
          tap: true,
          touchZoom: true,
          scrollWheelZoom: true,
          dragging: true,
          zoomControl: false // Desactivamos el control por defecto
        }).setView(
          [userLocation.lat, userLocation.lng],
          6 // Zoom más amplio para ver más eventos
        );

        // Agregar control de zoom en la posición top-right (arriba derecha)
        // Esto evita que se superponga con la leyenda de tipos que está en top-left
        L.control.zoom({
          position: 'topright'
        }).addTo(mapInstanceRef.current);

        // NUEVO: Crear control personalizado para "Mi Ubicación"
        const LocationControl = L.Control.extend({
          options: {
            position: 'topright' // Justo debajo de los controles de zoom
          },
          
          onAdd: function(map) {
            // Crear el botón
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', 'leaflet-control-locate', container);
            
            button.innerHTML = `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            `;
            button.href = '#';
            button.title = 'Ir a mi ubicación';
            
            // Prevenir comportamiento por defecto del enlace
            L.DomEvent.disableClickPropagation(button);
            
            // Agregar funcionalidad al hacer click
            L.DomEvent.on(button, 'click', function(e) {
              L.DomEvent.preventDefault(e);
              
              // Agregar clase de "cargando" para feedback visual
              button.classList.add('loading');
              
              // Obtener ubicación actual del usuario
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const newLat = position.coords.latitude;
                    const newLng = position.coords.longitude;
                    
                    // Animar el mapa hacia la nueva ubicación
                    map.flyTo([newLat, newLng], 13, {
                      duration: 1.5, // Duración de la animación en segundos
                      easeLinearity: 0.25
                    });
                    
                    // Actualizar el marcador del usuario si existe
                    if (userMarkerRef.current) {
                      userMarkerRef.current.setLatLng([newLat, newLng]);
                      
                      // Actualizar el popup con la nueva ubicación
                      userMarkerRef.current.getPopup().setContent(
                        `<b>Tú estás aquí</b><br>Lat: ${newLat.toFixed(4)}, Lng: ${newLng.toFixed(4)}`
                      );
                      
                      // Mostrar el popup brevemente
                      userMarkerRef.current.openPopup();
                      setTimeout(() => {
                        userMarkerRef.current.closePopup();
                      }, 2000);
                    }
                    
                    // Quitar clase de cargando
                    button.classList.remove('loading');
                  },
                  (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    alert('No se pudo obtener tu ubicación. Asegúrate de permitir el acceso a la ubicación.');
                    button.classList.remove('loading');
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                  }
                );
              } else {
                alert('Tu navegador no soporta geolocalización.');
                button.classList.remove('loading');
              }
            });
            
            return container;
          }
        });
        
        // Agregar el control de ubicación al mapa
        new LocationControl().addTo(mapInstanceRef.current);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(mapInstanceRef.current);

        // Marcador del usuario
        const userIcon = L.divIcon({
          html: `<div class="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6c0 4.314 6 10 6 10s6-5.686 6-10a6 6 0 00-6-6z"/>
            </svg>
          </div>`,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 48]
        });

        // Crear y guardar referencia al marcador del usuario
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>Tú estás aquí</b><br>${userLocation.city}`);
        
        // Forzar que Leaflet recalcule el tamaño del mapa
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);
      }, 100);
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Esperar a que el mapa esté inicializado antes de agregar marcadores
    if (!mapInstanceRef.current) return;

    // Agregar marcadores de eventos
    events.forEach(event => {
      const { icon: IconComponent, color } = reportIcons[event.type] || reportIcons.pollution;
      
      // Determinar el tamaño del marcador según la fuente
      const isNASA = event.source === 'nasa' || event.source === 'nasa-firms';
      const size = isNASA ? 44 : 36;
      
      const iconHtml = renderToString(
        <div style={{ 
          backgroundColor: color,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <IconComponent color="white" size={size === 44 ? 24 : 20} />
          {isNASA && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
              fontWeight: 'bold'
            }}>N</div>
          )}
          {event.source === 'community' && event.confirmations >= 5 && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{width: '10px', height: '10px', color: 'white'}} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      );

      const customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size/2, size],
        popupAnchor: [0, -size]
      });

      const marker = L.marker([event.lat, event.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .on('click', () => onEventClick(event));

      const getTimeAgo = (date) => {
        const minutes = Math.floor((new Date() - date) / 60000);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        return `hace ${Math.floor(hours / 24)}d`;
      };

      const typeLabels = {
        fire: 'Incendio',
        smoke: 'Humo denso',
        pollution: 'Contaminación',
        toxic: 'Gases tóxicos',
        waste: 'Residuos',
        good: 'Aire limpio'
      };

      let popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center justify-between mb-2">
            <b>${typeLabels[event.type] || event.type}</b>
            ${isNASA ? '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">NASA</span>' : ''}
          </div>
          <p class="text-sm mt-1">${event.description}</p>
          <p class="text-xs text-gray-500 mt-1">Por: ${event.user}</p>
          <p class="text-xs text-gray-400">${getTimeAgo(event.time)}</p>
      `;

      if (event.brightness) {
        popupContent += `
          <div class="mt-2 pt-2 border-t border-gray-200">
            <p class="text-xs text-gray-600">
              🌡️ Brillo: <b>${event.brightness}K</b><br>
              📊 Confianza: <b>${event.confidence}%</b>
            </p>
          </div>
        `;
      }

      if (event.source === 'community') {
        popupContent += `
          <div class="mt-2 pt-2 border-t border-gray-200">
            <p class="text-xs text-gray-600">
              ✓ ${event.confirmations} confirmaciones | 
              ✗ ${event.falseReports} falsos
            </p>
          </div>
        `;
      }

      popupContent += '</div>';

      marker.bindPopup(popupContent);

      markersRef.current.push(marker);
    });

    // Ajustar vista del mapa
    if (events.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(
        events.map(e => [e.lat, e.lng])
      );
      mapInstanceRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 12 // Limitar el zoom máximo
      });
    }

  }, [events, userLocation, onEventClick]);

  // Cleanup cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // CAMBIO IMPORTANTE: Agregado min-h-[400px] como red de seguridad
  // Esto asegura que el div del mapa tenga al menos 400px de altura
  // incluso si algo sale mal con el cálculo de altura del padre
  return <div ref={mapRef} className="w-full h-full min-h-[400px]" />;
}
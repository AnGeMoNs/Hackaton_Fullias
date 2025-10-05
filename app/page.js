// app/page.js
"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Wind, MapPin, Flame, Cloud, AlertTriangle, ThumbsUp,
  User, Mail, Lock, X, Plus, Users, Droplet, Zap, Menu,
  Thermometer, Sun, Gauge, CloudRain
} from 'lucide-react';

// Mapa dinámico con loading
const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-green-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  )
});

const CollaborativeAirApp = () => {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [userLocation, setUserLocation] = useState({ lat: -33.45, lng: -70.66, city: 'Santiago' });
  
  // Estados para datos meteorológicos
  const [meteoData, setMeteoData] = useState(null);
  const [loadingMeteo, setLoadingMeteo] = useState(true);
  
  const [nasaEvents, setNasaEvents] = useState([]);
  const [nasaFires, setNasaFires] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [loadingNasa, setLoadingNasa] = useState(true);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const [newReport, setNewReport] = useState({ type: '', description: '', lat: null, lng: null });
  const [selectedReport, setSelectedReport] = useState(null);
  const [userVotes, setUserVotes] = useState({});

  const reportTypes = {
    fire: { label: 'Incendio', icon: Flame, color: 'bg-red-500', textColor: 'text-red-600' },
    smoke: { label: 'Humo denso', icon: Cloud, color: 'bg-gray-500', textColor: 'text-gray-600' },
    pollution: { label: 'Contaminación', icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-600' },
    toxic: { label: 'Gases tóxicos', icon: Zap, color: 'bg-purple-500', textColor: 'text-purple-600' },
    waste: { label: 'Residuos', icon: Droplet, color: 'bg-yellow-600', textColor: 'text-yellow-700' },
    good: { label: 'Aire limpio', icon: ThumbsUp, color: 'bg-green-500', textColor: 'text-green-600' }
  };

  // Función auxiliar para obtener calidad del aire
  const getAQIInfo = (pm25) => {
    if (pm25 == null || pm25 < 0) {
      return { level: "Desconocido", color: "bg-gray-400", textColor: "text-gray-700" };
    }
    if (pm25 <= 12) return { level: "Bueno", color: "bg-green-500", textColor: "text-green-700" };
    if (pm25 <= 35.4) return { level: "Moderado", color: "bg-yellow-500", textColor: "text-yellow-700" };
    if (pm25 <= 55.4) return { level: "Sensible", color: "bg-orange-500", textColor: "text-orange-700" };
    if (pm25 <= 150.4) return { level: "No saludable", color: "bg-red-500", textColor: "text-red-700" };
    if (pm25 <= 250.4) return { level: "Muy malo", color: "bg-purple-500", textColor: "text-purple-700" };
    return { level: "Peligroso", color: "bg-red-900", textColor: "text-red-900" };
  };

  // Función para obtener dirección del viento en texto
  const dirToText = (deg) => {
    if (deg == null || Number.isNaN(deg)) return "-";
    const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
    return dirs[Math.round(((deg % 360) / 22.5)) % 16];
  };

  const getReportTrust = (report) => {
    if (report.source === 'nasa' || report.source === 'nasa-firms') return 'verified';
    if (report.falseReports >= 5) return 'hidden';
    if (report.falseReports >= 3 && report.confirmations < 2) return 'disputed';
    if (report.confirmations >= 5) return 'verified';
    return 'normal';
  };

  const getTimeAgo = (date) => {
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  // Cargar datos meteorológicos
  useEffect(() => {
    const fetchMeteoData = async () => {
      try {
        const res = await fetch(`/api/meteo?lat=${userLocation.lat}&lon=${userLocation.lng}&tz=auto`);
        const data = await res.json();
        if (data.ok) {
          setMeteoData(data);
        }
      } catch (err) {
        console.error('Error cargando datos meteorológicos:', err);
      } finally {
        setLoadingMeteo(false);
      }
    };

    if (user) {
      fetchMeteoData();
      // Auto-actualizar cada 10 minutos
      const interval = setInterval(fetchMeteoData, 600000);
      return () => clearInterval(interval);
    }
  }, [userLocation, user]);

  useEffect(() => {
    const fetchNASAEONET = async () => {
      try {
        const res = await fetch('/api/nasa-eonet');
        const data = await res.json();
        if (data.success) setNasaEvents(data.events);
      } catch (err) {
        console.error('Error cargando NASA EONET:', err);
      }
    };
    if (user) fetchNASAEONET();
  }, [user]);

  useEffect(() => {
    const fetchNASAFIRMS = async () => {
      try {
        const res = await fetch('/api/nasa-fires');
        const data = await res.json();
        if (data.success) setNasaFires(data.fires);
      } catch (err) {
        console.error('Error cargando NASA FIRMS:', err);
      } finally {
        setLoadingNasa(false);
      }
    };
    if (user) fetchNASAFIRMS();
  }, [user]);

  const allEvents = [...nasaEvents, ...nasaFires, ...userReports].filter(
    event => getReportTrust(event) !== 'hidden'
  );

  const handleAuth = () => {
    if (formData.email && formData.password) {
      setUser({ 
        name: formData.name || formData.email.split('@')[0], 
        email: formData.email,
        isAnonymous: false 
      });
    }
  };

  const handleAnonymous = () => {
    setUser({ 
      name: 'Usuario Anónimo', 
      email: null,
      isAnonymous: true 
    });
  };

  const handleCreateReport = () => {
    if (newReport.type && newReport.description) {
      const report = {
        id: `user-${Date.now()}`,
        type: newReport.type,
        lat: newReport.lat || userLocation.lat,
        lng: newReport.lng || userLocation.lng,
        description: newReport.description,
        user: user.name,
        time: new Date(),
        confirmations: 0,
        falseReports: 0,
        source: 'community'
      };
      setUserReports([report, ...userReports]);
      setShowReportModal(false);
      setNewReport({ type: '', description: '', lat: null, lng: null });
    }
  };

  const handleConfirmReport = (reportId) => {
    if (userVotes[reportId] || reportId.startsWith('nasa-') || reportId.startsWith('firms-')) return;
    setUserReports(userReports.map(report => 
      report.id === reportId ? { ...report, confirmations: report.confirmations + 1 } : report
    ));
    setUserVotes({ ...userVotes, [reportId]: 'confirmed' });
  };

  const handleReportFalse = (reportId) => {
    if (userVotes[reportId] || reportId.startsWith('nasa-') || reportId.startsWith('firms-')) return;
    setUserReports(userReports.map(report => 
      report.id === reportId ? { ...report, falseReports: report.falseReports + 1 } : report
    ));
    setUserVotes({ ...userVotes, [reportId]: 'false' });
  };

  // Pantalla de login
  if (!user) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-blue-500 w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Wind className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">FullCleanAirs</h1>
            <p className="text-sm sm:text-base text-gray-600">Monitoreo ambiental NASA + Comunidad</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={20} />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={20} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
            </div>
            <button onClick={handleAuth} className="w-full bg-blue-500 text-white py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-blue-600 active:bg-blue-700 transition duration-200 shadow-lg text-base sm:text-lg touch-target">
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">O</span>
              </div>
            </div>
            <button onClick={handleAnonymous} className="w-full bg-gray-100 text-gray-700 py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-gray-200 active:bg-gray-300 transition duration-200 border-2 border-gray-300 text-base sm:text-lg touch-target">
              Continuar como Anónimo
            </button>
          </div>
          <div className="mt-4 sm:mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:text-blue-700 active:text-blue-800 text-sm sm:text-base font-medium touch-target">
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="min-h-screen-safe bg-gray-100 flex flex-col">
      {/* Header sticky */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex justify-between items-center gap-3">
            {/* Logo y título */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="bg-blue-500 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <Wind className="text-white" size={20} />
              </div>
              <div className="min-w-0 hidden md:block">
                <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">FullCleanAirs</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <Users size={10} className="flex-shrink-0" /> 
                  <span className="truncate">{allEvents.length} eventos{!loadingNasa && ` • ${nasaFires.length} NASA`}</span>
                </p>
              </div>
            </div>

            {/* Widgets meteorológicos móviles centrados */}
            <div className="flex-1 flex justify-center min-w-0 sm:hidden">
              {!loadingMeteo && meteoData && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                    <Thermometer className="text-blue-600" size={14} />
                    <span className="text-sm font-semibold text-blue-900">
                      {meteoData.temperature_c != null ? `${Math.round(meteoData.temperature_c)}°` : "--°"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                    <Sun className="text-yellow-600" size={14} />
                    <span className="text-sm font-semibold text-yellow-900">
                      {meteoData.uv_index != null ? meteoData.uv_index.toFixed(1) : "--"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones derecha */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button 
                onClick={() => setShowEventsList(true)}
                className="lg:hidden p-2 sm:p-2.5 bg-blue-100 rounded-lg hover:bg-blue-200 active:bg-blue-300 transition touch-target"
              >
                <Menu className="text-blue-600" size={20} />
              </button>
              <button onClick={() => setUser(null)} className="text-gray-600 hover:text-gray-800 active:text-gray-900 text-sm sm:text-base font-medium touch-target px-2 sm:px-3">
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 relative order-2 lg:order-1 h-[60vh] sm:h-[65vh] lg:h-auto">
          <MapView 
            events={allEvents}
            onEventClick={setSelectedReport}
            userLocation={userLocation}
          />
          
          {/* Botón flotante para crear reporte */}
          <button
            onClick={() => setShowReportModal(true)}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full p-3 sm:p-4 shadow-2xl transition-all hover:scale-105 active:scale-95 z-[1000] touch-target"
          >
            <Plus size={24} className="sm:hidden" />
            <Plus size={32} className="hidden sm:block" />
          </button>

          {/* Panel de información meteorológica - Desktop */}
          {!loadingMeteo && meteoData && (
            <div className="meteo-widgets-container absolute bottom-20 right-4 space-y-2 z-[999]">
              {/* Temperatura y UV */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-200">
                <div className="flex items-center justify-around gap-2">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="text-blue-600" size={16} />
                    <div>
                      <div className="text-xl font-bold text-blue-900">
                        {meteoData.temperature_c != null ? `${Math.round(meteoData.temperature_c)}°` : "--°"}
                      </div>
                      <div className="text-xs text-gray-500">Temp</div>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-300"></div>
                  <div className="flex items-center gap-1.5">
                    <Sun className="text-yellow-600" size={16} />
                    <div>
                      <div className="text-xl font-bold text-yellow-900">
                        {meteoData.uv_index != null ? meteoData.uv_index.toFixed(1) : "--"}
                      </div>
                      <div className="text-xs text-gray-500">UV</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-center mt-1.5">NASA + Open-Meteo</div>
              </div>

              {/* Presión atmosférica */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="text-indigo-600" size={16} />
                  <span className="text-xs font-medium text-gray-600">Presión atmosférica</span>
                </div>
                <div className="text-3xl font-bold text-indigo-900">
                  {meteoData.pressure_hpa != null ? Math.round(meteoData.pressure_hpa) : "--"}
                  <span className="text-base font-normal ml-1">hPa</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">NASA POWER</div>
              </div>

              {/* Viento */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="text-cyan-600" size={16} />
                  <span className="text-xs font-medium text-gray-600">Viento</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Vel: <span className="font-semibold">{meteoData.wind?.speed_kmh?.toFixed?.(1) ?? "—"} km/h</span></div>
                  <div>Ráf: <span className="font-semibold">{meteoData.wind?.gust_kmh?.toFixed?.(1) ?? "—"} km/h</span></div>
                  <div>Dir: <span className="font-semibold">{meteoData.wind?.direction_deg ?? "—"}° ({dirToText(meteoData.wind?.direction_deg)})</span></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">NASA + Open-Meteo</div>
              </div>

              {/* Precipitación */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain className="text-blue-600" size={16} />
                  <span className="text-xs font-medium text-gray-600">Precipitación</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Prob: <span className="font-semibold">{meteoData.forecast?.precipitation_probability_pct ?? "—"}%</span></div>
                  <div>Tasa: <span className="font-semibold">{(meteoData.precipitation_mm_per_hr ?? meteoData.forecast?.rain_mm ?? 0)?.toFixed?.(1) ?? "—"} mm/h</span></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Open-Meteo</div>
              </div>

              {/* Calidad del aire */}
              {meteoData.air_quality && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className={getAQIInfo(meteoData.air_quality.pm25).textColor} size={16} />
                    <span className="text-xs font-medium text-gray-600">Calidad del aire</span>
                    <span className={`text-xs font-semibold ${getAQIInfo(meteoData.air_quality.pm25).textColor}`}>
                      {getAQIInfo(meteoData.air_quality.pm25).level}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-600">PM2.5:</span> <span className="font-semibold">{meteoData.air_quality.pm25?.toFixed?.(1) ?? "—"}</span></div>
                    <div><span className="text-gray-600">PM10:</span> <span className="font-semibold">{meteoData.air_quality.pm10?.toFixed?.(1) ?? "—"}</span></div>
                    <div><span className="text-gray-600">O₃:</span> <span className="font-semibold">{meteoData.air_quality.o3?.toFixed?.(0) ?? "—"}</span></div>
                    <div><span className="text-gray-600">NO₂:</span> <span className="font-semibold">{meteoData.air_quality.no2?.toFixed?.(1) ?? "—"}</span></div>
                    <div><span className="text-gray-600">SO₂:</span> <span className="font-semibold">{meteoData.air_quality.so2?.toFixed?.(1) ?? "—"}</span></div>
                    <div><span className="text-gray-600">CO:</span> <span className="font-semibold">{meteoData.air_quality.co?.toFixed?.(0) ?? "—"}</span></div>
                  </div>
                  {meteoData.air_quality.dust && (
                    <div className="text-xs mt-2"><span className="text-gray-600">Polvo:</span> <span className="font-semibold">{meteoData.air_quality.dust.toFixed?.(1)}</span></div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">Open-Meteo</div>
                </div>
              )}
            </div>
          )}

          {/* Leyenda de tipos - Izquierda */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white rounded-xl shadow-lg p-2.5 sm:p-4 z-[1000] max-w-[140px] sm:max-w-xs">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 mb-1.5 sm:mb-3">Tipos</h3>
            <div className="space-y-1 sm:space-y-2">
              {Object.entries(reportTypes).slice(0, 4).map(([key, type]) => {
                const Icon = type.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5 sm:gap-2">
                    <div className={`${type.color} rounded-full p-0.5 sm:p-1 flex-shrink-0`}>
                      <Icon className="text-white" size={12} />
                    </div>
                    <span className="text-xs text-gray-700 truncate">{type.label}</span>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 mt-1">+{Object.keys(reportTypes).length - 4} más</p>
            </div>
          </div>
        </div>

        {/* Panel lateral - desktop */}
        <div className="hidden lg:block w-80 xl:w-96 bg-white shadow-xl overflow-y-auto order-1 lg:order-2">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-800">Eventos Activos</h2>
            <p className="text-xs text-gray-500 mt-1">Satélite + Comunidad</p>
          </div>
          
          <div className="divide-y">
            {allEvents.map((event) => {
              const eventType = reportTypes[event.type];
              const Icon = eventType.icon;
              const trust = getReportTrust(event);
              const isNASA = event.source === 'nasa' || event.source === 'nasa-firms';
              
              return (
                <div 
                  key={event.id} 
                  className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition ${trust === 'disputed' ? 'bg-yellow-50' : ''}`}
                  onClick={() => setSelectedReport(event)}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`${eventType.color} rounded-full p-1.5 sm:p-2 flex-shrink-0 relative`}>
                      <Icon className="text-white" size={18} />
                      {trust === 'verified' && (
                        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-green-500 rounded-full w-3 h-3 sm:w-4 sm:h-4 border-2 border-white flex items-center justify-center">
                          <svg className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className={`font-semibold ${eventType.textColor} text-sm`}>
                          {eventType.label}
                        </h3>
                        {isNASA && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
                            NASA
                          </span>
                        )}
                        {trust === 'disputed' && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">
                            Disputa
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs text-gray-500">
                        <span className="truncate max-w-[100px]">{event.user}</span>
                        <span>•</span>
                        <span>{getTimeAgo(event.time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel móvil - bottom sheet */}
        {showEventsList && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowEventsList(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col modal-mobile-bottom" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Eventos Activos</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{allEvents.length} eventos encontrados</p>
                  </div>
                  <button onClick={() => setShowEventsList(false)} className="p-2 hover:bg-gray-100 rounded-lg touch-target">
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="divide-y overflow-y-auto flex-1">
                {allEvents.map((event) => {
                  const eventType = reportTypes[event.type];
                  const Icon = eventType.icon;
                  const trust = getReportTrust(event);
                  const isNASA = event.source === 'nasa' || event.source === 'nasa-firms';
                  
                  return (
                    <div 
                      key={event.id} 
                      className={`p-4 active:bg-gray-100 cursor-pointer transition ${trust === 'disputed' ? 'bg-yellow-50' : ''}`}
                      onClick={() => {
                        setSelectedReport(event);
                        setShowEventsList(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${eventType.color} rounded-full p-2 flex-shrink-0`}>
                          <Icon className="text-white" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold ${eventType.textColor} text-sm`}>
                              {eventType.label}
                            </h3>
                            {isNASA && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                NASA
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span className="truncate max-w-[120px]">{event.user}</span>
                            <span>•</span>
                            <span>{getTimeAgo(event.time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear reporte - responsive */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[1001]">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-mobile-bottom">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Nuevo Reporte</h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 p-2 touch-target">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Tipo de evento</label>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3">
                  {Object.entries(reportTypes).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewReport({...newReport, type: key})}
                        className={`p-2.5 sm:p-3 rounded-lg border-2 transition touch-target ${
                          newReport.type === key 
                            ? `${type.color} border-transparent text-white` 
                            : 'border-gray-200 active:border-gray-300'
                        }`}
                      >
                        <Icon className={newReport.type === key ? 'text-white mx-auto' : 'text-gray-600 mx-auto'} size={20} />
                        <p className={`text-xs mt-1 font-medium truncate ${newReport.type === key ? 'text-white' : 'text-gray-700'}`}>
                          {type.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Describe lo que observas..."
                  value={newReport.description}
                  onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 flex items-center gap-1.5">
                  <MapPin size={14} className="flex-shrink-0" /> 
                  <span className="truncate">Ubicación: <strong>{userLocation.city}</strong></span>
                </p>
              </div>
              <button
                onClick={handleCreateReport}
                disabled={!newReport.type || !newReport.description}
                className="w-full bg-blue-500 text-white py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-blue-600 active:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-base sm:text-lg touch-target"
              >
                Publicar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle - responsive */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[1001]">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-mobile-bottom">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className={`${reportTypes[selectedReport.type].color} rounded-full p-2 sm:p-3 flex-shrink-0`}>
                  {React.createElement(reportTypes[selectedReport.type].icon, { className: 'text-white', size: 22 })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className={`text-lg sm:text-xl font-bold ${reportTypes[selectedReport.type].textColor}`}>
                      {reportTypes[selectedReport.type].label}
                    </h2>
                    {(selectedReport.source === 'nasa' || selectedReport.source === 'nasa-firms') && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        NASA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{getTimeAgo(selectedReport.time)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600 p-2 touch-target flex-shrink-0">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Descripción</h3>
                <p className="text-sm sm:text-base text-gray-600">{selectedReport.description}</p>
              </div>

              {(selectedReport.source === 'nasa' || selectedReport.source === 'nasa-firms') ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verificado por NASA
                  </p>
                  {selectedReport.brightness && (
                    <p className="text-xs text-blue-600 mt-1">
                      Brillo: {selectedReport.brightness}K | Confianza: {selectedReport.confidence}%
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 sm:mb-3">Validación</h3>
                  <div className="flex items-center justify-around mb-3 sm:mb-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">{selectedReport.confirmations}</div>
                      <div className="text-xs text-gray-600 mt-1">Confirmaciones</div>
                    </div>
                    <div className="w-px h-10 sm:h-12 bg-gray-300"></div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-red-600">{selectedReport.falseReports}</div>
                      <div className="text-xs text-gray-600 mt-1">Falsos</div>
                    </div>
                  </div>
                  {!userVotes[selectedReport.id] ? (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          handleConfirmReport(selectedReport.id);
                          setSelectedReport({...selectedReport, confirmations: selectedReport.confirmations + 1});
                        }}
                        className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-2.5 sm:py-3 rounded-lg font-medium transition text-sm touch-target"
                      >
                        ✓ Confirmar
                      </button>
                      <button
                        onClick={() => {
                          handleReportFalse(selectedReport.id);
                          setSelectedReport({...selectedReport, falseReports: selectedReport.falseReports + 1});
                        }}
                        className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white py-2.5 sm:py-3 rounded-lg font-medium transition text-sm touch-target"
                      >
                        ✗ Es falso
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-sm text-gray-700">
                        {userVotes[selectedReport.id] === 'confirmed' ? '✓ Ya confirmaste' : '✗ Ya reportaste'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Ubicación</h3>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 truncate">{selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeAirApp;
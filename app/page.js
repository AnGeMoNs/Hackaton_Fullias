// file: app/page.js
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Wind, MapPin, Flame, Cloud, AlertTriangle, ThumbsUp,
  User, Mail, Lock, X, Plus, Users, Droplet, Zap, Menu
} from "lucide-react";
import MeteoDropdown from "./components/MeteoDropdown"; // <-- NUEVO
const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-green-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

const reportTypes = {
  fire:       { label: "Incendio",       icon: Flame,        color: "bg-red-500",    textColor: "text-red-600" },
  smoke:      { label: "Humo denso",     icon: Cloud,        color: "bg-gray-500",   textColor: "text-gray-600" },
  pollution:  { label: "Contaminación",  icon: AlertTriangle,color: "bg-orange-500", textColor: "text-orange-600" },
  toxic:      { label: "Gases tóxicos",  icon: Zap,          color: "bg-purple-500", textColor: "text-purple-600" },
  waste:      { label: "Residuos",       icon: Droplet,      color: "bg-yellow-600", textColor: "text-yellow-700" },
  good:       { label: "Aire limpio",    icon: ThumbsUp,     color: "bg-green-500",  textColor: "text-green-600" },
};

function getReportTrust(report) {
  if (report.source === "nasa" || report.source === "nasa-firms") return "verified";
  if (report.falseReports >= 5) return "hidden";
  if (report.falseReports >= 3 && report.confirmations < 2) return "disputed";
  if (report.confirmations >= 5) return "verified";
  return "normal";
}

function getTimeAgo(date) {
  const minutes = Math.floor((new Date() - date) / 60000);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function CollaborativeAirApp() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [userLocation, setUserLocation] = useState({ lat: 40.4168, lng: -3.7038, city: "Obteniendo ubicación..." });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const [nasaEvents, setNasaEvents] = useState([]);
  const [nasaFires, setNasaFires] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [loadingNasa, setLoadingNasa] = useState(true);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const [newReport, setNewReport] = useState({ type: "", description: "", lat: null, lng: null });
  const [selectedReport, setSelectedReport] = useState(null);
  const [userVotes, setUserVotes] = useState({});

  // ubicación real
  const getUserRealLocation = async () => {
    setIsLoadingLocation(true);
    if (!navigator.geolocation) {
      setUserLocation({ lat: 40.4168, lng: -3.7038, city: "Ubicación no disponible" });
      setIsLoadingLocation(false);
      return;
    }
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      try {
        const response = await fetch(
          `/api/reverse-geocode?lat=${lat}&lon=${lng}&lang=es`,
          { cache: "no-store" } // usa el proxy del servidor (cumple políticas)
        );
        if (response.ok) {
          const data = await response.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.state || "Tu ubicación";
          setUserLocation({ lat, lng, city });
        } else {
          setUserLocation({ lat, lng, city: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        }
      } catch {
        setUserLocation({ lat, lng, city: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    } catch (error) {
      let msg = "Ubicación no disponible";
      if (error.code === 1) msg = "Permiso denegado";
      else if (error.code === 2) msg = "Posición no disponible";
      else if (error.code === 3) msg = "Tiempo agotado";
      setUserLocation({ lat: 40.4168, lng: -3.7038, city: msg });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => { getUserRealLocation(); }, []);
  useEffect(() => { if (showReportModal) getUserRealLocation(); }, [showReportModal]);

  useEffect(() => {
    const fetchNASAEONET = async () => {
      try {
        const res = await fetch("/api/nasa-eonet");
        const data = await res.json();
        if (data.success) setNasaEvents(data.events);
      } catch (err) {
        console.error("Error cargando NASA EONET:", err);
      }
    };
    fetchNASAEONET();
  }, []);

  useEffect(() => {
    const fetchNASAFIRMS = async () => {
      try {
        const res = await fetch("/api/nasa-fires");
        const data = await res.json();
        if (data.success) setNasaFires(data.fires);
      } catch (err) {
        console.error("Error cargando NASA FIRMS:", err);
      } finally {
        setLoadingNasa(false);
      }
    };
    fetchNASAFIRMS();
  }, []);

  const allEvents = [...nasaEvents, ...nasaFires, ...userReports].filter(
    (event) => getReportTrust(event) !== "hidden"
  );

  const handleAuth = () => {
    if (formData.email && formData.password) {
      setUser({
        name: formData.name || formData.email.split("@")[0],
        email: formData.email,
        isAnonymous: false,
      });
    }
  };

  const handleAnonymous = () => setUser({ name: "Usuario Anónimo", email: null, isAnonymous: true });

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
        source: "community",
      };
      setUserReports([report, ...userReports]);
      setShowReportModal(false);
      setNewReport({ type: "", description: "", lat: null, lng: null });
    }
  };

  const handleConfirmReport = (reportId) => {
    if (userVotes[reportId] || reportId.startsWith("nasa-") || reportId.startsWith("firms-")) return;
    setUserReports(userReports.map((r) => (r.id === reportId ? { ...r, confirmations: r.confirmations + 1 } : r)));
    setUserVotes({ ...userVotes, [reportId]: "confirmed" });
  };

  const handleReportFalse = (reportId) => {
    if (userVotes[reportId] || reportId.startsWith("nasa-") || reportId.startsWith("firms-")) return;
    setUserReports(userReports.map((r) => (r.id === reportId ? { ...r, falseReports: r.falseReports + 1 } : r)));
    setUserVotes({ ...userVotes, [reportId]: "false" });
  };

  if (!user) {
    return (
      <div className="h-screen-safe bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-blue-500 w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Wind className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Full Clean Airs</h1>
            <p className="text-sm sm:text-base text-gray-600">Monitoreo ambiental NASA + Comunidad</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            { !isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={20} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
              </div>
            </div>

            <button onClick={handleAuth} className="w-full bg-blue-500 text-white py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-blue-600 transition">
              {isLogin ? "Iniciar Sesión" : "Registrarse"}
            </button>

            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">O</span></div>
            </div>

            <button onClick={handleAnonymous} className="w-full bg-gray-100 text-gray-700 py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-gray-200 transition">
              Continuar como Anónimo
            </button>
          </div>

          <div className="mt-4 sm:mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:text-blue-700 text-sm sm:text-base font-medium">
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>

          <div className="mt-6 text-center text-sm">
            {/* acceso rápido a meteo antes de login (útil para debug) */}
            <a className="underline text-blue-600" href="/meteo">Ver Detalles Meteorológicos</a>
            <span className="mx-2">•</span>
            <a className="underline text-blue-600" href="/meteo/debug">Debug /api/meteo</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen-safe bg-gray-100 flex flex-col">
      <div className="bg-white shadow-md sticky top-0 z-40 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="bg-blue-500 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <Wind className="text-white" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">FullCleanAirs</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                <Users size={10} className="flex-shrink-0" />
                <span className="truncate">{[...nasaEvents, ...nasaFires, ...userReports].filter(e => getReportTrust(e) !== "hidden").length} eventos{!loadingNasa && ` • ${nasaFires.length} NASA`}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* enlaces rápidos a meteo */}
            <a href="/meteo" className="hidden sm:inline text-blue-600 hover:underline text-sm">Clima</a>

            <button
              onClick={() => setShowEventsList(true)}
              className="lg:hidden p-2 sm:p-2.5 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
            >
              <Menu className="text-blue-600" size={20} />
            </button>
            <button onClick={() => setUser(null)} className="text-gray-700 hover:text-gray-900 text-sm sm:text-base font-medium px-2 sm:px-3">
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="relative order-2 lg:order-1 lg:flex-1 h-[60vh] sm:h-[65vh] lg:h-auto min-h-[400px]">
          <MapView
            events={[...nasaEvents, ...nasaFires, ...userReports].filter(e => getReportTrust(e) !== "hidden")}
            onEventClick={setSelectedReport}
            userLocation={userLocation}
          />

          <button
            onClick={() => setShowReportModal(true)}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 sm:p-4 shadow-2xl transition-all z-[1000]"
          >
            <Plus size={24} className="sm:hidden" />
            <Plus size={32} className="hidden sm:block" />
          </button>

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

        <div className="hidden lg:block w-80 xl:w-96 bg-white shadow-xl overflow-y-auto order-1 lg:order-2 flex-shrink-0">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-800">Eventos Activos</h2>
            <p className="text-xs text-gray-500 mt-1">Satélite + Comunidad</p>
          </div>

          <div className="divide-y">
            {[...nasaEvents, ...nasaFires, ...userReports].filter(e => getReportTrust(e) !== "hidden").map((event) => {
              const eventType = reportTypes[event.type];
              const Icon = eventType.icon;
              const trust = getReportTrust(event);
              const isNASA = event.source === "nasa" || event.source === "nasa-firms";
              return (
                <div
                  key={event.id}
                  className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition ${trust === "disputed" ? "bg-yellow-50" : ""}`}
                  onClick={() => setSelectedReport(event)}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`${eventType.color} rounded-full p-1.5 sm:p-2 flex-shrink-0 relative`}>
                      <Icon className="text-white" size={18} />
                      {trust === "verified" && (
                        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-green-500 rounded-full w-3 h-3 sm:w-4 sm:h-4 border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className={`font-semibold ${eventType.textColor} text-sm`}>{eventType.label}</h3>
                        {isNASA && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">NASA</span>}
                        {trust === "disputed" && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">Disputa</span>}
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

        {/* Sheet móvil */}
        {showEventsList && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowEventsList(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Eventos Activos</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{[...nasaEvents, ...nasaFires, ...userReports].filter(e => getReportTrust(e) !== "hidden").length} eventos</p>
                  </div>
                  <button onClick={() => setShowEventsList(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="divide-y overflow-y-auto flex-1">
                {[...nasaEvents, ...nasaFires, ...userReports].filter(e => getReportTrust(e) !== "hidden").map((event) => {
                  const eventType = reportTypes[event.type];
                  const Icon = eventType.icon;
                  const trust = getReportTrust(event);
                  const isNASA = event.source === "nasa" || event.source === "nasa-firms";
                  return (
                    <div
                      key={event.id}
                      className={`p-4 active:bg-gray-100 cursor-pointer transition ${trust === "disputed" ? "bg-yellow-50" : ""}`}
                      onClick={() => { setSelectedReport(event); setShowEventsList(false); }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${eventType.color} rounded-full p-2 flex-shrink-0`}>
                          <Icon className="text-white" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold ${eventType.textColor} text-sm`}>{eventType.label}</h3>
                            {isNASA && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">NASA</span>}
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

      {/* Modal crear reporte */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[1001]">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Nuevo Reporte</h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Tipo de evento</label>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3">
                  {Object.entries(reportTypes).map(([key, type]) => {
                    const Icon = type.icon;
                    const active = newReport.type === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewReport({ ...newReport, type: key })}
                        className={`p-2.5 sm:p-3 rounded-lg border-2 transition ${active ? `${type.color} border-transparent text-white` : "border-gray-200"}`}
                      >
                        <Icon className={active ? "text-white mx-auto" : "text-gray-600 mx-auto"} size={20} />
                        <p className={`text-xs mt-1 font-medium truncate ${active ? "text-white" : "text-gray-700"}`}>{type.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe lo que observas..."
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 border rounded-lg p-3">
                {isLoadingLocation ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    <p className="text-sm text-blue-800">Obteniendo tu ubicación...</p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-800 flex items-center gap-1.5">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="truncate">Ubicación: <strong>{userLocation.city}</strong></span>
                  </p>
                )}
              </div>

              <button
                onClick={handleCreateReport}
                disabled={!newReport.type || !newReport.description}
                className="w-full bg-blue-500 text-white py-3.5 sm:py-4 rounded-lg font-semibold hover:bg-blue-600 transition disabled:bg-gray-300"
              >
                Publicar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[1001]">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className={`${reportTypes[selectedReport.type].color} rounded-full p-2 sm:p-3 flex-shrink-0`}>
                  {React.createElement(reportTypes[selectedReport.type].icon, { className: "text-white", size: 22 })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className={`text-lg sm:text-xl font-bold ${reportTypes[selectedReport.type].textColor}`}>{reportTypes[selectedReport.type].label}</h2>
                    {(selectedReport.source === "nasa" || selectedReport.source === "nasa-firms") && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">NASA</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{getTimeAgo(selectedReport.time)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Descripción</h3>
                <p className="text-sm sm:text-base text-gray-600">{selectedReport.description}</p>
              </div>

              {(selectedReport.source === "nasa" || selectedReport.source === "nasa-firms") ? (
                <div className="bg-blue-50 border rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">Verificado por NASA</p>
                  {selectedReport.brightness && (
                    <p className="text-xs text-blue-600 mt-1">
                      Brillo: {selectedReport.brightness}K | Confianza: {selectedReport.confidence}%
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 border">
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
                          setSelectedReport({ ...selectedReport, confirmations: selectedReport.confirmations + 1 });
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm"
                      >
                        ✓ Confirmar
                      </button>
                      <button
                        onClick={() => {
                          handleReportFalse(selectedReport.id);
                          setSelectedReport({ ...selectedReport, falseReports: selectedReport.falseReports + 1 });
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm"
                      >
                        ✗ Es falso
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-100 border rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-sm text-gray-700">
                        {userVotes[selectedReport.id] === "confirmed" ? "✓ Ya confirmaste" : "✗ Ya reportaste"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Ubicación</h3>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span className="text-xs sm:text-sm text-gray-700 truncate">
                    {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

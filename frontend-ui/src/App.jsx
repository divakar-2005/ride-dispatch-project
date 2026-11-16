import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin, Navigation, Activity, Users, CheckCircle2,
  AlertCircle, Search, Clock, Zap, Globe, Wifi
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// ── Fix leaflet default marker icons ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Custom Driver Icons ────────────────────────────────────────────────────
const createDriverIcon = (status) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="w-8 h-8 rounded-full border-2 ${
    status === 'available'
      ? 'border-emerald-500 bg-emerald-500/20'
      : 'border-rose-500 bg-rose-500/20'
  } flex items-center justify-center shadow-lg">
    <div class="w-3 h-3 rounded-full ${
      status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
    }"></div>
  </div>`,
  iconSize:   [32, 32],
  iconAnchor: [16, 16],
});

const userIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="w-10 h-10 rounded-full border-4 border-indigo-500 bg-indigo-500/30 flex items-center justify-center shadow-2xl">
    <div class="w-4 h-4 rounded-full bg-indigo-400"></div>
  </div>`,
  iconSize:   [40, 40],
  iconAnchor: [20, 20],
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

// ── API base URL — reads from env or falls back to local ──────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [drivers,    setDrivers]    = useState([]);
  const [userLoc,    setUserLoc]    = useState({ lat: 28.6139, lng: 77.2090 });
  const [activeRide, setActiveRide] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [inputLat,   setInputLat]   = useState('28.6139');
  const [inputLng,   setInputLng]   = useState('77.2090');
  const [apiStatus,  setApiStatus]  = useState('checking');
  const scrollRef = useRef(null);

  const [logs, setLogs] = useState([
    { id: 1, text: 'System initialised. Connecting to Dispatch API…', time: new Date().toLocaleTimeString(), type: 'system' },
    { id: 2, text: `API endpoint: ${API_BASE}`, time: new Date().toLocaleTimeString(), type: 'system' },
  ]);

  const addLog = (text, type = 'info') =>
    setLogs(prev => [...prev, { id: Date.now(), text, time: new Date().toLocaleTimeString(), type }]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  // Health check on mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(() => { setApiStatus('online'); addLog('✅ Connected to Dispatch API — Ready.', 'success'); })
      .catch(() => { setApiStatus('offline'); addLog('⚠️ API offline — using AWS fallback.', 'error'); });
  }, []);

  // Haversine distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  };

  const sortedDrivers = useMemo(() =>
    [...drivers]
      .map(d => ({ ...d, distance: parseFloat(getDistance(userLoc.lat, userLoc.lng, d.latitude || d.lat, d.longitude || d.lng)) }))
      .sort((a, b) => a.distance - b.distance),
    [drivers, userLoc]
  );

  // ── Find Nearby Drivers ──────────────────────────────────────────────────
  const fetchDrivers = async () => {
    setIsSearching(true);
    addLog(`📡 Broadcasting dispatch request… [${inputLat}, ${inputLng}]`, 'search');

    const tryFetch = async (url, body) => {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    try {
      let data;
      try {
        // Try local backend first
        data = await tryFetch(`${API_BASE}/dispatch`, { user_lat: parseFloat(inputLat), user_lon: parseFloat(inputLng) });
      } catch {
        // Fallback to AWS API Gateway
        addLog('Local API unavailable — switching to AWS Gateway…', 'system');
        const awsRes = await tryFetch(
          'https://pvmpz4oexb.execute-api.us-east-1.amazonaws.com/dispatch',
          { user_lat: parseFloat(inputLat), user_lon: parseFloat(inputLng) }
        );
        data = awsRes.body ? JSON.parse(awsRes.body) : awsRes;
      }

      const nearest = Array.isArray(data.nearest_drivers) ? data.nearest_drivers : [];
      setDrivers(nearest.map(d => ({
        driver_id:   d.driver_id || d.id || 'Unknown',
        latitude:    Number(d.latitude  || d.lat)  || 0,
        longitude:   Number(d.longitude || d.lng)  || 0,
        distance_km: Number(d.distance_km || d.distance) || 0,
        name:        `Driver ${d.driver_id || d.id}`,
        car:         d.car    || 'Standard Class',
        status:      d.status || 'available',
        rating:      d.rating || 4.5,
      })));
      setUserLoc({ lat: parseFloat(inputLat), lng: parseFloat(inputLng) });
      addLog(`☁️ Cloud telemetry synced — ${nearest.length} drivers found.`, 'success');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // ── Assign Driver ────────────────────────────────────────────────────────
  const handleAssign = async (driverId) => {
    addLog(`⚡ Initiating assignment for driver ${driverId}…`, 'system');
    try {
      await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assign_driver_id: driverId }),
      });
      const driver = drivers.find(d => d.driver_id === driverId);
      setDrivers(prev => prev.map(d => d.driver_id === driverId ? { ...d, status: 'busy' } : d));
      setActiveRide(driver);
      addLog(`✅ Driver ${driverId} → BUSY. Ride started!`, 'assign');
    } catch (err) {
      addLog(`❌ Assignment failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0E14] text-slate-100 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-20 bg-[#020617] border-r border-white/5 flex flex-col items-center py-8 gap-10">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Navigation className="text-white w-7 h-7" />
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          {[Activity, MapPin, Users, Globe].map((Icon, i) => (
            <div key={i} className={cn(
              "p-3 rounded-xl transition-all",
              i === 1 ? "bg-white/5 text-indigo-400" : "text-slate-500 hover:text-slate-300"
            )}>
              <Icon className="w-6 h-6" />
            </div>
          ))}
        </nav>
        <div className="p-3 text-slate-500"><Clock className="w-6 h-6" /></div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        {/* Active-ride overlay */}
        <AnimatePresence>
          {activeRide && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-[5000] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-3xl" />
              <div className="relative glass-panel p-10 rounded-[2.5rem] flex flex-col items-center gap-6 border-emerald-500/30 border-2">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-pulse">
                  <Navigation className="text-white w-12 h-12" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white tracking-tighter">RIDE STARTED</h2>
                  <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mt-2">
                    {activeRide.name || activeRide.driver_id} is en route
                  </p>
                </div>
                <button
                  onClick={() => setActiveRide(null)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020617] py-4 rounded-2xl font-black uppercase tracking-tighter transition-all shadow-xl shadow-emerald-500/30"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="h-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Real-Time Ride Dispatch System
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Cloud-Native · Docker · AWS · Kubernetes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" /> Live
            </div>
            <div className={cn(
              "px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2",
              apiStatus === 'online'
                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                : apiStatus === 'offline'
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : "bg-slate-500/10 border-slate-500/20 text-slate-400"
            )}>
              <Wifi className="w-4 h-4" />
              {apiStatus === 'online' ? 'Connected to Dispatch API' : apiStatus === 'offline' ? 'AWS Fallback Mode' : 'Connecting…'}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">

          {/* Map */}
          <div className="flex-[2] relative">
            <MapContainer
              center={[userLoc.lat, userLoc.lng]}
              zoom={14}
              className="h-full w-full"
              zoomControl={false}
            >
              {/* ✅ FREE OpenStreetMap tiles — no API key needed */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
              <MapUpdater center={[userLoc.lat, userLoc.lng]} />

              {/* User location */}
              <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
                <Popup>📍 Your Location</Popup>
              </Marker>

              {/* Drivers */}
              {drivers.filter(d => d.latitude && d.longitude).map((d, i) => (
                <Marker key={`${d.driver_id}_${i}`} position={[d.latitude, d.longitude]} icon={createDriverIcon(d.status)}>
                  <Popup>
                    <div className="p-1 min-w-[130px]">
                      <p className="font-bold text-sm mb-1">{d.name?.toUpperCase()}</p>
                      <p className="text-xs text-slate-400">{d.car}</p>
                      <p className="text-xs text-indigo-400 font-bold mt-1">{d.distance_km?.toFixed(2)} km away</p>
                      <span className={`text-[10px] font-bold ${d.status === 'available' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {d.status?.toUpperCase()}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Dispatch Request Panel */}
            <div className="absolute top-6 left-6 z-[1000] w-80">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" /> Dispatch Request
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Latitude</label>
                      <input value={inputLat} onChange={e => setInputLat(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Longitude</label>
                      <input value={inputLng} onChange={e => setInputLng(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>
                  <button
                    onClick={fetchDrivers} disabled={isSearching}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSearching
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Find Nearby Drivers'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 min-w-[380px] bg-[#020617] border-l border-white/5 flex flex-col">

            {/* Driver list */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Nearby Fleet</h2>
                <span className="text-xs font-bold text-indigo-400 px-2 py-1 bg-indigo-400/10 rounded-lg">
                  {drivers.filter(d => d.status === 'available').length} Available
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <AnimatePresence mode="popLayout">
                  {isSearching && (
                    <div className="p-8 text-center glass-card rounded-2xl text-indigo-400 animate-pulse">
                      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm font-bold uppercase">Finding drivers…</p>
                    </div>
                  )}
                  {!isSearching && drivers.length === 0 && (
                    <div className="p-8 text-center glass-card rounded-2xl text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No drivers found</p>
                      <p className="text-[10px] mt-1 text-slate-600 italic">Enter coordinates and click Find Nearby Drivers</p>
                    </div>
                  )}
                  {!isSearching && sortedDrivers.map((driver, i) => (
                    <motion.div
                      key={`${driver.driver_id}_${i}`}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn("glass-card p-4 rounded-2xl relative overflow-hidden",
                        i < 3 && driver.status === 'available' ? "ring-1 ring-indigo-500/50" : ""
                      )}
                    >
                      {i < 3 && driver.status === 'available' && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[10px] font-bold text-white rounded-bl-xl uppercase">
                          Hot Pick
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
                          driver.status === 'available' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{driver.name?.toUpperCase()}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              <Navigation className="w-3 h-3" /> {driver.distance_km?.toFixed(2)} km
                            </span>
                            <span>•</span>
                            <span className="truncate">{driver.car}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssign(driver.driver_id)}
                          disabled={driver.status !== 'available'}
                          className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                            driver.status === 'available'
                              ? "bg-white/10 hover:bg-white/20 text-white"
                              : "bg-rose-500/10 text-rose-500 cursor-not-allowed border border-rose-500/20"
                          )}
                        >
                          {driver.status === 'available' ? 'Assign' : 'Busy'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Telemetry logs */}
            <div className="h-[35%] bg-[#0B0E14]/50 border-t border-white/5 flex flex-col p-6 overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> RT-Telemetry Logs
              </h3>
              <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 font-mono text-[11px]">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-3">
                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                    <span className={cn("flex-1",
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'system'  ? 'text-indigo-400'  :
                      log.type === 'assign'  ? 'text-amber-400'   :
                      log.type === 'error'   ? 'text-rose-400'    : 'text-slate-400'
                    )}>
                      {log.type === 'success' && <CheckCircle2 className="inline w-3 h-3 mr-1" />}
                      {log.type === 'search'  && <Search       className="inline w-3 h-3 mr-1 animate-pulse" />}
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

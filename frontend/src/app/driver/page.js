"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, Wifi, WifiOff, Camera, CheckCircle2, AlertTriangle, Clock, MapPin, ChevronRight, ShieldCheck } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { getPendingPods } from "@/lib/offline-db";

export default function DriverDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lang, setLang] = useState("hi"); // Default to Hindi for high driver usability
  const [offlineCount, setOfflineCount] = useState(0);

  const t = {
    en: {
      driverTitle: "Driver Mobile Portal",
      driverName: "Suresh Kumar",
      driverVehicle: "Company Fleet • MH20 EL 4521",
      title: "Today's Deliveries",
      subtitle: "Tap your active trip to take or view POD photo",
      offline: "Offline Mode",
      online: "Connected",
      captureCTA: "Open Camera & Capture",
      statusVerified: "POD Verified",
      statusRetake: "Retake Required",
      statusReview: "Under Review",
      statusPending: "Ready for Capture",
      pendingUploads: "PODs saved on phone waiting for network",
      syncNow: "Sync Now",
      switchExecutive: "Go to Executive Dashboard"
    },
    hi: {
      driverTitle: "चालक मोबाइल सेवा (Driver Portal)",
      driverName: "सुरेश कुमार (Suresh Kumar)",
      driverVehicle: "कम्पनी ट्रक • MH20 EL 4521",
      title: "आज की डिलीवरी (Trips)",
      subtitle: "पीओडी फोटो खींचने के लिए अपनी ट्रिप पर टैप करें",
      offline: "ऑफ़लाइन मोड",
      online: "इंटरनेट कनेक्टेड",
      captureCTA: "कैमरा खोलें व फोटो लें",
      statusVerified: "सत्यापित (Verified)",
      statusRetake: "दोबारा फोटो लें",
      statusReview: "जांच जारी (Review)",
      statusPending: "फोटो लेना बाकी",
      pendingUploads: "पीओडी फ़ोन में सुरक्षित (नेटवर्क का इंतज़ार)",
      syncNow: "अपलोड करें",
      switchExecutive: "कार्यालय डैशबोर्ड देखें"
    }
  }[lang];

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    loadTrips();
    checkOfflineQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function loadTrips() {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/trips", {}, "mock-driver-token");
      setTrips(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkOfflineQueue() {
    const pending = await getPendingPods();
    setOfflineCount(pending.length);
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 font-sans pb-6">
      <div>
        {/* Modern App Header Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-transport-blue to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white">{t.driverName}</h1>
                <p className="text-[11px] text-slate-400 font-mono">{t.driverVehicle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "en" ? "hi" : "en")}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors shadow-sm"
              >
                {lang === "en" ? "हिंदी" : "EN"}
              </button>
              <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                isOnline 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? t.online : t.offline}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Offline Notice Banner */}
          {offlineCount > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{offlineCount} {t.pendingUploads}</span>
              </div>
              <button onClick={loadTrips} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs shadow">
                {t.syncNow}
              </button>
            </div>
          )}

          {/* Section Hero Greeting */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-4 rounded-3xl border border-slate-700/70 shadow-md">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Company A • Road Logistics</span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{t.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
          </div>

          {/* Trips Feed */}
          {loading ? (
            <div className="space-y-3 pt-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 bg-slate-800/50 animate-pulse rounded-3xl border border-slate-700/40" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-300 text-sm rounded-2xl">
              {error}
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No assigned trips currently.
            </div>
          ) : (
            <div className="space-y-3.5">
              {trips.map((trip) => {
                const isVerified = trip.pod_status === "verified";
                const isRetake = trip.pod_status === "retake_requested";
                const isReview = trip.pod_status === "needs_review";

                return (
                  <div
                    key={trip.id}
                    className="bg-slate-850 border border-slate-750 hover:border-slate-600 rounded-3xl p-5 shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {trip.trip_number}
                        </span>
                        <h3 className="font-bold text-white text-lg mt-1">{trip.customer_name}</h3>
                        <p className="text-xs text-slate-300 font-medium">{trip.goods_description}</p>
                      </div>

                      <div>
                        {isVerified && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> {t.statusVerified}
                          </span>
                        )}
                        {isRetake && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full shadow-sm animate-pulse">
                            <AlertTriangle className="w-4 h-4" /> {t.statusRetake}
                          </span>
                        )}
                        {isReview && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800 px-3 py-1 rounded-full shadow-sm">
                            <Clock className="w-4 h-4" /> {t.statusReview}
                          </span>
                        )}
                        {!isVerified && !isRetake && !isReview && (
                          <span className="text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-800/60 px-3 py-1 rounded-full">
                            {t.statusPending}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Pill Box */}
                    <div className="bg-slate-800/80 rounded-2xl p-3 my-3 text-xs grid grid-cols-2 gap-2 text-slate-300 border border-slate-700/50">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-200">
                        {trip.vehicle_number}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Exp Qty: <strong className="text-slate-200">{trip.expected_quantity} {trip.quantity_unit}</strong>
                      </div>
                      <div className="text-[11px] text-right text-slate-400">
                        LR: <span className="font-mono text-slate-200">{trip.expected_lr_number || "LR-8821"}</span>
                      </div>
                    </div>

                    {/* Touch Target Action Button */}
                    <Link
                      href={`/driver/trips/${trip.id}`}
                      className="w-full bg-gradient-to-r from-blue-600 to-transport-blue hover:from-blue-500 hover:to-blue-600 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-between text-sm shadow-md shadow-blue-900/40 active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-amber-300" />
                        <span>{t.captureCTA}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-blue-200" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Switcher & Footnote */}
      <div className="p-4 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700"
        >
          <span>🏢 {t.switchExecutive}</span>
        </Link>
      </div>
    </div>
  );
}

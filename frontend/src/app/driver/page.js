"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, Wifi, WifiOff, Camera, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { getPendingPods } from "@/lib/offline-db";

export default function DriverDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lang, setLang] = useState("en"); // 'en' | 'hi'
  const [offlineCount, setOfflineCount] = useState(0);

  const t = {
    en: {
      title: "Assigned Trips",
      subtitle: "Select a trip to capture or view POD",
      offline: "Offline Mode Active",
      online: "Online",
      captureCTA: "Capture POD",
      statusVerified: "Verified",
      statusRetake: "Retake Required",
      statusReview: "Under Review",
      statusPending: "POD Pending",
      pendingUploads: "pending uploads waiting for network",
      syncNow: "Sync Now"
    },
    hi: {
      title: "आवंटित ट्रिप (Assigned Trips)",
      subtitle: "पीओडी फोटो खींचने के लिए ट्रिप चुनें",
      offline: "ऑफ़लाइन मोड चालू है",
      online: "ऑनलाइन",
      captureCTA: "फोटो लें (Capture)",
      statusVerified: "सत्यापित (Verified)",
      statusRetake: "दोबारा फोटो लें",
      statusReview: "समीक्षा जारी",
      statusPending: "लंबित (Pending)",
      pendingUploads: "अपलोड बाकी हैं (नेटवर्क का इंतज़ार)",
      syncNow: "अभी सिंक करें"
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
    <div className="max-w-md mx-auto p-4 min-h-screen flex flex-col justify-between">
      <div>
        {/* Header Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-transport-blue" />
            <div>
              <h1 className="font-bold text-lg leading-tight">FastTrack Fleet</h1>
              <p className="text-xs text-slate-500">Driver: Suresh Kumar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="text-xs bg-slate-200 hover:bg-slate-300 font-semibold px-2 py-1 rounded"
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? t.online : t.offline}
            </div>
          </div>
        </div>

        {/* Offline Queue Notice */}
        {offlineCount > 0 && (
          <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex justify-between items-center">
            <span>{offlineCount} {t.pendingUploads}</span>
            <button onClick={loadTrips} className="bg-amber-600 text-white px-2 py-1 rounded font-medium">
              {t.syncNow}
            </button>
          </div>
        )}

        {/* Section Heading */}
        <div className="my-4">
          <h2 className="text-xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>

        {/* Trips List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-slate-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No assigned trips right now.
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const isVerified = trip.pod_status === "verified";
              const isRetake = trip.pod_status === "retake_requested";
              const isReview = trip.pod_status === "needs_review";

              return (
                <div key={trip.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-400">{trip.trip_number}</span>
                      <h3 className="font-bold text-slate-900 text-base">{trip.customer_name}</h3>
                      <p className="text-xs text-slate-600 font-medium">{trip.goods_description} • {trip.destination}</p>
                    </div>
                    <div>
                      {isVerified && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.statusVerified}
                        </span>
                      )}
                      {isRetake && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5" /> {t.statusRetake}
                        </span>
                      )}
                      {isReview && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" /> {t.statusReview}
                        </span>
                      )}
                      {!isVerified && !isRetake && !isReview && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {t.statusPending}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-500">{trip.vehicle_number}</span>
                    <Link
                      href={`/driver/trips/${trip.id}`}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {t.captureCTA}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Nav / Switch to Executive Mode for Testing */}
      <div className="pt-6 pb-2 text-center text-xs text-slate-400">
        Testing demo: <Link href="/dashboard" className="text-transport-blue underline">Switch to Billing Executive Dashboard</Link>
      </div>
    </div>
  );
}

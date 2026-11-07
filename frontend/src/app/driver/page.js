"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, Wifi, WifiOff, Camera, CheckCircle2, AlertTriangle, Clock, MapPin, ChevronRight, Volume2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { getPendingPods } from "@/lib/offline-db";

export default function DriverDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lang, setLang] = useState("hi"); // Default to Hindi
  const [offlineCount, setOfflineCount] = useState(0);

  const t = {
    hi: {
      appTitle: "कंपनी ए • ड्राइवर ऐप",
      driverName: "सुरेश कुमार",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "आज की ट्रिप (POD फोटो लें)",
      sectionHelp: "जिस ट्रिप का माल पहुँचा दिया है, उस पर नीचे बड़ा पीला बटन दबाएं।",
      captureCTA: "कैमरा खोलें व फोटो लें",
      onlineStatus: "इंटरनेट चालू",
      offlineStatus: "ऑफ़लाइन (फ़ोन में सेव होगा)",
      pendingUploads: "फोटो अपलोड बाकी हैं",
      listenHelp: "आवाज में सुनें",
      verified: "सत्यापित (OK)",
      retake: "दोबारा फोटो लें",
      review: "जांच जारी"
    },
    mr: {
      appTitle: "कंपनी ए • ड्रायव्हर ॲप",
      driverName: "सुरेश कुमार",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "आजची ट्रिप (POD फोटो घ्या)",
      sectionHelp: "माल पोहोचवल्यावर खालील मोठे पिवळे बटण दाबा.",
      captureCTA: "कॅमेरा उघडा आणि फोटो घ्या",
      onlineStatus: "इंटरनेट सुरू",
      offlineStatus: "ऑफलाइन (फोनमध्ये सेव्ह होईल)",
      pendingUploads: "फोटो अपलोड बाकी आहेत",
      listenHelp: "आवाज ऐका",
      verified: "तपासणी पूर्ण (OK)",
      retake: "पुन्हा फोटो घ्या",
      review: "तपासणी सुरू"
    },
    en: {
      appTitle: "Company A • Driver App",
      driverName: "Suresh Kumar",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "Today's Assigned Trips",
      sectionHelp: "Tap the large yellow button below to take a photo of the signed delivery receipt.",
      captureCTA: "Open Camera & Capture",
      onlineStatus: "Online",
      offlineStatus: "Offline Mode",
      pendingUploads: "Uploads Pending",
      listenHelp: "Listen Instructions",
      verified: "Verified (OK)",
      retake: "Retake Required",
      review: "Under Review"
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

  function playVoicePrompt(text, language = lang === "mr" ? "mr-IN" : "hi-IN") {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black text-white font-sans flex flex-col justify-between pb-8 select-none">
      <div>
        {/* Maximum Contrast Driver Top Header */}
        <header className="bg-zinc-900 border-b-2 border-zinc-800 p-4 sticky top-0 z-20">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-amber-400 block tracking-wide uppercase">{t.appTitle}</span>
              <h1 className="text-xl font-black text-white mt-0.5">{t.driverName}</h1>
              <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded mt-1 inline-block">
                {t.vehicleNo}
              </span>
            </div>

            {/* Language Switcher Buttons (Large Tap Targets) */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                <button
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1 text-xs font-extrabold rounded-lg ${lang === "hi" ? "bg-amber-400 text-black shadow" : "text-zinc-300"}`}
                >
                  हिंदी
                </button>
                <button
                  onClick={() => setLang("mr")}
                  className={`px-3 py-1 text-xs font-extrabold rounded-lg ${lang === "mr" ? "bg-amber-400 text-black shadow" : "text-zinc-300"}`}
                >
                  मराठी
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg ${lang === "en" ? "bg-amber-400 text-black shadow" : "text-zinc-300"}`}
                >
                  EN
                </button>
              </div>

              {/* High Contrast Network Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border-2 ${
                isOnline 
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500" 
                  : "bg-red-950 text-red-300 border-red-500 animate-pulse"
              }`}>
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{isOnline ? t.onlineStatus : t.offlineStatus}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Voice Assistant CTA Banner */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={() => playVoicePrompt(
              lang === "mr" 
                ? "नमस्कार सुरेश. ज्या ट्रिपचा माल पोहोचवला आहे, त्या ट्रिप खालील मोठे पिवळे बटण दाबून पोहोच पावतीचा फोटो घ्या." 
                : "नमस्ते सुरेश जी. जिस ट्रिप का माल पहुँचा दिया है, उस ट्रिप के नीचे बड़ा पीला बटन दबाकर रसीद का साफ़ फोटो लें।"
            )}
            className="w-full bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border-2 border-amber-400/80 rounded-2xl p-3.5 flex items-center justify-between text-left shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-black shrink-0">
                <Volume2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-black text-amber-300 block">{t.listenHelp}</span>
                <span className="text-xs text-zinc-300 font-medium">निर्देश सुनने के लिए यहाँ दबाएँ</span>
              </div>
            </div>
            <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-400/30">
              AUDIO
            </span>
          </button>
        </div>

        {/* Trips Feed */}
        <div className="p-4 space-y-5">
          <div className="pb-1">
            <h2 className="text-xl font-black text-white">{t.sectionHeading}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{t.sectionHelp}</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400">लोड हो रहा है...</div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm bg-zinc-900 rounded-3xl border border-zinc-800">
              अभी कोई ट्रिप आवंटित नहीं है।
            </div>
          ) : (
            trips.map((trip) => {
              const isVerified = trip.pod_status === "verified";
              const isRetake = trip.pod_status === "retake_requested";
              const isReview = trip.pod_status === "needs_review";

              return (
                <div
                  key={trip.id}
                  className="bg-zinc-900 border-2 border-zinc-750 rounded-3xl p-5 shadow-2xl relative"
                >
                  {/* Status Indicator (High Contrast Tag) */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-sm font-black bg-zinc-800 text-amber-300 px-3 py-1 rounded-lg border border-zinc-700">
                      {trip.trip_number}
                    </span>

                    <div>
                      {isVerified && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-black border-2 border-emerald-300">
                          <CheckCircle2 className="w-4 h-4" /> {t.verified}
                        </span>
                      )}
                      {isRetake && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500 text-white border-2 border-red-300 animate-bounce">
                          <AlertTriangle className="w-4 h-4" /> {t.retake}
                        </span>
                      )}
                      {isReview && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-zinc-700 text-amber-300 border border-zinc-600">
                          <Clock className="w-4 h-4" /> {t.review}
                        </span>
                      )}
                      {!isVerified && !isRetake && !isReview && (
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          फोटो लेना बाकी
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Route Details */}
                  <h3 className="text-2xl font-black text-white leading-tight">{trip.customer_name}</h3>
                  <div className="flex items-center gap-1.5 text-zinc-300 text-sm mt-1 font-semibold">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>गंतव्य: <strong className="text-white">{trip.destination}</strong> ({trip.goods_description})</span>
                  </div>

                  <div className="mt-3 p-3 bg-black rounded-2xl border border-zinc-800 flex justify-between text-xs font-mono text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">मात्रा (QTY)</span>
                      <span className="font-bold text-white text-sm">{trip.expected_quantity} {trip.quantity_unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block text-[10px]">बिल्टी (LR NO)</span>
                      <span className="font-bold text-amber-300 text-sm">{trip.expected_lr_number || "LR-8821"}</span>
                    </div>
                  </div>

                  {/* High Visibility Capture Action Button */}
                  <Link
                    href={`/driver/trips/${trip.id}`}
                    className="mt-4 w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-black py-4 px-5 rounded-2xl flex items-center justify-between text-base shadow-xl border-2 border-amber-300 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <Camera className="w-6 h-6 text-black stroke-[2.5]" />
                      <span className="tracking-wide text-base">{t.captureCTA}</span>
                    </div>
                    <ChevronRight className="w-6 h-6 text-black stroke-[3]" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* High Contrast Footer Link */}
      <footer className="p-4 text-center">
        <Link
          href="/dashboard"
          className="inline-block text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl"
        >
          🏢 कार्यालय डैशबोर्ड खोलें (Open Office Dashboard)
        </Link>
      </footer>
    </div>
  );
}

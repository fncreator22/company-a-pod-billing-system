"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wifi, WifiOff, Volume2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { getPendingPods } from "@/lib/offline-db";

export default function DriverDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lang, setLang] = useState("hi"); // 'hi' | 'mr' | 'en'
  const [offlineCount, setOfflineCount] = useState(0);

  const t = {
    hi: {
      appTitle: "कंपनी ए • मोटर ट्रांसपोर्ट",
      driverName: "सुरेश कुमार (ड्राइवर)",
      vehicleLabel: "गाड़ी नंबर",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "आज की डिलीवरी (ट्रिप सूची)",
      sectionHelp: "जिस पार्टी का माल खाली हो गया है, उसकी बिल्टी (LR) का फोटो खींचने के लिए नीचे बड़ा पीला बटन दबाएं।",
      captureCTA: "कैमरा चालू करें व फोटो लें",
      onlineStatus: "इंटरनेट कनेक्टेड",
      offlineStatus: "ऑफ़लाइन (फ़ोन में सुरक्षित)",
      pendingUploads: "बिल्टी अपलोड होना बाकी है",
      listenHelp: "आवाज में बोलकर समझें",
      listenSubtext: "निर्देश सुनने के लिए यहाँ छुएँ",
      verified: "पास (सत्यापित)",
      retake: "दोबारा फोटो लें",
      review: "दफ़्तर में जांच चालू",
      pending: "फोटो बाकी है",
      destinationLabel: "गंतव्य शहर",
      goodsLabel: "माल का विवरण",
      qtyLabel: "कुल मात्रा",
      lrLabel: "बिल्टी नंबर (LR)",
      switchExecutive: "दफ़्तर बिलिंग डैशबोर्ड देखें",
      loadingText: "ट्रिप लोड हो रही है..."
    },
    mr: {
      appTitle: "कंपनी ए • मोटर ट्रान्सपोर्ट",
      driverName: "सुरेश कुमार (चालक)",
      vehicleLabel: "गाडी क्रमांक",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "आजची डिलिव्हरी (फेरी यादी)",
      sectionHelp: "ज्या पार्टीचा माल खाली केला आहे, त्याच्या पावतीचा (LR) फोटो काढण्यासाठी खालील मोठे पिवळे बटण दाबा.",
      captureCTA: "कॅमेरा सुरू करा आणि फोटो घ्या",
      onlineStatus: "इंटरनेट सुरू आहे",
      offlineStatus: "ऑफलाइन (फोनमध्ये सेव्ह)",
      pendingUploads: "पावती अपलोड बाकी आहे",
      listenHelp: "आवाजात ऐका व समजून घ्या",
      listenSubtext: "सूचना ऐकण्यासाठी येथे स्पर्श करा",
      verified: "मंजूर (तपासणी पूर्ण)",
      retake: "पुन्हा फोटो काढा",
      review: "कार्यालयीन तपासणी सुरू",
      pending: "फोटो बाकी आहे",
      destinationLabel: "पोहोचण्याचे शहर",
      goodsLabel: "मालाचा तपशील",
      qtyLabel: "एकूण प्रमाण",
      lrLabel: "पावती क्रमांक (LR)",
      switchExecutive: "ऑफिस बिलिंग डॅशबोर्ड उघडा",
      loadingText: "फेरी लोड होत आहे..."
    },
    en: {
      appTitle: "Company A • Road Transport",
      driverName: "Suresh Kumar (Driver)",
      vehicleLabel: "Vehicle No",
      vehicleNo: "MH20 EL 4521",
      sectionHeading: "Today's Deliveries (Trip List)",
      sectionHelp: "Tap the large yellow button below to photograph the stamped delivery receipt (LR) after unloading.",
      captureCTA: "Open Camera & Take Photo",
      onlineStatus: "Online Connected",
      offlineStatus: "Offline (Saved locally)",
      pendingUploads: "Uploads pending sync",
      listenHelp: "Listen Spoken Voice Guide",
      listenSubtext: "Tap here to hear instructions",
      verified: "Approved & Verified",
      retake: "Retake Photo Required",
      review: "Office Review Pending",
      pending: "Capture Needed",
      destinationLabel: "Destination City",
      goodsLabel: "Cargo Description",
      qtyLabel: "Total Quantity",
      lrLabel: "Lorry Receipt (LR)",
      switchExecutive: "Switch to Office Billing Desk",
      loadingText: "Loading trips..."
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

  // Enhanced natural speech synthesis with Indian voice locale lookup and adjusted pitch/rate
  function playVoicePrompt(text, preferredLang = lang) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (preferredLang === "mr") {
      utterance.lang = "mr-IN";
      const mrVoice = voices.find(v => v.lang.startsWith("mr") || v.name.toLowerCase().includes("marathi"));
      if (mrVoice) utterance.voice = mrVoice;
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
    } else if (preferredLang === "hi") {
      utterance.lang = "hi-IN";
      const hiVoice = voices.find(v => v.lang.startsWith("hi") || v.name.toLowerCase().includes("hindi") || v.name.toLowerCase().includes("india"));
      if (hiVoice) utterance.voice = hiVoice;
      utterance.rate = 0.90;
      utterance.pitch = 1.02;
    } else {
      utterance.lang = "en-IN";
      const inVoice = voices.find(v => v.lang === "en-IN");
      if (inVoice) utterance.voice = inVoice;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
    }

    window.speechSynthesis.speak(utterance);
  }

  function handleVoiceBannerClick() {
    if (lang === "mr") {
      playVoicePrompt(
        "नमस्कार सुरेश. ज्या पार्टीचा माल खाली केला आहे, त्या गाडीच्या खालील मोठे पिवळे कॅमेरा बटण दाबून, शिक्का आणि स्वाक्षरी असलेल्या पावतीचा स्वच्छ फोटो घ्या.",
        "mr"
      );
    } else if (lang === "hi") {
      playVoicePrompt(
        "नमस्ते सुरेश जी. जिस पार्टी का माल खाली हो चुका है, उसके नीचे दिए गए बड़े पीले कैमरे वाले बटन को दबाकर, ग्राहक की मुहर और दस्तखत वाली बिल्टी का साफ़ फोटो खींचें।",
        "hi"
      );
    } else {
      playVoicePrompt(
        "Hello Suresh. Tap the large yellow camera button below for your unloaded trip, and take a clear photo of the signed and stamped delivery receipt.",
        "en"
      );
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black text-white font-sans flex flex-col justify-between pb-8 select-none">
      <div>
        {/* Maximum Contrast Driver Top Header */}
        <header className="bg-zinc-900 border-b-2 border-zinc-800 p-4 sticky top-0 z-20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Graphic Truck Vehicle Badge */}
              <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-black border-2 border-amber-300 shadow-md">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-400 block tracking-wide uppercase">{t.appTitle}</span>
                <h1 className="text-xl font-black text-white leading-tight">{t.driverName}</h1>
                <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded mt-1 inline-block border border-zinc-700">
                  {t.vehicleLabel}: <strong className="text-amber-300">{t.vehicleNo}</strong>
                </span>
              </div>
            </div>

            {/* Language Switcher Buttons (Large, Legible Tap Targets) */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700 shadow-inner">
                <button
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${lang === "hi" ? "bg-amber-400 text-black shadow-md scale-105" : "text-zinc-300"}`}
                >
                  हिंदी
                </button>
                <button
                  onClick={() => setLang("mr")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${lang === "mr" ? "bg-amber-400 text-black shadow-md scale-105" : "text-zinc-300"}`}
                >
                  मराठी
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${lang === "en" ? "bg-amber-400 text-black shadow-md scale-105" : "text-zinc-300"}`}
                >
                  EN
                </button>
              </div>

              {/* High Contrast Network Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold border-2 ${
                isOnline 
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500" 
                  : "bg-red-950 text-red-300 border-red-500 animate-pulse"
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? t.onlineStatus : t.offlineStatus}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Spoken Voice Assistant Banner */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={handleVoiceBannerClick}
            className="w-full bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between text-left shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-black shrink-0 border border-amber-300 shadow">
                <Volume2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-base font-black text-amber-300 block">{t.listenHelp}</span>
                <span className="text-xs text-zinc-300 font-medium">{t.listenSubtext}</span>
              </div>
            </div>
            <span className="text-xs bg-amber-400 text-black font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
              AUDIO
            </span>
          </button>
        </div>

        {/* Trips Feed */}
        <div className="p-4 space-y-5">
          <div className="pb-1">
            <h2 className="text-2xl font-black text-white">{t.sectionHeading}</h2>
            <p className="text-xs text-zinc-300 mt-1 font-medium">{t.sectionHelp}</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400 text-base font-bold">{t.loadingText}</div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-sm bg-zinc-900 rounded-3xl border border-zinc-800">
              {lang === "mr" ? "सध्या कोणतीही फेरी उपलब्ध नाही." : "अभी कोई ट्रिप आवंटित नहीं है।"}
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
                    <span className="font-mono text-sm font-black bg-black text-amber-400 px-3 py-1 rounded-xl border border-zinc-800">
                      {trip.trip_number}
                    </span>

                    <div>
                      {isVerified && (
                        <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-black border-2 border-emerald-300 shadow">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          <span>{t.verified}</span>
                        </span>
                      )}
                      {isRetake && (
                        <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-red-500 text-white border-2 border-red-300 shadow animate-bounce">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>
                          <span>{t.retake}</span>
                        </span>
                      )}
                      {isReview && (
                        <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-zinc-700 text-amber-300 border border-zinc-600">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <span>{t.review}</span>
                        </span>
                      )}
                      {!isVerified && !isRetake && !isReview && (
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-zinc-800 text-amber-400 border border-zinc-700">
                          {t.pending}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Route Details */}
                  <h3 className="text-2xl font-black text-white leading-tight">{trip.customer_name}</h3>
                  
                  {/* Destination Graphic Pin */}
                  <div className="flex items-center gap-2 text-zinc-200 text-sm mt-2 font-bold bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-700/60">
                    <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0 shadow">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </div>
                    <span>{t.destinationLabel}: <strong className="text-amber-300 text-base">{trip.destination}</strong></span>
                  </div>

                  {/* Quantity and LR Box */}
                  <div className="mt-3 p-3.5 bg-black rounded-2xl border-2 border-zinc-800 grid grid-cols-2 gap-3 text-xs font-mono text-zinc-300">
                    <div>
                      <span className="text-zinc-400 block text-[11px] font-sans">{t.goodsLabel} & {t.qtyLabel}</span>
                      <span className="font-bold text-white text-sm">{trip.goods_description} • {trip.expected_quantity} {trip.quantity_unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-400 block text-[11px] font-sans">{t.lrLabel}</span>
                      <span className="font-bold text-amber-400 text-base">{trip.expected_lr_number || "LR-8821"}</span>
                    </div>
                  </div>

                  {/* Physical Camera Icon Graphic Button */}
                  <Link
                    href={`/driver/trips/${trip.id}`}
                    className="mt-4 w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-black py-4 px-5 rounded-2xl flex items-center justify-between text-lg shadow-2xl border-2 border-amber-300 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Realistic Physical Camera Graphic */}
                      <div className="w-10 h-10 rounded-xl bg-black text-amber-400 flex items-center justify-center shrink-0 border border-black shadow">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="3.2"/>
                          <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                        </svg>
                      </div>
                      <span className="tracking-tight text-base font-black">{t.captureCTA}</span>
                    </div>
                    <span className="text-2xl font-black">&rarr;</span>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Switcher & Footnote */}
      <footer className="p-4 text-center">
        <Link
          href="/dashboard"
          className="inline-block text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl"
        >
          🏢 {t.switchExecutive}
        </Link>
      </footer>
    </div>
  );
}

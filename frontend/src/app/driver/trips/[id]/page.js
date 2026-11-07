"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Camera, RefreshCw, Upload, CheckCircle2, 
  AlertTriangle, ShieldCheck, Volume2, MapPin, Sparkles, 
  HelpCircle, ChevronRight, FileCheck 
} from "lucide-react";
import { fetchWithAuth, uploadPodMultipart } from "@/lib/api";
import { compressImage } from "@/lib/image-compression";
import { savePendingPod } from "@/lib/offline-db";

export default function TripCapturePage() {
  const { id } = useParams();
  const router = useRouter();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Capture & Upload State
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressedSizeKB, setCompressedSizeKB] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadTripDetail() {
      try {
        setLoading(true);
        const data = await fetchWithAuth(`/trips/${id}`, {}, "mock-driver-token");
        setTrip(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTripDetail();
  }, [id]);

  // Acquire GPS on arrival
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          console.warn("GPS acquire warning:", err.message);
          setGpsError("GPS gate stamp unavailable");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  function playVoicePrompt(text, lang = "hi-IN") {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { blob, sizeBytes } = await compressImage(file, 300);
      setCapturedBlob(blob);
      setCompressedSizeKB(Math.round(sizeBytes / 1024));
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert("Failed to process image: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitPod() {
    if (!capturedBlob || !trip) return;

    const clientUploadId = crypto.randomUUID();
    const captureTime = new Date().toISOString();

    if (!navigator.onLine) {
      await savePendingPod({
        client_upload_id: clientUploadId,
        trip_id: trip.id,
        blob: capturedBlob,
        capture_time: captureTime,
        status: "pending_upload"
      });
      playVoicePrompt("पीओडी फ़ोन में सुरक्षित हो गई है। नेटवर्क आने पर अपलोड होगी।");
      alert("You are offline. POD saved locally on this device. It will upload once you're back online!");
      router.push("/driver");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("trip_id", trip.id);
    formData.append("client_upload_id", clientUploadId);
    formData.append("capture_time", captureTime);
    formData.append("file", capturedBlob, "pod.jpg");
    if (gpsCoords) {
      formData.append("latitude", gpsCoords.latitude.toString());
      formData.append("longitude", gpsCoords.longitude.toString());
      formData.append("gps_accuracy_meters", gpsCoords.accuracy.toString());
    }

    try {
      const res = await uploadPodMultipart(formData, false);
      setUploadResult(res);

      if (res.verification_status === "verified") {
        playVoicePrompt("धन्यवाद, पीओडी सफलतापूर्वक सत्यापित हो गई है।");
      } else if (res.verification_status === "retake_requested") {
        playVoicePrompt("कृपया दोबारा फोटो लें, मुहर साफ़ नहीं दिख रही है।");
      } else if (res.verification_status === "needs_review") {
        playVoicePrompt("पीओडी जमा हो गई है, कार्यालय टीम इसकी जांच करेगी।");
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading && !trip) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen bg-slate-900 text-slate-400 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium">ट्रिप जानकारी लोड हो रही है...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen bg-slate-900 text-red-400 flex flex-col items-center justify-center">
        <AlertTriangle className="w-10 h-10 mb-2" />
        <p className="text-sm">{error}</p>
        <Link href="/driver" className="mt-4 text-xs underline text-slate-300">वापस जाएं (Back)</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 font-sans pb-6">
      <div>
        {/* Top Navbar */}
        <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/driver" className="p-2 -ml-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 border border-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-sm text-white">पीओडी फोटो कैप्चर (POD Capture)</h1>
            <span className="text-[10px] text-amber-400 font-mono">{trip?.trip_number}</span>
          </div>
          <button
            onClick={() => playVoicePrompt("कृपया डिलीवरी रसीद की साफ़ फोटो लें, जिस पर मुहर और हस्ताक्षर हों।")}
            className="p-2 text-amber-400 hover:text-amber-300 rounded-xl bg-slate-800/80 border border-slate-700"
            title="आवाज में निर्देश सुनें"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Trip Meta Card */}
          {trip && (
            <div className="bg-gradient-to-br from-slate-850 to-slate-800 rounded-3xl p-5 border border-slate-750 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Consignee Delivery</span>
                  <h2 className="text-xl font-extrabold text-white mt-0.5 leading-tight">{trip.customer_name}</h2>
                  <p className="text-xs text-slate-300 mt-1">{trip.goods_description} • {trip.destination}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                    {trip.vehicle_number}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-mono">LR: {trip.expected_lr_number || "LR-8821"}</p>
                </div>
              </div>

              {/* GPS Gate Badge */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Gate GPS Stamp:</span>
                </div>
                {gpsCoords ? (
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60 text-[11px]">
                    📍 {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px]">{gpsError || "Detecting gate..."}</span>
                )}
              </div>
            </div>
          )}

          {/* Verification Outcome Card */}
          {uploadResult ? (
            <div className="p-6 bg-slate-850 border border-slate-750 rounded-3xl text-center shadow-xl animate-in fade-in duration-300">
              {uploadResult.verification_status === "verified" && (
                <div>
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="font-extrabold text-xl text-white">सत्यापित! (POD Verified)</h3>
                  <p className="text-xs text-slate-300 mt-1.5">
                    मुहर, हस्ताक्षर और बिल्टी नंबर सत्यापित हो चुके हैं। बिलिंग के लिए तैयार है।
                  </p>
                  <button
                    onClick={() => playVoicePrompt("धन्यवाद, पीओडी सफलतापूर्वक सत्यापित हो गई है।")}
                    className="mt-4 text-xs text-emerald-300 font-bold inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-4 py-2 rounded-2xl shadow"
                  >
                    <Volume2 className="w-4 h-4" /> आवाज में सुनें (Listen)
                  </button>
                  <Link
                    href="/driver"
                    className="mt-5 block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-950/40"
                  >
                    अगली ट्रिप देखें (Back to Trips)
                  </Link>
                </div>
              )}

              {uploadResult.verification_status === "retake_requested" && (
                <div>
                  <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-amber-500/30 animate-pulse">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h3 className="font-extrabold text-xl text-white">दोबारा फोटो लें (Retake Requested)</h3>
                  <p className="text-xs text-slate-300 mt-1.5">
                    रसीद पर ग्राहक की मुहर या हस्ताक्षर साफ़ नहीं दिख रहे हैं।
                  </p>
                  <button
                    onClick={() => playVoicePrompt("कृपया दोबारा फोटो लें, मुहर साफ़ नहीं दिख रही है।")}
                    className="mt-4 text-xs text-amber-300 font-bold inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-800 px-4 py-2 rounded-2xl shadow"
                  >
                    <Volume2 className="w-4 h-4" /> आवाज में सुनें (Listen)
                  </button>
                  <button
                    onClick={() => { setUploadResult(null); setCapturedBlob(null); setPreviewUrl(null); }}
                    className="mt-5 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold py-3.5 rounded-2xl text-sm shadow-lg shadow-amber-950/40"
                  >
                    कैमरा खोलें व दोबारा फोटो लें
                  </button>
                </div>
              )}

              {uploadResult.verification_status === "needs_review" && (
                <div>
                  <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="font-extrabold text-xl text-white">कार्यालय समीक्षा (Sent for Review)</h3>
                  <p className="text-xs text-slate-300 mt-1.5">
                    शॉर्टेज या रिमार्क दर्ज हुआ है। कार्यालय टीम इसकी जांच करेगी।
                  </p>
                  <button
                    onClick={() => playVoicePrompt("पीओडी जमा हो गई है, कार्यालय टीम इसकी जांच करेगी।")}
                    className="mt-4 text-xs text-blue-300 font-bold inline-flex items-center gap-1.5 bg-blue-950/80 border border-blue-800 px-4 py-2 rounded-2xl shadow"
                  >
                    <Volume2 className="w-4 h-4" /> आवाज में सुनें (Listen)
                  </button>
                  <Link
                    href="/driver"
                    className="mt-5 block w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3.5 rounded-2xl text-sm border border-slate-700"
                  >
                    डैशबोर्ड पर वापस जाएं
                  </Link>
                </div>
              )}
            </div>
          ) : previewUrl ? (
            /* Image Preview & Submit View */
            <div className="bg-slate-850 rounded-3xl p-4 border border-slate-750 shadow-xl space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] flex items-center justify-center border border-slate-700">
                <img src={previewUrl} alt="POD Preview" className="w-full h-full object-contain" />
                <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono font-bold text-amber-300 border border-slate-750">
                  {compressedSizeKB} KB
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                <span>कंप्रेस्ड साइज: <strong className="text-slate-200">{compressedSizeKB} KB</strong> (&lt;300 KB)</span>
                <button
                  onClick={() => { setCapturedBlob(null); setPreviewUrl(null); }}
                  className="text-red-400 font-bold hover:underline"
                >
                  रद्द करें (Cancel)
                </button>
              </div>

              <button
                onClick={handleSubmitPod}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>AI जांच जारी है (Checking with AI)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>पीओडी जमा करें (Submit Stamped POD)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Big Tap Target Capture Button */
            <div className="space-y-4 pt-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gradient-to-b from-blue-600 to-transport-blue hover:from-blue-500 hover:to-blue-600 text-white rounded-3xl p-10 flex flex-col items-center justify-center gap-4 shadow-xl shadow-blue-950/60 active:scale-95 transition-all border border-blue-400/30 group"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-black tracking-wide">कैमरा खोलें (TAP TO CAPTURE)</span>
                  <span className="text-xs text-blue-100 font-medium tracking-wider uppercase mt-1 block">
                    Deliver Receipt & Lorry Receipt
                  </span>
                </div>
              </button>

              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>फोटो लेते समय ध्यान दें:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-400 pl-5 list-disc">
                  <li>ग्राहक की मुहर (Consignee Stamp) साफ़ दिखनी चाहिए।</li>
                  <li>हस्ताक्षर (Signature) और तारीख कटी हुई न हो।</li>
                  <li>कैमरे को सीधा रखें ताकि रोशनी में परछाई न आए।</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-2 text-[11px] text-slate-500 font-medium">
        Company A Road Logistics • छत्रपति संभाजीनगर
      </footer>
    </div>
  );
}

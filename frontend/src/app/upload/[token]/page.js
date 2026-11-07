"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Camera, Upload, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Volume2 } from "lucide-react";
import { compressImage } from "@/lib/image-compression";

export default function HiredDriverUploadPage() {
  const { token } = useParams();
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressedSizeKB, setCompressedSizeKB] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-acquire GPS stamp on page load (HTML5 Geolocation)
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
          setGpsError("GPS optional or unavailable");
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
      const { blob, sizeBytes } = await compressImage(file, 300);
      setCapturedBlob(blob);
      setCompressedSizeKB(Math.round(sizeBytes / 1024));
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert("Failed to process image: " + err.message);
    }
  }

  async function handleSubmitPod() {
    if (!capturedBlob) return;

    setUploading(true);
    const clientUploadId = crypto.randomUUID();
    const captureTime = new Date().toISOString();

    const formData = new FormData();
    formData.append("client_upload_id", clientUploadId);
    formData.append("capture_time", captureTime);
    formData.append("file", capturedBlob, "pod.jpg");
    if (gpsCoords) {
      formData.append("latitude", gpsCoords.latitude.toString());
      formData.append("longitude", gpsCoords.longitude.toString());
      formData.append("gps_accuracy_meters", gpsCoords.accuracy.toString());
    }

    try {
      const res = await fetch(`http://localhost:8000/api/public/upload/${token}`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setUploadResult(data);

      if (data.verification_status === "verified") {
        playVoicePrompt("धन्यवाद, पीओडी सफलतापूर्वक सत्यापित हो गई है।");
      } else if (data.verification_status === "retake_requested") {
        playVoicePrompt("कृपया दोबारा फोटो लें, मुहर साफ़ नहीं दिख रही है।");
      } else if (data.verification_status === "needs_review") {
        playVoicePrompt("पीओडी जमा हो गई है, कार्यालय टीम इसकी जांच करेगी।");
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen flex flex-col justify-between bg-slate-50 font-sans">
      <div>
        <header className="border-b border-slate-200 pb-3 mb-4 text-center">
          <h1 className="text-lg font-bold text-slate-900">POD Upload (Company A)</h1>
          <p className="text-xs text-slate-500">Fast mobile submission for hired transport partner</p>
        </header>

        {/* GPS Badge indicator */}
        <div className="mb-4 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-4 h-4 text-transport-blue" />
            <span>GPS Gate Stamp:</span>
          </div>
          {gpsCoords ? (
            <span className="font-mono text-emerald-600 font-semibold">
              {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">{gpsError || "Detecting gate..."}</span>
          )}
        </div>

        {/* Outcome Card */}
        {uploadResult ? (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center shadow-sm my-4">
            {uploadResult.verification_status === "verified" && (
              <div>
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">POD Verified!</h3>
                <p className="text-xs text-slate-500 mt-1">Stamps, signature, and LR matched. Delivery is ready for billing.</p>
                <button
                  onClick={() => playVoicePrompt("धन्यवाद, पीओडी सफलतापूर्वक सत्यापित हो गई है।")}
                  className="mt-3 text-xs text-slate-600 font-medium inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> आवाज में सुनें (Listen)
                </button>
              </div>
            )}

            {uploadResult.verification_status === "retake_requested" && (
              <div>
                <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Retake Requested</h3>
                <p className="text-xs text-slate-500 mt-1">Consignee stamp or signature was not clear in the photograph.</p>
                <button
                  onClick={() => playVoicePrompt("कृपया दोबारा फोटो लें, मुहर साफ़ नहीं दिख रही है।")}
                  className="mt-3 text-xs text-slate-600 font-medium inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" /> आवाज में सुनें (Listen)
                </button>
                <button
                  onClick={() => { setUploadResult(null); setCapturedBlob(null); setPreviewUrl(null); }}
                  className="mt-4 w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Take Another Photo (दोबारा फोटो लें)
                </button>
              </div>
            )}

            {uploadResult.verification_status === "needs_review" && (
              <div>
                <ShieldCheck className="w-14 h-14 text-blue-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">POD Submitted for Office Review</h3>
                <p className="text-xs text-slate-500 mt-1">Shortage or remark detected. Transport office is processing billing.</p>
                <button
                  onClick={() => playVoicePrompt("पीओडी जमा हो गई है, कार्यालय टीम इसकी जांच करेगी।")}
                  className="mt-3 text-xs text-slate-600 font-medium inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" /> आवाज में सुनें (Listen)
                </button>
              </div>
            )}
          </div>
        ) : previewUrl ? (
          <div className="my-4 bg-white p-3 rounded-2xl border border-slate-200">
            <img src={previewUrl} alt="Preview" className="w-full h-80 object-contain rounded-xl bg-slate-900" />
            <div className="flex justify-between items-center text-xs text-slate-500 mt-2 px-1">
              <span>Compressed: <strong className="text-slate-700">{compressedSizeKB} KB</strong></span>
              <button
                onClick={() => { setCapturedBlob(null); setPreviewUrl(null); }}
                className="text-red-500 font-semibold"
              >
                Retake
              </button>
            </div>
            <button
              onClick={handleSubmitPod}
              disabled={uploading}
              className="mt-4 w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Verifying with AI..." : "Submit POD"}
            </button>
          </div>
        ) : (
          <div className="my-8">
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
              className="w-full bg-transport-blue text-white rounded-3xl p-8 flex flex-col items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
            >
              <Camera className="w-14 h-14" />
              <div className="text-center">
                <span className="block text-xl font-bold">फोटो खींचें</span>
                <span className="text-xs opacity-90 font-medium tracking-wide">TAP TO PHOTOGRAPH POD</span>
              </div>
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-4">
              Hold camera straight over the stamped physical lorry receipt. Automatic client compression under 300 KB.
            </p>
          </div>
        )}
      </div>

      <footer className="text-center py-4 border-t border-slate-200 text-[11px] text-slate-400">
        Company A Transport • Chhatrapati Sambhajinagar
      </footer>
    </div>
  );
}

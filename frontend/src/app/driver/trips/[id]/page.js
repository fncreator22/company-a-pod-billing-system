"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, RefreshCw, Upload, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      // Run Canvas progressive compression (<300 KB)
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

    // Check online status
    if (!navigator.onLine) {
      // Save in offline IndexedDB store
      await savePendingPod({
        client_upload_id: clientUploadId,
        trip_id: trip.id,
        blob: capturedBlob,
        capture_time: captureTime,
        status: "pending_upload"
      });
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

    try {
      const res = await uploadPodMultipart(formData, false);
      setUploadResult(res);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading && !trip) {
    return <div className="max-w-md mx-auto p-4 text-center py-20 text-slate-500">Loading trip details...</div>;
  }

  if (error) {
    return <div className="max-w-md mx-auto p-4 text-red-600 py-10">{error}</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen flex flex-col justify-between">
      <div>
        {/* Top Back Link */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Link href="/driver" className="p-1 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-base text-slate-900">Capture Proof of Delivery (POD)</h1>
        </div>

        {/* Trip Meta Card */}
        {trip && (
          <div className="my-3 p-3 bg-white border border-slate-200 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400">{trip.trip_number}</span>
                <h2 className="font-bold text-slate-900 text-lg leading-tight">{trip.customer_name}</h2>
                <p className="text-xs text-slate-600">{trip.goods_description} • {trip.destination}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700">{trip.vehicle_number}</span>
                <p className="text-[11px] text-slate-400">Exp. LR: {trip.expected_lr_number || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Outcome View */}
        {uploadResult ? (
          <div className="my-6 p-5 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
            {uploadResult.verification_status === "verified" && (
              <div>
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">POD Verified!</h3>
                <p className="text-xs text-slate-500 mt-1">Stamps, signature, and LR matched. Delivery is ready for billing.</p>
              </div>
            )}

            {uploadResult.verification_status === "retake_requested" && (
              <div>
                <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Retake Requested</h3>
                <p className="text-xs text-slate-500 mt-1">Consignee stamp or signature was not clear in the photograph.</p>
                <button
                  onClick={() => { setUploadResult(null); setCapturedBlob(null); setPreviewUrl(null); }}
                  className="mt-4 w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Take Another Photo (Attempt 2 of 3)
                </button>
              </div>
            )}

            {uploadResult.verification_status === "needs_review" && (
              <div>
                <ShieldCheck className="w-14 h-14 text-blue-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Submitted for Office Review</h3>
                <p className="text-xs text-slate-500 mt-1">Document submitted with shortage remarks or notes. The billing team will inspect.</p>
              </div>
            )}

            <Link
              href="/driver"
              className="mt-6 block w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl text-xs"
            >
              Back to Assigned Trips
            </Link>
          </div>
        ) : (
          <div>
            {/* Camera / Photo Preview Zone */}
            <div className="my-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center transition-colors"
                >
                  <Camera className="w-12 h-12 text-slate-400 mb-2" />
                  <span className="font-bold text-sm text-slate-800">Tap to Take POD Photo</span>
                  <p className="text-xs text-slate-400 mt-1">Make sure stamp and signature are clearly visible</p>
                </div>
              ) : (
                <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Captured POD Preview"
                    className="w-full h-64 object-cover rounded-xl border border-slate-100"
                  />
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Compressed: <strong className="text-slate-800">{compressedSizeKB} KB</strong> (&lt; 300 KB limit)</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-transport-blue font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            {previewUrl && (
              <button
                onClick={handleSubmitPod}
                disabled={uploading}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Verifying Document...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirm & Submit POD
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

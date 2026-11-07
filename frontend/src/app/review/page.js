"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ZoomIn, ZoomOut, RefreshCw, FileText, Sparkles, Calculator } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  // Review Form Action State
  const [decision, setDecision] = useState("approved");
  const [correctedQty, setCorrectedQty] = useState("");
  const [deductionAmt, setDeductionAmt] = useState("");
  const [adjustedAmt, setAdjustedAmt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviewQueue();
  }, []);

  async function loadReviewQueue() {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/pods/review", {}, "mock-billing-token");
      setQueue(res || []);
      if (res.length > 0 && !selectedItem) {
        selectItem(res[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectItem(item) {
    setSelectedItem(item);
    const verif = item.latest_verification?.extracted_data || {};
    const trip = item.trip || {};
    setCorrectedQty(verif.delivered_quantity || trip.expected_quantity || "");
    setDeductionAmt("0");
    setAdjustedAmt(trip.trip_amount || "");
    setNotes("");
    setZoomLevel(1);
  }

  // AI-Era Automated Penalty Calculation Helper
  function applyAiPenaltyRecommendation() {
    if (!selectedItem) return;
    const trip = selectedItem.trip || {};
    const verif = selectedItem.latest_verification?.extracted_data || {};

    const expected = trip.expected_quantity || 120;
    const delivered = verif.delivered_quantity || (expected - 6);
    const shortageUnits = Math.max(0, expected - delivered);

    // Standard packaged goods shortage deduction rate: Rs 400 per carton
    const penaltyPerUnit = 400.0;
    const calculatedDeduction = shortageUnits * penaltyPerUnit;
    const recalculatedTotal = Math.max(0, trip.trip_amount - calculatedDeduction);

    setCorrectedQty(delivered);
    setDeductionAmt(calculatedDeduction.toString());
    setAdjustedAmt(recalculatedTotal.toString());
    setNotes(`AI Recommendation applied: Shortage of ${shortageUnits} ${trip.quantity_unit || 'units'} penalized at ₹${penaltyPerUnit}/unit.`);
  }

  async function handleSubmitReview() {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const podId = selectedItem.pod.id;
      const res = await fetch(`http://localhost:8000/api/pods/${podId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-billing-token"
        },
        body: JSON.stringify({
          decision,
          review_notes: notes,
          corrected_quantity: correctedQty ? parseFloat(correctedQty) : null,
          deduction_amount: deductionAmt ? parseFloat(deductionAmt) : 0,
          adjusted_billing_amount: adjustedAmt ? parseFloat(adjustedAmt) : null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Review failed");
      }

      alert(`Review decision recorded: ${decision.toUpperCase()}`);
      setSelectedItem(null);
      await loadReviewQueue();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const verifData = selectedItem?.latest_verification?.extracted_data || {};
  const groundedBoxes = verifData.grounded_boxes || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              POD Exception Review Workspace
              <span className="text-[10px] bg-transport-blue/10 text-transport-blue px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Visual Grounding
              </span>
            </h1>
            <p className="text-xs text-slate-500">Inspect original photographs with AI bounding box overlays, resolve shortages, and adjust billing.</p>
          </div>
        </div>
        <button
          onClick={loadReviewQueue}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center text-xs text-slate-400">Loading exception queue...</div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-base">Review Queue Clear!</h3>
          <p className="text-xs text-slate-500 mt-1">All submitted PODs have been processed or approved.</p>
          <Link href="/billing" className="mt-4 inline-block bg-slate-900 text-white font-semibold px-4 py-2 rounded-xl text-xs">
            Open Billing Queue &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Pending List */}
          <div className="lg:col-span-3 space-y-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Exceptions ({queue.length})</span>
            {queue.map((item) => {
              const active = selectedItem?.pod?.id === item.pod.id;
              const hasShortage = item.latest_verification?.shortage_detected;
              return (
                <div
                  key={item.pod.id}
                  onClick={() => selectItem(item)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    active ? 'bg-white border-slate-900 shadow-sm' : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-slate-400">{item.trip.trip_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasShortage ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                      {hasShortage ? "Shortage Risk" : item.pod.verification_status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{item.trip.customer_name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{item.trip.destination} • ₹{item.trip.trip_amount.toLocaleString()}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Split Screen Inspection */}
          {selectedItem && (
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              {/* Document Image Viewer with AI Bounding Boxes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Original Document</span>
                    <button
                      onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${showBoundingBoxes ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {showBoundingBoxes ? "AI Overlay: ON" : "AI Overlay: OFF"}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                      className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                      className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Canvas Container with Interactive Visual Grounding Overlay */}
                <div className="h-96 border border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center relative">
                  <div
                    style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                    className="w-full h-full relative p-4 flex flex-col justify-between"
                  >
                    {/* Simulated Document Layout */}
                    <div className="border border-slate-800 bg-slate-900 rounded p-4 h-full relative text-left">
                      <div className="border-b border-slate-800 pb-2 mb-2">
                        <span className="text-slate-400 font-mono text-[10px]">CONSIGNMENT NOTE / LR: {selectedItem.trip.expected_lr_number}</span>
                        <p className="text-slate-200 text-xs font-bold">{selectedItem.trip.customer_name}</p>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <p>Vehicle: {selectedItem.trip.vehicle_number}</p>
                        <p>Goods: {selectedItem.trip.goods_description} ({selectedItem.trip.expected_quantity} {selectedItem.trip.quantity_unit})</p>
                      </div>

                      {/* Visual Grounding Bounding Box Overlays */}
                      {showBoundingBoxes && groundedBoxes.map((box, idx) => {
                        const top = `${box.ymin * 100}%`;
                        const left = `${box.xmin * 100}%`;
                        const width = `${(box.xmax - box.xmin) * 100}%`;
                        const height = `${(box.ymax - box.ymin) * 100}%`;
                        const isShortage = box.label.toLowerCase().includes("short");

                        return (
                          <div
                            key={idx}
                            style={{ top, left, width, height }}
                            className={`absolute border-2 rounded ${
                              isShortage
                                ? 'border-red-500 bg-red-500/20 text-red-200'
                                : 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                            } text-[9px] font-bold p-1 pointer-events-none transition-all`}
                          >
                            <span className="bg-slate-900/90 px-1 py-0.5 rounded shadow">
                              {box.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extraction vs Trip Comparison & Decision Form */}
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>AI Document Analysis</span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      Confidence: {Math.round((verifData.overall_confidence || 0.85) * 100)}%
                    </span>
                  </h3>

                  <div className="my-3 space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">LR Number:</span>
                      <strong className="font-mono text-slate-800">
                        {verifData.lr_number || "Not detected"}
                        {" "}(Exp: {selectedItem.trip.expected_lr_number})
                      </strong>
                    </div>

                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">Consignee Stamp:</span>
                      <strong className={selectedItem.latest_verification?.stamp_visible ? "text-emerald-600" : "text-red-600"}>
                        {selectedItem.latest_verification?.stamp_visible ? "Detected ✓" : "Missing ✗"}
                      </strong>
                    </div>

                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">Shortage / Damage:</span>
                      <strong className={selectedItem.latest_verification?.shortage_detected ? "text-red-600 font-bold" : "text-emerald-600"}>
                        {selectedItem.latest_verification?.shortage_detected ? "Shortage Detected!" : "None Detected"}
                      </strong>
                    </div>

                    {verifData.remarks && (
                      <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium flex items-start justify-between">
                        <span>Remarks: {verifData.remarks}</span>
                        <button
                          onClick={applyAiPenaltyRecommendation}
                          className="ml-2 bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1 flex-shrink-0"
                        >
                          <Calculator className="w-3 h-3" /> Auto-Estimate Deduction
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Non-Destructive Financial Reconciliation Form */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-800">Financial Reconciliation</span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-0.5">Delivered Qty</label>
                        <input
                          type="number"
                          value={correctedQty}
                          onChange={(e) => setCorrectedQty(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-0.5">Deduction (₹)</label>
                        <input
                          type="number"
                          value={deductionAmt}
                          onChange={(e) => {
                            setDeductionAmt(e.target.value);
                            const ded = parseFloat(e.target.value) || 0;
                            setAdjustedAmt(selectedItem.trip.trip_amount - ded);
                          }}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Final Billed Amount (₹)</label>
                      <input
                        type="number"
                        value={adjustedAmt}
                        onChange={(e) => setAdjustedAmt(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Reviewer Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Reason for adjustment or retake..."
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg h-12 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                  <button
                    onClick={() => { setDecision("approved"); handleSubmitReview(); }}
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve for Billing
                  </button>

                  <button
                    onClick={() => { setDecision("request_retake"); handleSubmitReview(); }}
                    disabled={submitting || selectedItem.pod.retake_count >= 2}
                    className="px-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold py-2.5 rounded-xl text-xs flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Retake
                  </button>

                  <button
                    onClick={() => { setDecision("rejected"); handleSubmitReview(); }}
                    disabled={submitting}
                    className="px-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2.5 rounded-xl text-xs flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

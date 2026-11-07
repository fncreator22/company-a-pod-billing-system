"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Send, ArrowUpRight, TrendingDown, Clock, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedHiredTrip, setSelectedHiredTrip] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [m, t] = await Promise.all([
        fetchWithAuth("/dashboard/metrics", {}, "mock-billing-token"),
        fetchWithAuth("/trips", {}, "mock-billing-token")
      ]);
      setMetrics(m);
      setTrips(t.items || []);
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }

  function openSmsModal(trip) {
    setSelectedHiredTrip(trip);
    setSmsModalOpen(true);
    setCopied(false);
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
            Control Center • Company A
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-0.5">
            POD Delivery & Billing Operations
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Tracking 340 active fleet movements, AI gate verification, and Tally ERP billing velocity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/Company%20B"
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Client Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
          </Link>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Metric Matrix */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-zinc-500 block uppercase">Total Trips</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">{metrics.total_trips}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">Active dispatches</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-zinc-500 block uppercase">PODs Captured</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">{metrics.pods_submitted}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">Gate photos</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-amber-700 block uppercase">Missing POD</span>
            <p className="text-2xl font-bold tracking-tight text-amber-700 mt-1">{metrics.pods_pending}</p>
            <span className="text-[10px] text-amber-600/80 mt-1 block">Awaiting driver</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-zinc-700 block uppercase">In Review</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-800 mt-1">{metrics.needs_review}</p>
            <span className="text-[10px] text-zinc-500 mt-1 block">Shortage remarks</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-emerald-700 block uppercase">Ready to Bill</span>
            <p className="text-2xl font-bold tracking-tight text-emerald-700 mt-1">{metrics.billing_ready}</p>
            <span className="text-[10px] text-emerald-600/80 mt-1 block">Verified deliveries</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[11px] font-mono text-zinc-500 block uppercase">Tally Exported</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">{metrics.exported_count}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">Batched to ERP</span>
          </div>
        </div>
      )}

      {/* SLA Performance Benchmark Panel */}
      <div className="bg-zinc-900 text-zinc-200 rounded-3xl p-5 border border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                SLA Performance • POD-to-Invoice Turnaround
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Baseline: 18 days &bull; Target: 4 days &bull; Annual working capital unlock: <strong className="text-zinc-200">₹3.24 Crore</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block font-mono">Sambhajinagar (HQ)</span>
              <span className="text-sm font-bold text-emerald-400">3.2 Days <span className="text-[10px] text-zinc-500 font-normal">(-14.8d)</span></span>
            </div>
            <div className="bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block font-mono">Pune Depot</span>
              <span className="text-sm font-bold text-emerald-400">3.8 Days <span className="text-[10px] text-zinc-500 font-normal">(-14.2d)</span></span>
            </div>
            <div className="bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block font-mono">Nagpur Hub</span>
              <span className="text-sm font-bold text-amber-400">4.1 Days <span className="text-[10px] text-zinc-500 font-normal">(-13.9d)</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Trips Dispatch Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-zinc-900 text-sm tracking-tight">Active Dispatches & POD Verification State</h2>
            <p className="text-xs text-zinc-500">Live operational ledger across company and hired fleet trucks.</p>
          </div>
          <Link href="/billing" className="text-xs font-semibold text-zinc-900 hover:text-amber-600 inline-flex items-center gap-1 transition-colors">
            <span>View Billing Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-3.5">Trip ID</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Vehicle</th>
                <th className="p-3.5">Fleet</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Freight Amount</th>
                <th className="p-3.5">POD Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-zinc-900">{trip.trip_number}</td>
                  <td className="p-3.5 font-semibold text-zinc-800">{trip.customer_name}</td>
                  <td className="p-3.5 font-mono text-zinc-600">{trip.vehicle_number}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold ${
                      trip.vehicle_type === 'hired' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {trip.vehicle_type}
                    </span>
                  </td>
                  <td className="p-3.5 text-zinc-600">{trip.destination}</td>
                  <td className="p-3.5 font-mono font-semibold text-zinc-900">₹{trip.trip_amount.toLocaleString()}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      trip.pod_status === 'verified' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      trip.pod_status === 'retake_requested' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      trip.pod_status === 'needs_review' ? 'bg-zinc-100 text-zinc-800 border border-zinc-300' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {trip.pod_status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {trip.pod_status === 'retake_requested' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      {trip.pod_status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {trip.vehicle_type === 'hired' ? (
                      <button
                        onClick={() => openSmsModal(trip)}
                        className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Simulate SMS</span>
                      </button>
                    ) : (
                      <Link
                        href={`/driver/trips/${trip.id}`}
                        className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:underline"
                      >
                        Capture View &rarr;
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated SMS Modal */}
      {smsModalOpen && selectedHiredTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 animate-in fade-in duration-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold block">
              Simulated SMS Dispatch
            </span>
            <h3 className="font-bold text-base text-zinc-900 mt-1">Hired Driver Upload Token</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Dispatched to {selectedHiredTrip.vendor_name || 'Driver'} for trip <strong className="text-zinc-800">{selectedHiredTrip.trip_number}</strong>.
            </p>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl mb-4 text-xs font-mono text-zinc-800 break-all select-all">
              http://localhost:3000/upload/hired-driver-token-141
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("http://localhost:3000/upload/hired-driver-token-141");
                  setCopied(true);
                }}
                className="flex-1 bg-zinc-900 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-zinc-800 transition-colors"
              >
                {copied ? "Copied to Clipboard!" : "Copy Upload Link"}
              </button>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="px-4 py-2.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

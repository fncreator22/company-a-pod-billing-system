"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Send } from "lucide-react";
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
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">POD Operations Dashboard</h1>
          <p className="text-xs text-slate-500">Real-time status of road deliveries, verification exceptions, and billing.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total Trips</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_trips}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">PODs Submitted</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pods_submitted}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Pending (Missing)</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.pods_pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-blue-600">Under Review</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.needs_review}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Billing Ready</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.billing_ready}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-600">Exported</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.exported_count}</p>
            </div>
          </div>

          {/* Regional Branch POD-to-Invoice SLA Benchmark Tracker */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Branch SLA Performance</span>
              <h3 className="font-bold text-sm mt-0.5">POD-to-Invoice Turnaround Time by Hub</h3>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-slate-300 block text-[10px]">Chhatrapati Sambhajinagar (HQ)</span>
                <span className="font-bold text-emerald-400">3.2 Days <span className="text-[10px] text-slate-300 font-normal">(-14.8d vs baseline)</span></span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-slate-300 block text-[10px]">Pune Depot</span>
                <span className="font-bold text-emerald-400">3.8 Days <span className="text-[10px] text-slate-300 font-normal">(-14.2d)</span></span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-slate-300 block text-[10px]">Nagpur Hub</span>
                <span className="font-bold text-amber-400">4.1 Days <span className="text-[10px] text-slate-300 font-normal">(-13.9d)</span></span>
              </div>
              <Link
                href="/portal/Company%20B"
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                Client Portal Link &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-sm">Active Fleet Trips & POD Status</h2>
          <Link href="/billing" className="text-xs text-blue-600 hover:underline font-semibold">
            View Billing Queue &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-3">Trip ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Type</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900">{trip.trip_number}</td>
                  <td className="p-3 font-medium">{trip.customer_name}</td>
                  <td className="p-3 font-mono">{trip.vehicle_number}</td>
                  <td className="p-3 capitalize">{trip.vehicle_type}</td>
                  <td className="p-3">{trip.destination}</td>
                  <td className="p-3 font-semibold">₹{trip.trip_amount.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      trip.pod_status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                      trip.pod_status === 'retake_requested' ? 'bg-amber-50 text-amber-700' :
                      trip.pod_status === 'needs_review' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {trip.pod_status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {trip.vehicle_type === 'hired' ? (
                      <button
                        onClick={() => openSmsModal(trip)}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1 rounded-md"
                      >
                        <Send className="w-3 h-3" /> Simulate SMS
                      </button>
                    ) : (
                      <Link
                        href={`/driver/trips/${trip.id}`}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        View Capture
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated SMS Dispatch Modal */}
      {smsModalOpen && selectedHiredTrip && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-base text-slate-900 mb-1">Simulated Hired Driver SMS</h3>
            <p className="text-xs text-slate-500 mb-4">
              Link dispatched for trip <strong className="text-slate-800">{selectedHiredTrip.trip_number}</strong> to {selectedHiredTrip.vendor_name || 'Driver'}.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs font-mono text-slate-700 break-all">
              http://localhost:3000/upload/hired-driver-token-141
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("http://localhost:3000/upload/hired-driver-token-141");
                  setCopied(true);
                }}
                className="flex-1 bg-slate-900 text-white font-semibold py-2 rounded-xl text-xs hover:bg-slate-800 transition-colors"
              >
                {copied ? "Copied Link!" : "Copy Upload Link"}
              </button>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
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

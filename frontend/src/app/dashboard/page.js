"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, FileText, CheckCircle2, AlertCircle, RefreshCw, Download, Send, UploadCloud } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 p-5 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-2 mb-8 text-white font-bold text-lg">
            <LayoutDashboard className="w-6 h-6 text-transport-blue" />
            <span>FastTrack POD</span>
          </div>

          <nav className="space-y-1.5 text-sm font-medium">
            <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 bg-slate-800 text-white rounded-lg">
              <LayoutDashboard className="w-4 h-4" /> Operational Dashboard
            </Link>
            <Link href="/review" className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg">
              <FileText className="w-4 h-4" /> Exception Review Queue
            </Link>
            <Link href="/billing" className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg">
              <Download className="w-4 h-4" /> Billing Queue & Export
            </Link>
            <Link href="/trips/import" className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg">
              <UploadCloud className="w-4 h-4" /> Import Trips (CSV)
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Billing Executive</p>
          <p>Rajesh Sharma</p>
          <Link href="/driver" className="mt-3 block text-transport-blue hover:underline">
            Switch to Mobile Driver App &rarr;
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">POD Operations Dashboard</h1>
            <p className="text-xs text-slate-500">Real-time status of road deliveries, verification exceptions, and billing.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
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
        )}

        {/* Trips Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-sm">Active Fleet Trips & POD Status</h2>
            <Link href="/billing" className="text-xs text-transport-blue hover:underline font-semibold">
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
                          className="text-xs text-transport-blue hover:underline font-semibold"
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
      </main>

      {/* Simulated SMS Dispatch Modal */}
      {smsModalOpen && selectedHiredTrip && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-base text-slate-900 mb-1">Simulated Hired Driver SMS</h3>
            <p className="text-xs text-slate-500 mb-4">
              Link dispatched for trip <strong className="text-slate-800">{selectedHiredTrip.trip_number}</strong> to {selectedHiredTrip.vendor_name || 'Driver'}.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs font-mono text-slate-700 break-all">
              https://transport-pod.app/upload/hired-driver-token-141
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("https://transport-pod.app/upload/hired-driver-token-141");
                  setCopied(true);
                }}
                className="flex-1 bg-slate-900 text-white font-semibold py-2 rounded-xl text-xs"
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, CheckCircle2, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function BillingQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadBillingQueue();
  }, []);

  async function loadBillingQueue() {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/billing/queue", {}, "mock-billing-token");
      setItems(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportTallyCsv() {
    try {
      setExporting(true);
      const res = await fetch("http://localhost:8000/api/billing/export", {
        headers: { Authorization: "Bearer mock-billing-token" }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tally_pod_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Reload queue to show updated exported statuses
      await loadBillingQueue();
    } catch (err) {
      alert("Failed to export: " + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Billing Queue & Tally Export</h1>
            <p className="text-xs text-slate-500">Verified and executive-approved POD deliveries ready for billing.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBillingQueue}
            className="p-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportTallyCsv}
            disabled={exporting || items.length === 0}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Generating CSV..." : "Download Tally CSV Export"}
          </button>
        </div>
      </div>

      {/* Billing Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading verified deliveries...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No deliveries ready for billing yet. Review and approve PODs to add them here.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-3">Trip #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">LR / Challan #</th>
                <th className="p-3">Delivered Qty</th>
                <th className="p-3">Original Amt</th>
                <th className="p-3">Deduction</th>
                <th className="p-3">Final Billed Amt</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.trip_id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900">{item.trip_number}</td>
                  <td className="p-3 font-medium">{item.customer_name}</td>
                  <td className="p-3 font-mono">{item.vehicle_number}</td>
                  <td className="p-3 font-mono">{item.lr_number || "N/A"}</td>
                  <td className="p-3">{item.delivered_quantity ? `${item.delivered_quantity} ${item.quantity_unit}` : "N/A"}</td>
                  <td className="p-3">₹{item.original_amount.toLocaleString()}</td>
                  <td className="p-3 text-red-600 font-medium">{item.deduction_amount > 0 ? `-₹${item.deduction_amount.toLocaleString()}` : "₹0"}</td>
                  <td className="p-3 font-bold text-slate-900">₹{item.final_billed_amount.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      item.billing_status === 'exported' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.billing_status === 'exported' ? 'Exported' : 'Billing Ready'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

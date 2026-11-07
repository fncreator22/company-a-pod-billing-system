"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export default function TripImportPage() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    setImporting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/trips/import", {
        method: "POST",
        headers: { Authorization: "Bearer mock-billing-token" },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setResult(data);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Import Daily Operational Trips</h1>
        <p className="text-xs text-slate-500">Upload enterprise CSV dispatch schedule to populate active trips.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleUpload}>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer mb-4">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={importing || !file}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50"
          >
            {importing ? "Processing CSV..." : "Import Trips CSV"}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Import Summary
            </h4>
            <p className="text-emerald-700 font-medium">✓ Successfully Imported: {result.imported_count} trips</p>
            <p className="text-slate-500">↷ Skipped (Duplicates): {result.skipped_count} trips</p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-red-600">
                <span className="font-bold">Errors:</span>
                <ul className="list-disc pl-4 mt-1">
                  {result.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

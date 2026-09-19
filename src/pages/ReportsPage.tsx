import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  CheckCircle2,
  PieChart,
  BarChart,
  Database,
  Pill,
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-600" />
            Inventory Reports & Data Export
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Export structured pharmaceutical records to CSV and Excel (XLSX) for compliance and auditing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Summary</span>
          </button>

          <a
            id="export-csv-btn"
            href={api.getExportCsvUrl()}
            download="medscan_inventory.csv"
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <a
            id="export-xlsx-btn"
            href={api.getExportXlsxUrl()}
            download="medscan_inventory.xlsx"
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Summary Stat Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Export Data Scope</h4>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalScanned ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total medicine records ready for export</p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-teal-700 font-medium">
            Includes batch numbers, expiry dates, MRP, active compositions
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Compliance Status</h4>
          <div className="space-y-1 mt-2 text-xs">
            <div className="flex justify-between font-medium">
              <span className="text-emerald-700">Valid Stock:</span>
              <span className="font-bold">{stats?.valid ?? 0}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-amber-700">Expiring in ≤30d:</span>
              <span className="font-bold">{stats?.expiringSoon ?? 0}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-rose-700">Expired:</span>
              <span className="font-bold">{stats?.expired ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audited Sessions</h4>
          <p className="text-2xl font-bold text-teal-900">{stats?.totalScanSessions ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total physical scanning events recorded</p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Backed by persistent SQLite transaction storage
          </div>
        </div>
      </div>

      {/* Export Schema Information */}
      <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-600" />
          Exported Schema Specification
        </h3>
        <p className="text-xs text-slate-600">
          The generated CSV/Excel file maps strictly to medical package intelligence standards with the following headers:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            'ID / Record No.',
            'Scan ID Session',
            'Medicine Name',
            'Product Type',
            'Active Ingredient',
            'Strength / Dosage',
            'General Indication',
            'Brand Name',
            'Manufacturer',
            'Batch Number',
            'Manufacturing Date',
            'Expiry Date',
            'MRP (Price)',
            'Quantity / Units',
            'Pack Size',
            'Rx / OTC Status',
            'Expiry Status',
            'Scanned Timestamp',
          ].map((col, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-100 text-teal-950 font-medium">
              {col}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

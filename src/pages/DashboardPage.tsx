import React, { useEffect, useState } from 'react';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  Pill,
} from 'lucide-react';
import { DashboardStats, MedicineRecord } from '../types';
import { api } from '../services/api';
import { getStatusBadgeInfo, formatDate } from '../utils/formatters';

interface DashboardPageProps {
  onScanClick: () => void;
  onViewRecord: (record: MedicineRecord) => void;
  onViewAllRecords: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onScanClick,
  onViewRecord,
  onViewAllRecords,
}) => {
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
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 rounded-full bg-teal-600/60 px-3 py-1 text-xs font-semibold text-teal-100 backdrop-blur-xs border border-teal-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-200" />
            <span>AI Multimodal Vision Engine Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome to MedScan AI
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-teal-100/90 leading-relaxed">
            Turn medicine package images into structured digital records. Extract active ingredients, batch numbers, manufacturing/expiry dates, and track inventory safely.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              id="dashboard-main-scan-cta"
              onClick={onScanClick}
              className="inline-flex items-center space-x-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-teal-900 shadow-sm hover:bg-teal-50 transition-all active:scale-95"
            >
              <ScanLine className="w-4 h-4 text-teal-700" />
              <span>Scan Medicine Now</span>
            </button>
            <button
              onClick={onViewAllRecords}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-teal-600/40 hover:bg-teal-600/60 px-4 py-2.5 text-sm font-semibold text-white border border-teal-400/40 transition-colors"
            >
              <span>View All Records</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative Background Pattern */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-teal-500/20 blur-2xl" />
        <div className="pointer-events-none absolute right-12 top-4 w-40 h-40 rounded-full bg-emerald-400/10 blur-xl" />
      </div>

      {/* Safety Notice Strip */}
      <div className="flex items-center space-x-3 px-4 py-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Medical Safety Notice:</strong> MedScan AI extracts information from medicine packaging and is not a substitute for professional medical advice.
        </span>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scanned */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats?.totalScanned ?? 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Medicine packages cataloged</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Valid */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valid</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">
              {loading ? '...' : stats?.valid ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">Safely within shelf-life</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring Soon</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">
              {loading ? '...' : stats?.expiringSoon ?? 0}
            </h3>
            <p className="text-[11px] text-amber-600 mt-0.5">Within 30 days remaining</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Expired */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-1">
              {loading ? '...' : stats?.expired ?? 0}
            </h3>
            <p className="text-[11px] text-rose-600 mt-0.5">Requires disposal or review</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Useful Simple Charts / Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Product Type Distribution */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              Medicines by Product Type
            </h4>
            <span className="text-xs text-slate-400 font-medium">Ratio</span>
          </div>

          {stats && stats.totalScanned > 0 && Object.keys(stats.byProductType).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(stats.byProductType).map(([type, count]) => {
                const pct = Math.round((count / (stats.totalScanned || 1)) * 100);
                return (
                  <div key={type} className="text-xs">
                    <div className="flex justify-between font-medium text-slate-700 mb-1">
                      <span>{type}</span>
                      <span className="font-semibold text-teal-800">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-500">No products scanned</p>
              <p className="text-[11px] text-slate-400 mt-1">Product type ratio will appear once you scan products.</p>
            </div>
          )}
        </div>

        {/* Expiry Status Distribution */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Expiry Status Ratio
            </h4>
            <span className="text-xs text-slate-400 font-medium">Shelf-life</span>
          </div>

          {stats && stats.totalScanned > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Valid (Safe)', count: stats.valid, color: 'bg-emerald-500', text: 'text-emerald-700' },
                { label: 'Expiring Soon (≤30 days)', count: stats.expiringSoon, color: 'bg-amber-500', text: 'text-amber-700' },
                { label: 'Expired', count: stats.expired, color: 'bg-rose-500', text: 'text-rose-700' },
                { label: 'Unknown Date', count: stats.unknown, color: 'bg-slate-400', text: 'text-slate-600' },
              ].map((item) => {
                const total = stats.totalScanned || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label} className="text-xs">
                    <div className="flex justify-between font-medium text-slate-700 mb-1">
                      <span>{item.label}</span>
                      <span className={`font-semibold ${item.text}`}>{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-500">No products scanned</p>
              <p className="text-[11px] text-slate-400 mt-1">Expiry ratio breakdown will appear once you scan products.</p>
            </div>
          )}
        </div>

        {/* Scan Activity */}
        <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Scan History Activity
              </h4>
              <span className="text-xs text-slate-400 font-medium">Timeline</span>
            </div>

            {stats && stats.totalScanSessions > 0 && Object.keys(stats.activityByDate).length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-3">
                  Total of <strong>{stats.totalScanSessions}</strong> scanning sessions recorded date-wise.
                </p>
                {Object.entries(stats.activityByDate).slice(0, 4).map(([date, cnt]) => (
                  <div key={date} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {date}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold">
                      {cnt} {cnt === 1 ? 'scan' : 'scans'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <p className="font-medium text-slate-500">No scan history</p>
                <p className="text-[11px] text-slate-400 mt-1">Chronological sessions will appear once you scan products.</p>
              </div>
            )}
          </div>

          <button
            onClick={onScanClick}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors flex items-center justify-center space-x-1.5"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Launch Image Scanner</span>
          </button>
        </div>
      </div>

      {/* Recent Scans Section */}
      <div className="rounded-2xl bg-white border border-teal-100/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/30">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Scans</h3>
            <p className="text-xs text-slate-500">Chronological history of recently extracted medicines</p>
          </div>
          <button
            id="view-all-scans-btn"
            onClick={onViewAllRecords}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table or Empty State */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading recent scans...</div>
          ) : stats && stats.recentRecords.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">MRP</th>
                  <th className="py-3 px-4">Scan Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentRecords.map((r) => {
                  const statusInfo = getStatusBadgeInfo(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center shrink-0">
                            <Pill className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs">{r.medicineName}</p>
                            {r.generalIndication ? (
                              <p className="text-[11px] text-teal-700 truncate max-w-[180px] sm:max-w-xs" title={r.generalIndication}>
                                <span className="font-medium text-slate-500">Used for:</span> {r.generalIndication}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-mono">{r.scanId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{r.productType}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{r.batchNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-teal-950">{r.expiryDate}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{r.mrp}</td>
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(r.scannedAt)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-semibold text-[11px] border ${statusInfo.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`view-detail-btn-${r.id}`}
                          onClick={() =>
                            onViewRecord({
                              id: r.id,
                              scanId: r.scanId,
                              medicineName: r.medicineName,
                              productType: r.productType,
                              batchNumber: r.batchNumber,
                              expiryDate: r.expiryDate,
                              mrp: r.mrp,
                              status: r.status,
                              activeIngredient: null,
                              strength: null,
                              generalIndication: null,
                              brandName: null,
                              manufacturer: null,
                              manufacturingDate: null,
                              quantity: null,
                              packSize: null,
                              prescriptionStatus: null,
                              confidence: {},
                              scannedAt: r.scannedAt,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-600 rounded-lg border border-teal-200 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Pill className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No medicine scans yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload or capture your first medicine package to begin</p>
              <button
                onClick={onScanClick}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs hover:bg-teal-700"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Start First Scan</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

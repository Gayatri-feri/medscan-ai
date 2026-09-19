import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  Layers,
  Trash2,
  Eye,
  Pill,
  Clock,
  Filter,
} from 'lucide-react';
import { ScanItem, MedicineRecord } from '../types';
import { api } from '../services/api';
import { formatDateTime, getStatusBadgeInfo } from '../utils/formatters';
import { MedicineDetailModal } from '../components/MedicineDetailModal';

interface ScanHistoryPageProps {
  onScanNew: () => void;
}

export const ScanHistoryPage: React.FC<ScanHistoryPageProps> = ({ onScanNew }) => {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Modals
  const [activeMedicineModal, setActiveMedicineModal] = useState<MedicineRecord | null>(null);
  const [activeScanItem, setActiveScanItem] = useState<ScanItem | null>(null);

  useEffect(() => {
    loadScans();
  }, [search, dateFilter]);

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = await api.getScans({
        search: search || undefined,
        dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
      });
      setScans(data);
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm(`Are you sure you want to delete scan ${scanId} and its associated medicine records?`)) {
      return;
    }
    try {
      await api.deleteScan(scanId);
      loadScans();
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const handleOpenScanDetails = (scan: ScanItem) => {
    if (scan.medicines.length === 1) {
      setActiveMedicineModal(scan.medicines[0]);
    } else {
      setActiveScanItem(scan);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            Date-Wise Scan History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit trail of all medicine packaging scans, original photo captures, and extracted items
          </p>
        </div>

        <button
          onClick={onScanNew}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
        >
          <span>New Image Scan</span>
        </button>
      </div>

      {/* Toolbar: Search and Date Filter */}
      <div className="p-4 rounded-2xl bg-white border border-teal-100/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search past scans by medicine name, batch, or Scan ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white font-medium text-slate-700 w-full sm:w-44"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="older">Older</option>
          </select>
        </div>
      </div>

      {/* Date-wise scan list */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-white rounded-2xl border border-teal-100/80">
          Loading scan history...
        </div>
      ) : scans.length > 0 ? (
        <div className="space-y-4">
          {scans.map((scan) => {
            const dt = formatDateTime(scan.scannedAt);
            const medCount = scan.medicines.length;

            return (
              <div
                key={scan.scanId}
                className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs hover:border-teal-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Meta */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    {scan.imageUrl ? (
                      <img
                        src={scan.imageUrl}
                        alt="Scan packaging preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Pill className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{scan.scanId}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          medCount > 1 ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {medCount} {medCount === 1 ? 'Medicine Found' : 'Medicines Found'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {dt.date} at {dt.time}
                      </span>
                    </p>

                    {/* Quick Medicine Titles summary */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {scan.medicines.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md"
                        >
                          {m.medicineName || 'Unnamed Medicine'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    id={`history-details-btn-${scan.scanId}`}
                    onClick={() => handleOpenScanDetails(scan)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white rounded-lg border border-teal-200 transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    id={`history-delete-btn-${scan.scanId}`}
                    onClick={() => handleDeleteScan(scan.scanId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Scan Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-teal-100/80">
          <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No scan history recorded</p>
          <p className="text-xs text-slate-400 mt-1">Start by scanning a medicine package</p>
        </div>
      )}

      {/* Multiple Medicine View modal for History */}
      {activeScanItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-teal-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 bg-teal-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Scan Session: {activeScanItem.scanId}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeScanItem.medicines.length} medicines extracted from this session
                </p>
              </div>
              <button
                onClick={() => setActiveScanItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {activeScanItem.medicines.map((med, idx) => {
                const status = getStatusBadgeInfo(med.status);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50/50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{med.medicineName || 'Unnamed'}</h4>
                      <p className="text-xs text-slate-500">
                        {med.productType} • Batch: {med.batchNumber || 'N/A'} • Exp: {med.expiryDate || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveMedicineModal(med);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-lg border border-teal-200 shadow-2xs"
                    >
                      View Specs
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveScanItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Medicine Details Modal */}
      <MedicineDetailModal
        record={activeMedicineModal}
        isOpen={!!activeMedicineModal}
        onClose={() => setActiveMedicineModal(null)}
        onUpdate={async (updated) => {
          if (updated.id) {
            await api.updateRecord(updated.id, updated);
            loadScans();
          }
        }}
        onDelete={async (id) => {
          await api.deleteRecord(id);
          loadScans();
        }}
      />
    </div>
  );
};

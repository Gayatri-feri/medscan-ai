import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Pill,
} from 'lucide-react';
import { MedicineRecord, ExpiryStatus } from '../types';
import { api } from '../services/api';
import { getStatusBadgeInfo, formatDate } from '../utils/formatters';
import { MedicineDetailModal } from '../components/MedicineDetailModal';

export const ExpiryManagementPage: React.FC = () => {
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('EXPIRING_SOON');
  const [selectedRecord, setSelectedRecord] = useState<MedicineRecord | null>(null);

  useEffect(() => {
    loadExpiryData();
  }, [statusFilter]);

  const loadExpiryData = async () => {
    try {
      setLoading(true);
      const data = await api.getRecords({
        status: statusFilter || undefined,
        sortBy: 'expiry_date',
        sortOrder: 'asc',
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load expiry records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updated: MedicineRecord) => {
    if (!updated.id) return;
    await api.updateRecord(updated.id, updated);
    loadExpiryData();
  };

  const handleDelete = async (id: number) => {
    await api.deleteRecord(id);
    loadExpiryData();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-amber-600" />
          Medicine Expiry & Shelf-Life Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Actively track expiration dates, safeguard patient safety, and prevent administering expired medications
        </p>
      </div>

      {/* Safety Alert Strip */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Pharmaceutical Safety Protocol</p>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Expired medications can lose therapeutic efficacy or undergo chemical decomposition. Segregate any medicine identified with an EXPIRED badge for authorized disposal according to health authority regulations.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: '', label: 'All Medicines' },
          { id: 'EXPIRING_SOON', label: 'Expiring Soon (≤30 Days)', highlight: 'text-amber-700 bg-amber-50' },
          { id: 'EXPIRED', label: 'Expired (Disposal Needed)', highlight: 'text-rose-700 bg-rose-50' },
          { id: 'VALID', label: 'Valid Shelf-Life', highlight: 'text-emerald-700 bg-emerald-50' },
          { id: 'UNKNOWN', label: 'Unspecified Expiry' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`expiry-filter-${tab.id || 'all'}`}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
              statusFilter === tab.id
                ? 'bg-teal-700 text-white shadow-xs'
                : `${tab.highlight || 'text-slate-600 hover:bg-slate-100'} border border-transparent`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table of Expiring / Expired items */}
      <div className="rounded-2xl bg-white border border-teal-100/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Auditing expiry dates...</div>
          ) : records.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Mfg Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const statusInfo = getStatusBadgeInfo(rec.status);
                  return (
                    <tr key={rec.id} className="hover:bg-teal-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{rec.medicineName || 'Unnamed Medicine'}</p>
                            <p className="text-[11px] text-slate-500">{rec.productType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{rec.batchNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-bold text-teal-950 text-sm">{rec.expiryDate || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{rec.manufacturingDate || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[150px]">{rec.manufacturer || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`expiry-inspect-${rec.id}`}
                            onClick={() => setSelectedRecord(rec)}
                            className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white rounded-lg border border-teal-200 transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => rec.id && handleDelete(rec.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Discard / Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No matching medicines found in this category</p>
              <p className="text-xs text-slate-400 mt-1">All cataloged inventory complies with selected shelf-life parameters</p>
            </div>
          )}
        </div>
      </div>

      <MedicineDetailModal
        record={selectedRecord}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
};

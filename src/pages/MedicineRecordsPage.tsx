import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  Edit2,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { MedicineRecord, ExpiryStatus } from '../types';
import { api } from '../services/api';
import { getStatusBadgeInfo, formatDate } from '../utils/formatters';
import { MedicineDetailModal } from '../components/MedicineDetailModal';

interface MedicineRecordsPageProps {
  onScanNew: () => void;
}

export const MedicineRecordsPage: React.FC<MedicineRecordsPageProps> = ({ onScanNew }) => {
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active record for modal
  const [selectedRecord, setSelectedRecord] = useState<MedicineRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, [search, productTypeFilter, statusFilter, sortBy, sortOrder]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getRecords({
        search: search || undefined,
        productType: productTypeFilter || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load medicine records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updated: MedicineRecord) => {
    if (!updated.id) return;
    await api.updateRecord(updated.id, updated);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    await api.deleteRecord(id);
    loadRecords();
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-teal-600" />
            Medicine Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Browse, search, edit, and organize all scanned pharmaceutical items in your system
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href={api.getExportCsvUrl()}
            download="medscan_inventory.csv"
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={onScanNew}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Scan Medicine</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search medicine, active ingredient, batch, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
            />
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">All Product Types</option>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Ointment">Ointment</option>
              <option value="Cream">Cream</option>
              <option value="Lotion">Lotion</option>
              <option value="Gel">Gel</option>
              <option value="Drops">Drops</option>
              <option value="Injection">Injection</option>
              <option value="Powder">Powder</option>
              <option value="Spray">Spray</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Expiry Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">All Expiry Statuses</option>
              <option value="VALID">Valid</option>
              <option value="EXPIRING_SOON">Expiring Soon (≤30d)</option>
              <option value="EXPIRED">Expired</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(ord as 'asc' | 'desc');
              }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="medicine_name-asc">Medicine Name (A-Z)</option>
              <option value="expiry_date-asc">Expiry Date (Earliest)</option>
              <option value="mrp-desc">MRP (Highest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-2xl bg-white border border-teal-100/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading medicine inventory...</div>
          ) : records.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine & Ingredient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Batch No.</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">MRP</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const statusInfo = getStatusBadgeInfo(rec.status);
                  return (
                    <tr key={rec.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{rec.medicineName || 'Unnamed Medicine'}</p>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">
                              {rec.activeIngredient ? `${rec.activeIngredient}` : 'No ingredient noted'}
                              {rec.strength ? ` • ${rec.strength}` : ''}
                            </p>
                            {rec.generalIndication && (
                              <p className="text-[10px] text-teal-700 truncate max-w-xs mt-0.5" title={rec.generalIndication}>
                                <span className="font-medium text-slate-500">Used for:</span> {rec.generalIndication}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{rec.productType || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{rec.batchNumber || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-teal-950">{rec.expiryDate || 'N/A'}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{rec.mrp || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                        {rec.manufacturer || rec.brandName || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`records-view-btn-${rec.id}`}
                            onClick={() => setSelectedRecord(rec)}
                            className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-600 rounded-lg border border-teal-200 transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            id={`records-delete-btn-${rec.id}`}
                            onClick={() => rec.id && handleDelete(rec.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete"
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
              <Pill className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No records found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or scan a new medicine package</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Inspection & Editing Modal */}
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

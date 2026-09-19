import React, { useState } from 'react';
import {
  X,
  Edit2,
  Save,
  Trash2,
  CheckCircle2,
  Calendar,
  Building,
  Tag,
  Pill,
  Sparkles,
  Info,
  Search,
  FileText,
} from 'lucide-react';
import { MedicineRecord } from '../types';
import { api } from '../services/api';
import { getStatusBadgeInfo, getConfidenceBadge, formatDateTime } from '../utils/formatters';

interface MedicineDetailModalProps {
  record: MedicineRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updated: MedicineRecord) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  readOnly?: boolean;
}

export const MedicineDetailModal: React.FC<MedicineDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  readOnly = false,
}) => {
  if (!isOpen || !record) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MedicineRecord>({ ...record });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const statusBadge = getStatusBadgeInfo(formData.status);
  const dateTime = formatDateTime(formData.scannedAt || formData.createdAt);

  const handleLookupIndication = async () => {
    if (!formData.medicineName && !formData.activeIngredient) return;
    setIsLookingUp(true);
    try {
      const res = await api.lookupIndication(formData.medicineName || '', formData.activeIngredient);
      setFormData((prev) => ({ ...prev, generalIndication: res.indication }));
    } catch (err) {
      console.error('Failed to lookup indication:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleChange = (field: keyof MedicineRecord, val: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record.id || !onDelete) return;
    if (window.confirm(`Are you sure you want to delete ${record.medicineName || 'this medicine record'}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(record.id);
        onClose();
      } catch (err) {
        console.error('Delete failed:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-teal-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-teal-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {formData.medicineName || 'Unnamed Medicine'}
                </h3>
                <span
                  className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                  <span>{statusBadge.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Scan ID: {formData.scanId || 'N/A'} • {dateTime.date} {dateTime.time}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!readOnly && onUpdate && !isEditing && (
              <button
                id="modal-edit-btn"
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {!readOnly && onDelete && record.id && (
              <button
                id="modal-delete-btn"
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                title="Delete Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              id="modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-teal-600" />
              Basic Product Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Medicine / Product Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.medicineName || ''}
                    onChange={(e) => handleChange('medicineName', e.target.value)}
                    className="mt-1 w-full text-sm font-medium border border-teal-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formData.medicineName || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Product Type</label>
                {isEditing ? (
                  <select
                    value={formData.productType || 'Tablet'}
                    onChange={(e) => handleChange('productType', e.target.value)}
                    className="mt-1 w-full text-sm font-medium border border-teal-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
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
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formData.productType || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Active Ingredient / Composition</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.activeIngredient || ''}
                    onChange={(e) => handleChange('activeIngredient', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 mt-0.5">
                    {formData.activeIngredient || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Strength</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.strength || ''}
                    onChange={(e) => handleChange('strength', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {formData.strength || 'Not detected'}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>General Indication (Used For)</span>
                  </label>
                  <button
                    type="button"
                    disabled={isLookingUp}
                    onClick={handleLookupIndication}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-0.5 rounded-md border border-teal-200 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                    title="Search what this medicine is used for (AI & Clinical Database)"
                  >
                    <Search className="w-3 h-3" />
                    <span>{isLookingUp ? 'Searching uses...' : 'Google / AI Lookup Uses'}</span>
                  </button>
                </div>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.generalIndication || ''}
                    onChange={(e) => handleChange('generalIndication', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="e.g. Relieves fever, headache, and body pain"
                  />
                ) : (
                  <p className="text-sm text-slate-700 mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                    {formData.generalIndication || 'Not detected'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Manufacturer Information */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-teal-600" />
              Manufacturer & Brand Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Brand Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.brandName || ''}
                    onChange={(e) => handleChange('brandName', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formData.brandName || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Manufacturer</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.manufacturer || ''}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 mt-0.5">
                    {formData.manufacturer || 'Not detected'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Package & Batch Information */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-teal-600" />
              Package & Commercial Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Batch Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.batchNumber || ''}
                    onChange={(e) => handleChange('batchNumber', e.target.value)}
                    className="mt-1 w-full text-sm font-mono border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    {formData.batchNumber || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Manufacturing Date</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={formData.manufacturingDate || ''}
                    onChange={(e) => handleChange('manufacturingDate', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 mt-0.5">
                    {formData.manufacturingDate || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Expiry Date</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={formData.expiryDate || ''}
                    onChange={(e) => handleChange('expiryDate', e.target.value)}
                    className="mt-1 w-full text-sm font-bold text-teal-900 border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm font-bold text-teal-900 mt-0.5">
                    {formData.expiryDate || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">MRP / Price</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.mrp || ''}
                    onChange={(e) => handleChange('mrp', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formData.mrp || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Quantity / Units</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.quantity || ''}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 mt-0.5">
                    {formData.quantity || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Pack Size</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.packSize || ''}
                    onChange={(e) => handleChange('packSize', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 mt-0.5">
                    {formData.packSize || 'Not detected'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Prescription Status</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="Rx / OTC / Schedule H"
                    value={formData.prescriptionStatus || ''}
                    onChange={(e) => handleChange('prescriptionStatus', e.target.value)}
                    className="mt-1 w-full text-sm border border-teal-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {formData.prescriptionStatus || 'Not detected'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: AI Extraction Confidence & Raw Text */}
          <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Gemini Extraction Confidence Scores
              </span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                Certainty estimation
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {Object.entries(formData.confidence || {}).map(([key, score]) => {
                if (typeof score !== 'number') return null;
                const badge = getConfidenceBadge(score);
                const fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
                return (
                  <div key={key} className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                    <span className="capitalize text-slate-600 truncate max-w-[100px]">{fieldName}</span>
                    <span className={badge.color}>{badge.label}</span>
                  </div>
                );
              })}
            </div>

            {formData.rawText && (
              <div className="mt-3 pt-3 border-t border-teal-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Raw Packaging Text Detected:</p>
                <pre className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {formData.rawText}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...record });
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                id="modal-save-changes-btn"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

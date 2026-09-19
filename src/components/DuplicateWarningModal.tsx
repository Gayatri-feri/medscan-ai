import React from 'react';
import { AlertTriangle, Copy, RefreshCw, X } from 'lucide-react';
import { MedicineRecord } from '../types';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  existingRecord: MedicineRecord | null;
  newRecord: MedicineRecord;
  onUpdateExisting: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  existingRecord,
  newRecord,
  onUpdateExisting,
  onCreateNew,
  onCancel,
}) => {
  if (!isOpen || !existingRecord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-amber-200">
        <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4 bg-amber-50/70">
          <div className="flex items-center space-x-2 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base">Duplicate Record Detected</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            A similar medicine record already exists in your database with matching details:
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Medicine:</span>
              <span className="font-bold text-slate-900">{existingRecord.medicineName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Batch Number:</span>
              <span className="font-mono font-semibold text-slate-900">{existingRecord.batchNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Manufacturer:</span>
              <span className="text-slate-800">{existingRecord.manufacturer || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Expiry Date:</span>
              <span className="font-bold text-teal-800">{existingRecord.expiryDate || 'N/A'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Would you like to overwrite/update the existing entry with this new scan, or create an independent new record?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            id="duplicate-update-btn"
            type="button"
            onClick={onUpdateExisting}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors border border-teal-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update Existing</span>
          </button>
          <button
            id="duplicate-create-btn"
            type="button"
            onClick={onCreateNew}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Create New Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};

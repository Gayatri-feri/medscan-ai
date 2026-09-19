import React, { useState } from 'react';
import {
  Settings,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsPageProps {
  onDataReset?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDataReset }) => {
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all scans and medicine records? The database will be reset to blank.')) {
      return;
    }
    setClearing(true);
    setClearResult(null);
    try {
      const res = await api.clearAllRecords();
      setClearResult(res.message);
      if (onDataReset) onDataReset();
    } catch (err: any) {
      setClearResult('Failed to clear database: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          Settings & System Configuration
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          System health, AI engine connectivity, and database management
        </p>
      </div>

      {clearResult && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{clearResult}</span>
        </div>
      )}

      {/* AI Vision Engine Section */}
      <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-100/70 text-teal-700">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Gemini Vision Intelligence Engine</h3>
            <p className="text-xs text-slate-500">Google Gen AI Multimodal SDK (@google/genai)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Model:</span>
            <p className="font-semibold text-slate-900 mt-0.5">gemini-2.5-flash</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Multi-Image Batch Capacity:</span>
            <p className="font-semibold text-slate-900 mt-0.5">Up to 10 packaging images at a time</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Architecture:</span>
            <p className="font-semibold text-slate-900 mt-0.5">Full-stack server-side proxy (secure API keys)</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium">Schema Enforcement:</span>
            <p className="font-semibold text-slate-900 mt-0.5">Strict Structured JSON Schema</p>
          </div>
        </div>
      </div>

      {/* Database & Storage */}
      <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100/70 text-emerald-700">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Persistence & Database Engine</h3>
            <p className="text-xs text-slate-500">SQLite persistence engine mounted at /data/medscan.sqlite</p>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Scanned medicine packaging photos, parsed attributes, expiry timelines, and confidence scores are stored persistently. By default, the database is clean and blank until you scan products.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            id="clear-records-btn"
            type="button"
            onClick={handleClearAll}
            disabled={clearing}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`} />
            <span>{clearing ? 'Clearing Records...' : 'Clear All Records & Reset to Blank'}</span>
          </button>
        </div>
      </div>

      {/* Medical Safety & Compliance */}
      <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Medical Safety & Regulatory Disclaimer</h3>
            <p className="text-xs text-slate-500">Clinical practice boundaries</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          MedScan AI extracts information from medicine packaging and is not a substitute for professional medical advice, clinical diagnosis, or therapeutic recommendations. Always consult a licensed healthcare professional, physician, or pharmacist before consuming or administering any medication.
        </p>
      </div>
    </div>
  );
};

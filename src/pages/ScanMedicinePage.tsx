import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Save,
  Layers,
  ShieldCheck,
  FileImage,
  Eye,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowLeft,
  Search,
  FileText,
  Pill,
  History,
} from 'lucide-react';
import { MedicineRecord } from '../types';
import { api } from '../services/api';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { MedicineDetailModal } from '../components/MedicineDetailModal';
import { getConfidenceBadge, getStatusBadgeInfo } from '../utils/formatters';

const MAX_IMAGES = 10;

export interface QueuedImage {
  id: string;
  dataUrl: string;
  mimeType: string;
  fileName?: string;
  status: 'ready' | 'analyzing' | 'done' | 'error';
  qualityWarning?: string | null;
  errorMessage?: string | null;
  extractedMedicines: MedicineRecord[];
}

interface ScanMedicinePageProps {
  onScanSaved: (scanId: string) => void;
  onBackToDashboard?: () => void;
  onViewHistory?: () => void;
}

export const ScanMedicinePage: React.FC<ScanMedicinePageProps> = ({
  onScanSaved,
  onBackToDashboard,
  onViewHistory,
}) => {
  // Queue of images (up to 10)
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Analysis status
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingProgress, setAnalyzingProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  // Results & Viewing
  const [activeFilterIndex, setActiveFilterIndex] = useState<number | 'all'>('all');
  const [isEditingSingle, setIsEditingSingle] = useState<boolean>(false);
  const [singleFormData, setSingleFormData] = useState<MedicineRecord | null>(null);
  const [isLookingUpIndication, setIsLookingUpIndication] = useState<boolean>(false);

  const handleLookupSingleIndication = async () => {
    if (!singleFormData) return;
    if (!singleFormData.medicineName && !singleFormData.activeIngredient) {
      setQualityWarning('Please specify a medicine name or active ingredient first.');
      return;
    }
    try {
      setIsLookingUpIndication(true);
      const res = await api.lookupIndication(
        singleFormData.medicineName || '',
        singleFormData.activeIngredient
      );
      setSingleFormData((prev) => (prev ? { ...prev, generalIndication: res.indication } : null));
    } catch (err: any) {
      console.error('Indication lookup error:', err);
    } finally {
      setIsLookingUpIndication(false);
    }
  };

  // Modals
  const [showMultipleDetailsModal, setShowMultipleDetailsModal] = useState<boolean>(false);
  const [activeDetailMedicine, setActiveDetailMedicine] = useState<MedicineRecord | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to get active image
  const activeImage = queuedImages[activeImageIndex] || queuedImages[0] || null;

  // Flattened list of all medicines across all images
  const allExtractedMedicines: MedicineRecord[] = queuedImages.flatMap((img, imgIdx) =>
    (img.extractedMedicines || []).map((med) => ({
      ...med,
      sourceImageIndex: imgIdx,
      sourceImageId: img.id,
      imageUrl: med.imageUrl || img.dataUrl,
    }))
  );

  // Filtered medicines based on selected image tab
  const filteredMedicines =
    activeFilterIndex === 'all'
      ? allExtractedMedicines
      : allExtractedMedicines.filter((m) => m.sourceImageIndex === activeFilterIndex);

  // Add files to queue (up to MAX_IMAGES)
  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setAnalysisError(null);
    setQualityWarning(null);
    setSaveSuccessMsg(null);

    const remainingSlots = MAX_IMAGES - queuedImages.length;
    if (remainingSlots <= 0) {
      setAnalysisError(`Maximum of ${MAX_IMAGES} images reached. Remove an image to add more.`);
      return;
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      setQualityWarning(
        `You can upload up to ${MAX_IMAGES} images at a time. The first ${remainingSlots} images were added.`
      );
    }

    const readers: Promise<QueuedImage>[] = filesToProcess.map((file, idx) => {
      return new Promise((resolve) => {
        if (!file.type.match(/^image\/(jpeg|jpg|png|webp|svg\+xml)/)) {
          resolve({
            id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: '',
            mimeType: file.type || 'image/jpeg',
            fileName: file.name,
            status: 'error',
            errorMessage: 'Unsupported image format. Please use JPG, PNG, or WEBP.',
            extractedMedicines: [],
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: (e.target?.result as string) || '',
            mimeType: file.type,
            fileName: file.name,
            status: 'ready',
            extractedMedicines: [],
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newImages) => {
      const validImages = newImages.filter((img) => img.dataUrl);
      setQueuedImages((prev) => {
        // Allow adding images freely to scan any number of times
        const combined = [...prev, ...validImages].slice(0, MAX_IMAGES);
        return combined;
      });
      if (queuedImages.length === 0 && validImages.length > 0) {
        setActiveImageIndex(0);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setQueuedImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      return next;
    });

    if (activeImageIndex >= indexToRemove && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
    if (activeFilterIndex === indexToRemove) {
      setActiveFilterIndex('all');
    } else if (typeof activeFilterIndex === 'number' && activeFilterIndex > indexToRemove) {
      setActiveFilterIndex(activeFilterIndex - 1);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    setQueuedImages([]);
    setActiveImageIndex(0);
    setActiveFilterIndex('all');
    setSingleFormData(null);
    setIsEditingSingle(false);
    setAnalysisError(null);
    setQualityWarning(null);
    setSaveSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Analyze a single image by index (Retry mechanism, finishes within 5 seconds)
  const handleAnalyzeSingle = async (imgIdx: number) => {
    if (imgIdx < 0 || imgIdx >= queuedImages.length) return;
    const item = queuedImages[imgIdx];
    if (!item) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setQualityWarning(null);
    setSaveSuccessMsg(null);

    setAnalyzingProgress({
      current: 1,
      total: 1,
      label: `Analyzing packaging and reading text...`,
    });

    const updatedQueue = [...queuedImages];
    updatedQueue[imgIdx] = { ...item, status: 'analyzing', errorMessage: null };
    setQueuedImages([...updatedQueue]);

    try {
      const result = await api.analyzeImage(item.dataUrl, item.mimeType);
      const qualityWarn = !result.isQualitySufficient
        ? result.qualityIssue || 'Image quality may affect extraction precision.'
        : null;

      const medicines = (result.medicines || []).map((m) => ({
        ...m,
        imageUrl: item.dataUrl,
      }));

      if (medicines.length === 0) {
        updatedQueue[imgIdx] = {
          ...item,
          status: 'error',
          errorMessage: result.qualityIssue || 'No medicine packaging text identified. Click Retry to scan again.',
          qualityWarning: qualityWarn,
          extractedMedicines: [],
        };
      } else {
        // Automatically persist genuine user scan to SQLite history
        try {
          const saveResult = await api.saveScan({
            imageUrl: item.dataUrl,
            medicines,
          });

          const savedMedicines = medicines.map((m, idx) => ({
            ...m,
            id: saveResult.recordIds?.[idx] || undefined,
            scanId: saveResult.scanId,
          }));

          updatedQueue[imgIdx] = {
            ...item,
            status: 'done',
            errorMessage: null,
            qualityWarning: qualityWarn,
            extractedMedicines: savedMedicines,
          };

          setSaveSuccessMsg(
            `✓ Recorded in Scan History (${saveResult.scanId}) with ${saveResult.count} medicine item(s).`
          );
          onScanSaved(saveResult.scanId);
        } catch (saveErr: any) {
          console.error('Auto-save error:', saveErr);
          updatedQueue[imgIdx] = {
            ...item,
            status: 'done',
            errorMessage: null,
            qualityWarning: qualityWarn,
            extractedMedicines: medicines,
          };
        }
      }
    } catch (err: any) {
      console.error(`Analysis failed for image ${imgIdx + 1}:`, err);
      updatedQueue[imgIdx] = {
        ...item,
        status: 'error',
        errorMessage: err.message || 'Analysis did not complete. Click Retry Scan below.',
        extractedMedicines: [],
      };
      setAnalysisError(`Failed to scan Image #${imgIdx + 1}. You can click Retry Scan to try again immediately.`);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingProgress(null);
      setQueuedImages([...updatedQueue]);

      const allExtracted = updatedQueue.flatMap((q) => q.extractedMedicines);
      if (allExtracted.length === 1) {
        setSingleFormData({ ...allExtracted[0] });
      }
    }
  };

  // Run AI analysis on queued images (can scan any number of times)
  const handleAnalyzeAll = async () => {
    if (queuedImages.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setQualityWarning(null);
    setSaveSuccessMsg(null);

    const updatedQueue = [...queuedImages];
    const totalCount = updatedQueue.length;

    for (let step = 0; step < totalCount; step++) {
      const item = updatedQueue[step];

      setAnalyzingProgress({
        current: step + 1,
        total: totalCount,
        label: `Scanning package ${step + 1} of ${totalCount}...`,
      });

      // Mark current item as analyzing
      updatedQueue[step] = { ...item, status: 'analyzing', errorMessage: null };
      setQueuedImages([...updatedQueue]);

      try {
        const result = await api.analyzeImage(item.dataUrl, item.mimeType);

        const qualityWarn = !result.isQualitySufficient
          ? result.qualityIssue || 'Image quality may affect extraction precision.'
          : null;

        const medicines = (result.medicines || []).map((m) => ({
          ...m,
          imageUrl: item.dataUrl,
        }));

        if (medicines.length === 0) {
          updatedQueue[step] = {
            ...item,
            status: 'error',
            errorMessage: result.qualityIssue || 'No medicine packaging or pharmaceutical text identified.',
            qualityWarning: qualityWarn,
            extractedMedicines: [],
          };
        } else {
          // Automatically persist genuine user scan to SQLite history
          try {
            const saveResult = await api.saveScan({
              imageUrl: item.dataUrl,
              medicines,
            });

            const savedMedicines = medicines.map((m, idx) => ({
              ...m,
              id: saveResult.recordIds?.[idx] || undefined,
              scanId: saveResult.scanId,
            }));

            updatedQueue[step] = {
              ...item,
              status: 'done',
              errorMessage: null,
              qualityWarning: qualityWarn,
              extractedMedicines: savedMedicines,
            };

            onScanSaved(saveResult.scanId);
            setSaveSuccessMsg(
              `✓ Recorded in Scan History (${saveResult.scanId}) with ${saveResult.count} medicine item(s).`
            );
          } catch (saveErr: any) {
            console.error('Auto-save error:', saveErr);
            updatedQueue[step] = {
              ...item,
              status: 'done',
              errorMessage: null,
              qualityWarning: qualityWarn,
              extractedMedicines: medicines,
            };
          }
        }
      } catch (err: any) {
        console.error(`Analysis failed for image ${step + 1}:`, err);
        updatedQueue[step] = {
          ...item,
          status: 'error',
          errorMessage: err.message || 'AI extraction failed. Click Retry Scan.',
          extractedMedicines: [],
        };
      }

      setQueuedImages([...updatedQueue]);
    }

    setIsAnalyzing(false);
    setAnalyzingProgress(null);

    // If only 1 medicine extracted across 1 image, initialize single editing form
    const allExtracted = updatedQueue.flatMap((q) => q.extractedMedicines);
    if (allExtracted.length === 1) {
      setSingleFormData({ ...allExtracted[0] });
    }
  };

  // Initiate Save or Update record
  const initiateSave = async (medicinesToSave: MedicineRecord[]) => {
    if (!medicinesToSave || medicinesToSave.length === 0) return;
    await executeSave(medicinesToSave);
  };

  const executeSave = async (medicinesToSave: MedicineRecord[]) => {
    setIsSaving(true);
    try {
      const existingMeds = medicinesToSave.filter((m) => !!m.id);
      const newMeds = medicinesToSave.filter((m) => !m.id);

      // Update existing records
      for (const med of existingMeds) {
        if (med.id) {
          await api.updateRecord(med.id, med);
        }
      }

      // Save any new records that weren't yet persisted
      if (newMeds.length > 0) {
        if (queuedImages.length > 1) {
          const scansPayload = queuedImages
            .map((img) => ({
              imageUrl: img.dataUrl,
              medicines: img.extractedMedicines.filter((m) =>
                newMeds.some(
                  (toSave) =>
                    toSave.medicineName === m.medicineName &&
                    toSave.batchNumber === m.batchNumber
                )
              ),
            }))
            .filter((s) => s.medicines.length > 0);

          const result = await api.saveBatchScans(
            scansPayload.length > 0
              ? scansPayload
              : [{ imageUrl: activeImage?.dataUrl || '', medicines: newMeds }]
          );

          if (result.scanIds.length > 0) {
            onScanSaved(result.scanIds[0]);
          }
        } else {
          const result = await api.saveScan({
            imageUrl: activeImage?.dataUrl || '',
            medicines: newMeds,
          });
          onScanSaved(result.scanId);
        }
      }

      setSaveSuccessMsg(
        existingMeds.length > 0
          ? `✓ Updated ${existingMeds.length} medicine record(s) in History and Inventory.`
          : `✓ Scan recorded in History successfully.`
      );

      if (singleFormData?.scanId) {
        onScanSaved(singleFormData.scanId);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to save medicine records to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <div>
          <button
            id="back-to-dashboard-btn"
            type="button"
            onClick={onBackToDashboard}
            className="group inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50/50 text-xs font-semibold shadow-2xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-teal-600 group-hover:-translate-x-0.5 transition-all" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Top Title & Instructions */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-teal-600" />
              Scan Medicine Packages
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Upload or snap clear photos of up to 10 medicine packages at once for simultaneous AI extraction.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800">
              Capacity: {queuedImages.length} / {MAX_IMAGES} Images
            </span>
          </div>
        </div>
      </div>

      {/* Regulatory Safety Notice */}
      <div className="flex items-center space-x-2.5 px-4 py-2.5 bg-teal-50/70 border border-teal-100 rounded-xl text-teal-900 text-xs">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          <strong>Automated Package OCR:</strong> Attributes are recognized directly from packaging artwork. MedScan AI does not dispense medical advice, dosage schedules, or replace clinical consultations.
        </span>
      </div>

      {/* Success Banner */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          {onViewHistory && (
            <button
              id="success-banner-view-history-btn"
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              <span>View in History</span>
            </button>
          )}
        </div>
      )}

      {/* Error & Quality Warning Banners */}
      {analysisError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-xs text-rose-700 mt-0.5">{analysisError}</p>
            </div>
          </div>
          {queuedImages.length > 0 && (
            <button
              id="retry-banner-btn"
              type="button"
              disabled={isAnalyzing}
              onClick={() => handleAnalyzeSingle(activeImageIndex)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Scan (5s)</span>
            </button>
          )}
        </div>
      )}

      {qualityWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Image Quality Notice</p>
            <p className="text-xs text-amber-700 mt-0.5">{qualityWarning}</p>
          </div>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Queue & Selected Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Selected Packages</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {queuedImages.length} / {MAX_IMAGES}
                </span>
              </h3>
              {queuedImages.length > 0 && (
                <button
                  id="clear-all-images-btn"
                  onClick={handleClearAll}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {queuedImages.length === 0 ? (
              /* Drag & Drop Upload Zone when empty */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-200 hover:border-teal-500 rounded-2xl p-8 text-center bg-teal-50/20 hover:bg-teal-50/40 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[280px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center mb-3 shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-900">Upload Medicine Package Photos</p>
                <p className="text-xs text-slate-500 mt-1">Select up to 10 images at a time (JPG, PNG, WEBP)</p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50">
                    Browse Files (up to 10)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraOpen(true);
                    }}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-teal-600 text-white shadow-2xs hover:bg-teal-700 flex items-center space-x-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Use Camera</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Image Preview & Queue Strip */
              <div className="space-y-3">
                {/* Active Image Box */}
                {activeImage && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[340px]">
                    <img
                      src={activeImage.dataUrl}
                      alt={activeImage.fileName || 'Medicine Package Preview'}
                      className="max-h-[340px] w-auto object-contain"
                    />

                    {/* Active index badge */}
                    <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-xs font-bold backdrop-blur-xs">
                        Image #{activeImageIndex + 1}
                      </span>
                      {activeImage.status === 'done' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-xs font-semibold backdrop-blur-xs">
                          {activeImage.extractedMedicines.length} Detected
                        </span>
                      )}
                      {activeImage.status === 'analyzing' && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-600/90 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Analyzing
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                      <button
                        onClick={() => handleRemoveImage(activeImageIndex)}
                        className="p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-xs"
                        title="Remove this image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Prev / Next navigation arrows */}
                    {queuedImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex(
                              (activeImageIndex - 1 + queuedImages.length) % queuedImages.length
                            )
                          }
                          className="absolute left-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors shadow-xs"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex((activeImageIndex + 1) % queuedImages.length)
                          }
                          className="absolute right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors shadow-xs"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {/* Active image error retry overlay */}
                    {activeImage.status === 'error' && (
                      <div className="absolute inset-x-2 bottom-2 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/50 backdrop-blur-md text-white flex items-center justify-between shadow-lg">
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-xs text-rose-200 truncate">
                            {activeImage.errorMessage || 'Scan needs another try'}
                          </span>
                        </div>
                        <button
                          id="retry-active-image-btn"
                          type="button"
                          disabled={isAnalyzing}
                          onClick={() => handleAnalyzeSingle(activeImageIndex)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry (5s)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Single Image Action Bar (Allows scanning/retrying any number of times) */}
                {activeImage && (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium truncate">
                      {activeImage.status === 'done'
                        ? `Package #${activeImageIndex + 1}: ${activeImage.extractedMedicines.length} medicine(s) detected`
                        : activeImage.status === 'error'
                        ? `Package #${activeImageIndex + 1}: Scan failed`
                        : `Package #${activeImageIndex + 1}: Ready to scan`}
                    </span>
                    <button
                      id="single-image-scan-btn"
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleAnalyzeSingle(activeImageIndex)}
                      className={`px-3 py-1.5 rounded-lg text-white font-bold flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors disabled:opacity-50 ${
                        activeImage.status === 'error'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>
                        {activeImage.status === 'error'
                          ? 'Retry Scan (5s)'
                          : activeImage.status === 'done'
                          ? 'Re-scan This (5s)'
                          : 'Scan Image (5s)'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Thumbnail strip for multi-image queue */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Batch Queue ({queuedImages.length}/{MAX_IMAGES})</span>
                    <span>Click thumbnail to view</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {queuedImages.map((img, idx) => {
                      const isActive = idx === activeImageIndex;
                      return (
                        <div
                          key={img.id}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                            isActive
                              ? 'border-teal-600 shadow-sm ring-2 ring-teal-200'
                              : 'border-slate-200 hover:border-teal-400'
                          }`}
                        >
                          <img
                            src={img.dataUrl}
                            alt={`Thumb ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded text-[9px] font-bold bg-slate-950/80 text-white">
                            #{idx + 1}
                          </span>
                          {img.status === 'done' && (
                            <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                          )}
                          {img.status === 'analyzing' && (
                            <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                          )}
                          {img.status === 'error' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeSingle(idx);
                              }}
                              className="absolute inset-0 bg-rose-950/70 flex flex-col items-center justify-center text-white text-[10px] font-bold hover:bg-rose-900/80 transition-colors"
                              title="Click to retry scan for this image"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-rose-200 mb-0.5" />
                              <span>Retry</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add More button if < MAX_IMAGES */}
                    {queuedImages.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 text-teal-700 flex flex-col items-center justify-center transition-colors"
                        title="Add another packaging image (up to 10)"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-bold mt-0.5">Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Add Controls */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={queuedImages.length >= MAX_IMAGES}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center disabled:opacity-40"
                  >
                    + Add More Files
                  </button>
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    disabled={queuedImages.length >= MAX_IMAGES}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors flex items-center justify-center space-x-1 disabled:opacity-40"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Camera Photo</span>
                  </button>
                </div>

                {/* Main Analyze CTA */}
                {(() => {
                  const pendingCount = queuedImages.filter(
                    (img) => img.status !== 'done' || img.extractedMedicines.length === 0
                  ).length;
                  const allDone = pendingCount === 0 && queuedImages.length > 0;

                  return (
                    <button
                      id="start-analysis-btn"
                      onClick={handleAnalyzeAll}
                      disabled={isAnalyzing || queuedImages.length === 0}
                      className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-60 bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/20"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-200" />
                          <span>{analyzingProgress?.label || 'Analyzing with AI Vision (fast ~5s)...'}</span>
                        </>
                      ) : allDone ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-teal-200" />
                          <span>Re-scan All {queuedImages.length} Packages (within 5s)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {queuedImages.length === 1
                              ? 'Scan Medicine Image (within 5s)'
                              : `Scan All ${queuedImages.length} Images (Fast ~5s)`}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Hidden file input supporting multiple files up to 10 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                }
              }}
            />
          </div>
        </div>

        {/* Right Column: AI Extraction Results (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {allExtractedMedicines.length === 0 ? (
            /* Standby State */
            <div className="h-full min-h-[340px] rounded-2xl bg-white border border-teal-100/80 shadow-xs p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">AI Extraction Workspace</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                Add up to 10 medicine packaging photos on the left, then click "Analyze" to extract structured pharmacological records simultaneously.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-teal-800">
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 font-medium">
                  Multi-Image Batch (Up to 10)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 font-medium">
                  Active Ingredients & Strengths
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 font-medium">
                  Batch & Expiry Dates
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 font-medium">
                  MRP & Pack Size
                </span>
              </div>
            </div>
          ) : allExtractedMedicines.length === 1 && singleFormData ? (
            /* Single Medicine Detected (Same screen editable view) */
            <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">AI Extraction Result</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      1 Medicine Detected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and verify details extracted from package before saving to database.
                  </p>
                </div>

                <button
                  id="single-edit-toggle-btn"
                  type="button"
                  onClick={() => setIsEditingSingle(!isEditingSingle)}
                  className={`inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    isEditingSingle
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditingSingle ? 'Editing Mode' : 'Edit'}</span>
                </button>
              </div>

              {/* Extraction Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Medicine Name */}
                <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-100/80">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-teal-600" />
                      Medicine Name:
                    </span>
                    {singleFormData.confidence?.medicineName && (
                      <span className={getConfidenceBadge(singleFormData.confidence.medicineName).color}>
                        {singleFormData.confidence.medicineName}% confidence
                      </span>
                    )}
                  </div>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.medicineName || ''}
                      placeholder="Enter verified medicine name..."
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, medicineName: e.target.value })
                      }
                      className="w-full text-base font-bold text-slate-900 bg-white border border-teal-400 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-extrabold text-slate-900 tracking-tight">
                        {singleFormData.medicineName || 'Not detected'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingSingle(true)}
                        title="Click to edit medicine name"
                        className="text-[11px] text-teal-700 hover:text-teal-900 font-medium hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Type */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-500">Product Type:</span>
                    {singleFormData.confidence?.productType && (
                      <span className={getConfidenceBadge(singleFormData.confidence.productType).color}>
                        {singleFormData.confidence.productType}%
                      </span>
                    )}
                  </div>
                  {isEditingSingle ? (
                    <select
                      value={singleFormData.productType || 'Tablet'}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, productType: e.target.value })
                      }
                      className="w-full text-sm font-medium text-slate-900 bg-white border border-teal-300 rounded-lg px-2 py-1 outline-none"
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
                    <p className="text-sm font-semibold text-slate-900">
                      {singleFormData.productType || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Active Ingredient */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-500">Active Ingredient:</span>
                    {singleFormData.confidence?.activeIngredient && (
                      <span className={getConfidenceBadge(singleFormData.confidence.activeIngredient).color}>
                        {singleFormData.confidence.activeIngredient}%
                      </span>
                    )}
                  </div>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.activeIngredient || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, activeIngredient: e.target.value })
                      }
                      className="w-full text-xs font-medium text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-slate-900">
                      {singleFormData.activeIngredient || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Strength */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-500">Strength:</span>
                    {singleFormData.confidence?.strength && (
                      <span className={getConfidenceBadge(singleFormData.confidence.strength).color}>
                        {singleFormData.confidence.strength}%
                      </span>
                    )}
                  </div>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.strength || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, strength: e.target.value })
                      }
                      className="w-full text-xs font-medium text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-slate-900">
                      {singleFormData.strength || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Used For */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-teal-50/40 border border-teal-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-teal-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        <span>Used For (General Indication):</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleLookupSingleIndication}
                        disabled={isLookingUpIndication}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-teal-700 hover:text-teal-900 hover:bg-teal-100 border border-teal-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Google / Auto-lookup what this medicine is used for and get a concise summary"
                      >
                        <Search className="w-2.5 h-2.5" />
                        <span>{isLookingUpIndication ? 'Searching...' : 'Google / AI Lookup'}</span>
                      </button>
                    </div>
                    {singleFormData.confidence?.generalIndication && (
                      <span className={getConfidenceBadge(singleFormData.confidence.generalIndication).color}>
                        {singleFormData.confidence.generalIndication}%
                      </span>
                    )}
                  </div>
                  {isEditingSingle ? (
                    <textarea
                      rows={2}
                      value={singleFormData.generalIndication || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, generalIndication: e.target.value })
                      }
                      placeholder="e.g. Relieves fever, headache, and mild-to-moderate body pain"
                      className="w-full text-xs text-slate-900 bg-white border border-teal-300 rounded-lg p-2 outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/70 p-2 rounded-lg border border-teal-100/60">
                      {singleFormData.generalIndication || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Brand */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="font-semibold text-slate-500">Brand:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.brandName || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, brandName: e.target.value })
                      }
                      className="w-full text-xs text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      {singleFormData.brandName || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Manufacturer */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="font-semibold text-slate-500">Manufacturer:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.manufacturer || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, manufacturer: e.target.value })
                      }
                      className="w-full text-xs text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs font-medium text-slate-800 mt-1">
                      {singleFormData.manufacturer || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Batch Number */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="font-semibold text-slate-500">Batch Number:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.batchNumber || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, batchNumber: e.target.value })
                      }
                      className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                      {singleFormData.batchNumber || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Expiry Date */}
                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200">
                  <span className="font-semibold text-teal-900">Expiry Date:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.expiryDate || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, expiryDate: e.target.value })
                      }
                      className="w-full text-xs font-bold text-teal-950 bg-white border border-teal-400 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs font-bold text-teal-950 mt-1">
                      {singleFormData.expiryDate || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* MRP */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="font-semibold text-slate-500">MRP:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.mrp || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, mrp: e.target.value })
                      }
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs font-bold text-slate-900 mt-1">
                      {singleFormData.mrp || 'Not detected'}
                    </p>
                  )}
                </div>

                {/* Pack Size / Quantity */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="font-semibold text-slate-500">Pack Size:</span>
                  {isEditingSingle ? (
                    <input
                      type="text"
                      value={singleFormData.packSize || ''}
                      onChange={(e) =>
                        setSingleFormData({ ...singleFormData, packSize: e.target.value })
                      }
                      className="w-full text-xs text-slate-900 bg-white border border-teal-300 rounded-lg px-2.5 py-1 outline-none mt-1"
                    />
                  ) : (
                    <p className="text-xs text-slate-800 mt-1">
                      {singleFormData.packSize || 'Not detected'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="save-single-record-btn"
                    type="button"
                    onClick={() => initiateSave([singleFormData])}
                    disabled={isSaving}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSaving
                        ? 'Updating...'
                        : singleFormData.id
                        ? 'Update Record in History'
                        : 'Save Record'}
                    </span>
                  </button>

                  {onViewHistory && (
                    <button
                      type="button"
                      onClick={onViewHistory}
                      className="inline-flex items-center space-x-1 px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View in History</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAnalyzeAll}
                    disabled={isAnalyzing}
                    className="inline-flex items-center space-x-1 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Again</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Scan Another
                </button>
              </div>
            </div>
          ) : (
            /* Multiple Medicines Detected View */
            <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {allExtractedMedicines.length} Medicines Detected
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Across {queuedImages.length} Image(s)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="view-all-details-top-btn"
                    type="button"
                    onClick={() => setShowMultipleDetailsModal(true)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View All Details</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs if multiple images */}
              {queuedImages.length > 1 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0 mr-1">
                    <Filter className="w-3 h-3" />
                    Filter:
                  </span>
                  <button
                    onClick={() => setActiveFilterIndex('all')}
                    className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
                      activeFilterIndex === 'all'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Medicines ({allExtractedMedicines.length})
                  </button>
                  {queuedImages.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveFilterIndex(idx)}
                      className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
                        activeFilterIndex === idx
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Image #{idx + 1} ({img.extractedMedicines.length})
                    </button>
                  ))}
                </div>
              )}

              {/* Compact Summary Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Pkg</th>
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3">Expiry</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMedicines.map((med, idx) => {
                      const status = getStatusBadgeInfo(med.status || 'VALID');
                      const sourceImg =
                        typeof med.sourceImageIndex === 'number'
                          ? queuedImages[med.sourceImageIndex]
                          : null;
                      return (
                        <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              <img
                                src={med.imageUrl || sourceImg?.dataUrl || ''}
                                alt="pkg"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">
                              {med.medicineName || `Medicine #${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">
                              {med.activeIngredient || ''} {med.strength ? `• ${med.strength}` : ''}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {med.productType || 'Other'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                            {med.batchNumber || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-teal-900">
                            {med.expiryDate || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                              <span>{status.label}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              id={`multi-view-item-${idx}`}
                              onClick={() => {
                                setActiveDetailMedicine({ ...med });
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white rounded-md border border-teal-200 transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons: View All Details & Save All */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  id="view-all-details-btn"
                  type="button"
                  onClick={() => setShowMultipleDetailsModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View All Details ({filteredMedicines.length})</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {onViewHistory && (
                    <button
                      type="button"
                      onClick={onViewHistory}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View in History</span>
                    </button>
                  )}

                  <button
                    id="save-all-multi-records-btn"
                    type="button"
                    onClick={() => initiateSave(filteredMedicines)}
                    disabled={isSaving}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSaving
                        ? 'Updating...'
                        : filteredMedicines.some((m) => !!m.id)
                        ? `Update Records in History (${filteredMedicines.length})`
                        : `Save All ${filteredMedicines.length} Medicine Records`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Shot Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        currentCount={queuedImages.length}
        maxCount={MAX_IMAGES}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => {
          if (queuedImages.length < MAX_IMAGES) {
            const newImg: QueuedImage = {
              id: `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              dataUrl,
              mimeType: 'image/jpeg',
              fileName: `Camera-Snap-${queuedImages.length + 1}.jpg`,
              status: 'ready',
              extractedMedicines: [],
            };
            setQueuedImages((prev) => [...prev, newImg].slice(0, MAX_IMAGES));
            setActiveImageIndex(queuedImages.length);
          }
        }}
      />

      {/* Multiple Medicine Detailed View Modal */}
      {showMultipleDetailsModal && allExtractedMedicines.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-teal-100 my-8 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-teal-50/60">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Multiple Medicine Detailed Analysis ({filteredMedicines.length} Items)
                </h3>
                <p className="text-xs text-slate-500">
                  Complete extracted pharmacological attributes for every detected package item
                </p>
              </div>
              <button
                onClick={() => setShowMultipleDetailsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {filteredMedicines.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="text-sm font-bold text-teal-900">
                      Medicine {idx + 1}: {med.medicineName || 'Unnamed'}
                    </span>
                    <button
                      onClick={() => {
                        setActiveDetailMedicine({ ...med });
                      }}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Expand Card</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Product Type:</span>
                      <p className="font-semibold text-slate-900">{med.productType || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Active Ingredient:</span>
                      <p className="font-semibold text-slate-900">{med.activeIngredient || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Strength:</span>
                      <p className="font-semibold text-slate-900">{med.strength || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Batch Number:</span>
                      <p className="font-mono font-bold text-slate-900">{med.batchNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Mfg Date:</span>
                      <p className="text-slate-900">{med.manufacturingDate || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Expiry Date:</span>
                      <p className="font-bold text-teal-900">{med.expiryDate || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">MRP:</span>
                      <p className="font-bold text-slate-900">{med.mrp || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pack Size:</span>
                      <p className="text-slate-900">{med.packSize || 'N/A'}</p>
                    </div>
                  </div>

                  {med.generalIndication && (
                    <p className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-200">
                      <strong>Indication:</strong> {med.generalIndication}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowMultipleDetailsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowMultipleDetailsModal(false);
                  initiateSave(filteredMedicines);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
              >
                Save All {filteredMedicines.length} Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Modal for Individual Medicine Inspection */}
      <MedicineDetailModal
        record={activeDetailMedicine}
        isOpen={!!activeDetailMedicine}
        onClose={() => setActiveDetailMedicine(null)}
        onUpdate={async (updated) => {
          setQueuedImages((prevQueue) =>
            prevQueue.map((img) => ({
              ...img,
              extractedMedicines: img.extractedMedicines.map((m) =>
                m.medicineName === activeDetailMedicine?.medicineName &&
                m.batchNumber === activeDetailMedicine?.batchNumber
                  ? updated
                  : m
              ),
            }))
          );
          setActiveDetailMedicine(null);
        }}
      />
    </div>
  );
};

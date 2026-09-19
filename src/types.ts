export interface ConfidenceScore {
  medicineName?: number;
  productType?: number;
  activeIngredient?: number;
  strength?: number;
  generalIndication?: number;
  brandName?: number;
  manufacturer?: number;
  batchNumber?: number;
  manufacturingDate?: number;
  expiryDate?: number;
  mrp?: number;
  quantity?: number;
  packSize?: number;
  [key: string]: number | undefined;
}

export type ExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';

export interface MedicineRecord {
  id?: number;
  scanId?: string;
  medicineName: string | null;
  productType: string | null;
  activeIngredient: string | null;
  strength: string | null;
  generalIndication: string | null;
  brandName: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  mrp: string | null;
  quantity: string | null;
  packSize: string | null;
  prescriptionStatus: string | null;
  confidence: ConfidenceScore;
  rawText?: string;
  status?: ExpiryStatus;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  scannedAt?: string;
  sourceImageIndex?: number;
  sourceImageId?: string;
}

export interface ScanItem {
  id: number;
  scanId: string;
  imageUrl: string;
  scannedAt: string;
  createdAt: string;
  medicines: MedicineRecord[];
}

export interface AnalysisResponse {
  isQualitySufficient: boolean;
  qualityIssue?: string | null;
  medicines: MedicineRecord[];
  totalMedicinesDetected: number;
}

export interface DashboardStats {
  totalScanned: number;
  totalScanSessions: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  unknown: number;
  byProductType: Record<string, number>;
  recentRecords: {
    id: number;
    scanId: string;
    medicineName: string;
    generalIndication?: string | null;
    productType: string;
    batchNumber: string;
    expiryDate: string;
    mrp: string;
    status: ExpiryStatus;
    scannedAt: string;
    imageUrl?: string;
  }[];
  activityByDate: Record<string, number>;
}

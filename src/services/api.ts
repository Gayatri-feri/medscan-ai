import { AnalysisResponse, DashboardStats, MedicineRecord, ScanItem } from '../types';

export const api = {
  async analyzeImage(imageBase64: string, mimeType: string): Promise<AnalysisResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch('/api/scan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || 'Failed to analyze medicine packaging');
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Analysis request timed out after 7s. Please click Retry to scan again.');
      }
      throw e;
    }
  },

  async lookupIndication(
    medicineName: string,
    activeIngredient?: string | null
  ): Promise<{ indication: string; source: string }> {
    const res = await fetch('/api/medicine/lookup-indication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineName, activeIngredient }),
    });
    if (!res.ok) {
      return { indication: 'Therapeutic medicine.', source: 'default' };
    }
    return res.json();
  },

  async checkDuplicate(params: {
    medicineName: string | null;
    batchNumber: string | null;
    manufacturer?: string | null;
    expiryDate?: string | null;
  }): Promise<{ isDuplicate: boolean; existingRecord: MedicineRecord | null }> {
    const res = await fetch('/api/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return { isDuplicate: false, existingRecord: null };
    return res.json();
  },

  async saveScan(payload: {
    imageUrl: string;
    medicines: MedicineRecord[];
    customScanId?: string;
  }): Promise<{ success: boolean; scanId: string; recordIds: number[]; count: number }> {
    const res = await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save scan' }));
      throw new Error(err.error || 'Failed to save scan');
    }
    return res.json();
  },

  async getScans(filter?: { search?: string; dateFilter?: string }): Promise<ScanItem[]> {
    const params = new URLSearchParams();
    if (filter?.search) params.append('search', filter.search);
    if (filter?.dateFilter) params.append('dateFilter', filter.dateFilter);

    const res = await fetch(`/api/scans?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch scans');
    return res.json();
  },

  async getScan(scanId: string): Promise<ScanItem> {
    const res = await fetch(`/api/scans/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch scan details');
    return res.json();
  },

  async deleteScan(scanId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete scan');
    return res.json();
  },

  async getRecords(params?: {
    search?: string;
    productType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<MedicineRecord[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.status) query.append('status', params.status);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await fetch(`/api/records?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch medicine records');
    return res.json();
  },

  async updateRecord(id: number, record: Partial<MedicineRecord>): Promise<{ success: boolean; record: MedicineRecord }> {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('Failed to update record');
    return res.json();
  },

  async deleteRecord(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete record');
    return res.json();
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
    return res.json();
  },

  async clearAllRecords(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/clear-all', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear database records');
    return res.json();
  },

  async saveBatchScans(scans: Array<{ imageUrl: string; medicines: MedicineRecord[]; customScanId?: string }>): Promise<{
    success: boolean;
    scanIds: string[];
    totalMedicines: number;
    message: string;
  }> {
    const res = await fetch('/api/scans/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save batch scans' }));
      throw new Error(err.error || 'Failed to save batch scans');
    }
    return res.json();
  },

  getExportCsvUrl(): string {
    return '/api/export/csv';
  },

  getExportXlsxUrl(): string {
    return '/api/export/xlsx';
  },
};

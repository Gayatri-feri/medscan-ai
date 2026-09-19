import express, { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { getDb, queryAll, queryOne, execute, ScanRow, MedicineRecordRow } from './db.js';
import { analyzeMedicineImage, lookupMedicineIndication, ExtractedMedicine } from './gemini.js';

export const apiRouter = express.Router();

// Helper to determine expiry status
export function getExpiryStatus(expiryDateStr: string | null): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN' {
  if (!expiryDateStr || expiryDateStr.trim() === '' || expiryDateStr.toLowerCase().includes('not detected') || expiryDateStr.toLowerCase() === 'null') {
    return 'UNKNOWN';
  }

  // Parse various date formats: MM/YYYY, DD/MM/YYYY, YYYY-MM-DD, Month YYYY
  let expDate: Date | null = null;
  const clean = expiryDateStr.trim();

  // Check MM/YYYY or MM/YY
  const mmyyyy = clean.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    let year = parseInt(mmyyyy[2], 10);
    if (year < 100) year += 2000;
    // Set to the end of the expiry month
    expDate = new Date(year, month, 0, 23, 59, 59);
  } else {
    // Check DD/MM/YYYY
    const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      let year = parseInt(ddmmyyyy[3], 10);
      if (year < 100) year += 2000;
      expDate = new Date(year, month, day, 23, 59, 59);
    } else {
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) {
        expDate = new Date(parsed);
      }
    }
  }

  if (!expDate || isNaN(expDate.getTime())) {
    return 'UNKNOWN';
  }

  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'EXPIRED';
  } else if (diffDays <= 30) {
    return 'EXPIRING_SOON';
  } else {
    return 'VALID';
  }
}

// Generate unique sequential scan ID: SCAN-YYYYMMDD-XXX
function generateScanId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `SCAN-${yyyy}${mm}${dd}`;

  const lastScan = queryOne<{ scanId: string }>(
    `SELECT scanId FROM scans WHERE scanId LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${datePrefix}-%`]
  );

  let nextNum = 1;
  if (lastScan && lastScan.scanId) {
    const parts = lastScan.scanId.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${datePrefix}-${String(nextNum).padStart(3, '0')}`;
}

// 1. Analyze image endpoint
apiRouter.post('/scan/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    // Strip data url prefix if present (supports image/png, image/jpeg, image/svg+xml, etc.)
    let cleanBase64 = imageBase64;
    let detectedMimeType = mimeType || 'image/jpeg';

    if (imageBase64.startsWith('data:')) {
      const commaIdx = imageBase64.indexOf(',');
      if (commaIdx !== -1) {
        const meta = imageBase64.slice(5, commaIdx);
        const dataPart = imageBase64.slice(commaIdx + 1);
        if (meta.includes('image/')) {
          detectedMimeType = meta.split(';')[0];
        }
        if (meta.includes('base64')) {
          cleanBase64 = dataPart;
        } else {
          try {
            cleanBase64 = Buffer.from(decodeURIComponent(dataPart), 'utf-8').toString('base64');
          } catch {
            cleanBase64 = Buffer.from(dataPart, 'utf-8').toString('base64');
          }
        }
      }
    }

    const result = await analyzeMedicineImage(cleanBase64, detectedMimeType);
    return res.json(result);
  } catch (err: any) {
    console.error('Error analyzing image:', err);
    return res.status(500).json({
      error: err.message || 'Image analysis failed. Please ensure a clear picture of the package is uploaded.',
    });
  }
});

// Endpoint to look up what a medicine is used for (Google AI search / pharmaceutical dictionary)
apiRouter.post('/medicine/lookup-indication', async (req: Request, res: Response) => {
  try {
    const { medicineName, activeIngredient } = req.body;
    if (!medicineName && !activeIngredient) {
      return res.status(400).json({ error: 'Medicine name or active ingredient is required' });
    }
    const result = await lookupMedicineIndication(medicineName, activeIngredient);
    return res.json(result);
  } catch (err: any) {
    console.error('Error looking up indication:', err);
    return res.status(500).json({
      indication: 'Therapeutic medicine used for symptom relief and clinical disease management.',
      source: 'fallback',
      error: err.message,
    });
  }
});

// 2. Check duplicate record
apiRouter.post('/check-duplicate', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { medicineName, batchNumber, manufacturer, expiryDate } = req.body;

    if (!medicineName && !batchNumber) {
      return res.json({ isDuplicate: false, existingRecord: null });
    }

    let match: MedicineRecordRow | null = null;
    if (medicineName && batchNumber) {
      match = queryOne<MedicineRecordRow>(
        `SELECT * FROM medicine_records WHERE LOWER(medicineName) = LOWER(?) AND LOWER(batchNumber) = LOWER(?) LIMIT 1`,
        [medicineName.trim(), batchNumber.trim()]
      );
    } else if (medicineName && manufacturer) {
      match = queryOne<MedicineRecordRow>(
        `SELECT * FROM medicine_records WHERE LOWER(medicineName) = LOWER(?) AND LOWER(manufacturer) = LOWER(?) LIMIT 1`,
        [medicineName.trim(), manufacturer.trim()]
      );
    }

    return res.json({
      isDuplicate: !!match,
      existingRecord: match,
    });
  } catch (err: any) {
    console.error('Duplicate check error:', err);
    return res.status(500).json({ error: 'Failed to verify duplicate records' });
  }
});

// 3. Save Scan with Medicine Records
apiRouter.post('/scans', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { imageUrl, medicines, customScanId } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'At least one medicine record is required to save a scan.' });
    }

    const scanId = customScanId || generateScanId();
    const nowIso = new Date().toISOString();

    // Insert Scan
    execute(
      `INSERT INTO scans (scanId, imageUrl, scannedAt, createdAt) VALUES (?, ?, ?, ?)`,
      [scanId, imageUrl || '', nowIso, nowIso]
    );

    const savedRecordIds: number[] = [];

    // Insert Each Medicine Record
    for (const med of medicines) {
      const confidenceJson = typeof med.confidence === 'object' ? JSON.stringify(med.confidence) : med.confidence || '{}';
      
      const insertResult = execute(
        `INSERT INTO medicine_records (
          scanId, medicineName, productType, activeIngredient, strength,
          generalIndication, brandName, manufacturer, batchNumber,
          manufacturingDate, expiryDate, mrp, quantity, packSize,
          prescriptionStatus, confidence, rawText, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scanId,
          med.medicineName || 'Not detected',
          med.productType || 'Other',
          med.activeIngredient || null,
          med.strength || null,
          med.generalIndication || null,
          med.brandName || null,
          med.manufacturer || null,
          med.batchNumber || null,
          med.manufacturingDate || null,
          med.expiryDate || null,
          med.mrp || null,
          med.quantity || null,
          med.packSize || null,
          med.prescriptionStatus || null,
          confidenceJson,
          med.rawText || '',
          nowIso,
          nowIso,
        ]
      );
      savedRecordIds.push(insertResult.lastInsertRowid);
    }

    return res.json({
      success: true,
      scanId,
      recordIds: savedRecordIds,
      count: medicines.length,
      message: `Successfully saved scan ${scanId} with ${medicines.length} medicine record(s).`,
    });
  } catch (err: any) {
    console.error('Error saving scan:', err);
    return res.status(500).json({ error: err.message || 'Failed to save scan record' });
  }
});

// 3b. Batch Save Multiple Scans (for up to 10 images)
apiRouter.post('/scans/batch', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { scans } = req.body;

    if (!scans || !Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ error: 'At least one scan is required.' });
    }

    const savedScanIds: string[] = [];
    let totalMedicines = 0;
    const nowIso = new Date().toISOString();

    for (const scanItem of scans) {
      const { imageUrl, medicines, customScanId } = scanItem;
      if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
        continue;
      }

      const scanId = customScanId || generateScanId();
      savedScanIds.push(scanId);

      // Insert Scan
      execute(
        `INSERT INTO scans (scanId, imageUrl, scannedAt, createdAt) VALUES (?, ?, ?, ?)`,
        [scanId, imageUrl || '', nowIso, nowIso]
      );

      // Insert each medicine
      for (const med of medicines) {
        const confidenceJson = typeof med.confidence === 'object' ? JSON.stringify(med.confidence) : med.confidence || '{}';
        execute(
          `INSERT INTO medicine_records (
            scanId, medicineName, productType, activeIngredient, strength,
            generalIndication, brandName, manufacturer, batchNumber,
            manufacturingDate, expiryDate, mrp, quantity, packSize,
            prescriptionStatus, confidence, rawText, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scanId,
            med.medicineName || 'Not detected',
            med.productType || 'Other',
            med.activeIngredient || null,
            med.strength || null,
            med.generalIndication || null,
            med.brandName || null,
            med.manufacturer || null,
            med.batchNumber || null,
            med.manufacturingDate || null,
            med.expiryDate || null,
            med.mrp || null,
            med.quantity || null,
            med.packSize || null,
            med.prescriptionStatus || null,
            confidenceJson,
            med.rawText || '',
            nowIso,
            nowIso,
          ]
        );
        totalMedicines++;
      }
    }

    return res.json({
      success: true,
      scanIds: savedScanIds,
      totalMedicines,
      message: `Successfully saved ${savedScanIds.length} image scan(s) with ${totalMedicines} medicine record(s).`,
    });
  } catch (err: any) {
    console.error('Error saving batch scans:', err);
    return res.status(500).json({ error: err.message || 'Failed to save batch scans' });
  }
});

// 4. Get all Scans with their Medicines (Date-wise History)
apiRouter.get('/scans', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { search, dateFilter } = req.query;

    const scans = queryAll<ScanRow>(`SELECT * FROM scans ORDER BY scannedAt DESC`);
    const records = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records ORDER BY id DESC`);

    // Group records by scanId
    const recordsByScan: Record<string, MedicineRecordRow[]> = {};
    for (const r of records) {
      if (!recordsByScan[r.scanId]) {
        recordsByScan[r.scanId] = [];
      }
      recordsByScan[r.scanId].push({
        ...r,
        confidence: typeof r.confidence === 'string' ? JSON.parse(r.confidence || '{}') : r.confidence,
      });
    }

    let combined = scans.map((s) => ({
      ...s,
      medicines: recordsByScan[s.scanId] || [],
    }));

    // Filter by search query if provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      combined = combined.filter((s) => {
        if (s.scanId.toLowerCase().includes(q)) return true;
        return s.medicines.some(
          (m) =>
            (m.medicineName && m.medicineName.toLowerCase().includes(q)) ||
            (m.brandName && m.brandName.toLowerCase().includes(q)) ||
            (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
            (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
        );
      });
    }

    // Filter by date range if provided
    if (dateFilter && typeof dateFilter === 'string') {
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        combined = combined.filter((s) => new Date(s.scannedAt).getTime() >= startOfToday);
      } else if (dateFilter === 'yesterday') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        combined = combined.filter((s) => {
          const t = new Date(s.scannedAt).getTime();
          return t >= startOfYesterday && t < startOfToday;
        });
      } else if (dateFilter === 'last7days') {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        combined = combined.filter((s) => new Date(s.scannedAt).getTime() >= sevenDaysAgo);
      } else if (dateFilter === 'last30days') {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        combined = combined.filter((s) => new Date(s.scannedAt).getTime() >= thirtyDaysAgo);
      }
    }

    return res.json(combined);
  } catch (err: any) {
    console.error('Error fetching scans:', err);
    return res.status(500).json({ error: 'Failed to retrieve scan history' });
  }
});

// 5. Get Single Scan
apiRouter.get('/scans/:scanId', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { scanId } = req.params;
    const scan = queryOne<ScanRow>(`SELECT * FROM scans WHERE scanId = ?`, [scanId]);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    const medicines = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records WHERE scanId = ?`, [scanId]).map(m => ({
      ...m,
      confidence: typeof m.confidence === 'string' ? JSON.parse(m.confidence || '{}') : m.confidence,
    }));
    return res.json({ ...scan, medicines });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve scan details' });
  }
});

// 6. Delete Scan
apiRouter.delete('/scans/:scanId', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { scanId } = req.params;
    execute(`DELETE FROM medicine_records WHERE scanId = ?`, [scanId]);
    execute(`DELETE FROM scans WHERE scanId = ?`, [scanId]);
    return res.json({ success: true, message: `Scan ${scanId} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete scan' });
  }
});

// 7. Get Medicine Records (filterable, sortable)
apiRouter.get('/records', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { search, productType, status, sortBy, sortOrder } = req.query;

    const scans = queryAll<ScanRow>(`SELECT * FROM scans`);
    const scanMap = new Map<string, ScanRow>();
    scans.forEach((s) => scanMap.set(s.scanId, s));

    let records = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records ORDER BY id DESC`);

    let parsedRecords = records.map((r) => {
      const scan = scanMap.get(r.scanId);
      const computedStatus = getExpiryStatus(r.expiryDate);
      return {
        ...r,
        status: computedStatus,
        imageUrl: scan ? scan.imageUrl : null,
        scannedAt: scan ? scan.scannedAt : r.createdAt,
        confidence: typeof r.confidence === 'string' ? JSON.parse(r.confidence || '{}') : r.confidence,
      };
    });

    // Filtering
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      parsedRecords = parsedRecords.filter(
        (r) =>
          (r.medicineName && r.medicineName.toLowerCase().includes(q)) ||
          (r.brandName && r.brandName.toLowerCase().includes(q)) ||
          (r.manufacturer && r.manufacturer.toLowerCase().includes(q)) ||
          (r.batchNumber && r.batchNumber.toLowerCase().includes(q)) ||
          (r.activeIngredient && r.activeIngredient.toLowerCase().includes(q))
      );
    }

    if (productType && typeof productType === 'string' && productType !== 'all') {
      parsedRecords = parsedRecords.filter(
        (r) => r.productType && r.productType.toLowerCase() === productType.toLowerCase()
      );
    }

    if (status && typeof status === 'string' && status !== 'all') {
      parsedRecords = parsedRecords.filter(
        (r) => r.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Sorting
    if (sortBy && typeof sortBy === 'string') {
      const order = sortOrder === 'asc' ? 1 : -1;
      parsedRecords.sort((a: any, b: any) => {
        if (sortBy === 'medicineName') {
          return (a.medicineName || '').localeCompare(b.medicineName || '') * order;
        }
        if (sortBy === 'expiryDate') {
          return (a.expiryDate || '').localeCompare(b.expiryDate || '') * order;
        }
        if (sortBy === 'scannedAt') {
          return (new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()) * order;
        }
        return (a.id - b.id) * order;
      });
    }

    return res.json(parsedRecords);
  } catch (err: any) {
    console.error('Error fetching records:', err);
    return res.status(500).json({ error: 'Failed to retrieve medicine records' });
  }
});

// 8. Update Medicine Record
apiRouter.put('/records/:id', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { id } = req.params;
    const body = req.body;
    const nowIso = new Date().toISOString();

    const existing = queryOne<MedicineRecordRow>(`SELECT * FROM medicine_records WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Medicine record not found' });
    }

    execute(
      `UPDATE medicine_records SET
        medicineName = ?,
        productType = ?,
        activeIngredient = ?,
        strength = ?,
        generalIndication = ?,
        brandName = ?,
        manufacturer = ?,
        batchNumber = ?,
        manufacturingDate = ?,
        expiryDate = ?,
        mrp = ?,
        quantity = ?,
        packSize = ?,
        prescriptionStatus = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        body.medicineName ?? existing.medicineName,
        body.productType ?? existing.productType,
        body.activeIngredient ?? existing.activeIngredient,
        body.strength ?? existing.strength,
        body.generalIndication ?? existing.generalIndication,
        body.brandName ?? existing.brandName,
        body.manufacturer ?? existing.manufacturer,
        body.batchNumber ?? existing.batchNumber,
        body.manufacturingDate ?? existing.manufacturingDate,
        body.expiryDate ?? existing.expiryDate,
        body.mrp ?? existing.mrp,
        body.quantity ?? existing.quantity,
        body.packSize ?? existing.packSize,
        body.prescriptionStatus ?? existing.prescriptionStatus,
        nowIso,
        id,
      ]
    );

    const updated = queryOne<MedicineRecordRow>(`SELECT * FROM medicine_records WHERE id = ?`, [id]);
    return res.json({ success: true, record: updated });
  } catch (err: any) {
    console.error('Error updating record:', err);
    return res.status(500).json({ error: 'Failed to update record' });
  }
});

// 9. Delete Medicine Record
apiRouter.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { id } = req.params;
    execute(`DELETE FROM medicine_records WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Medicine record deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete record' });
  }
});

// 10. Dashboard Stats
apiRouter.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    await getDb();
    const scans = queryAll<ScanRow>(`SELECT * FROM scans ORDER BY scannedAt DESC`);
    const records = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records ORDER BY id DESC`);

    let validCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let unknownCount = 0;

    const byProductType: Record<string, number> = {};

    for (const r of records) {
      const st = getExpiryStatus(r.expiryDate);
      if (st === 'VALID') validCount++;
      else if (st === 'EXPIRING_SOON') expiringSoonCount++;
      else if (st === 'EXPIRED') expiredCount++;
      else unknownCount++;

      const type = r.productType || 'Other';
      byProductType[type] = (byProductType[type] || 0) + 1;
    }

    // Recent 6 scans with their first medicine name
    const scanMap = new Map<string, ScanRow>();
    scans.forEach((s) => scanMap.set(s.scanId, s));

    const recentRecords = records.slice(0, 8).map((r) => {
      const scan = scanMap.get(r.scanId);
      return {
        id: r.id,
        scanId: r.scanId,
        medicineName: r.medicineName || 'Unnamed Medicine',
        productType: r.productType || 'Tablet',
        batchNumber: r.batchNumber || 'N/A',
        expiryDate: r.expiryDate || 'N/A',
        mrp: r.mrp || 'N/A',
        generalIndication: r.generalIndication || null,
        status: getExpiryStatus(r.expiryDate),
        scannedAt: scan ? scan.scannedAt : r.createdAt,
        imageUrl: scan ? scan.imageUrl : null,
      };
    });

    // Scan activity by date (last 7 days)
    const activityMap: Record<string, number> = {};
    for (const s of scans) {
      const d = s.scannedAt.split('T')[0];
      activityMap[d] = (activityMap[d] || 0) + 1;
    }

    return res.json({
      totalScanned: records.length,
      totalScanSessions: scans.length,
      valid: validCount,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      unknown: unknownCount,
      byProductType,
      recentRecords,
      activityByDate: activityMap,
    });
  } catch (err: any) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// 11. CSV Export
apiRouter.get('/export/csv', async (req: Request, res: Response) => {
  try {
    await getDb();
    const scans = queryAll<ScanRow>(`SELECT * FROM scans`);
    const scanMap = new Map<string, ScanRow>();
    scans.forEach((s) => scanMap.set(s.scanId, s));

    const records = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records ORDER BY id ASC`);

    const headers = [
      'ID',
      'Scan ID',
      'Medicine Name',
      'Product Type',
      'Active Ingredient',
      'Strength',
      'General Indication',
      'Brand',
      'Manufacturer',
      'Batch Number',
      'Manufacturing Date',
      'Expiry Date',
      'MRP',
      'Quantity',
      'Pack Size',
      'Prescription Status',
      'Status',
      'Scan Date',
      'Scan Time',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = records.map((r) => {
      const scan = scanMap.get(r.scanId);
      const scanDateObj = scan ? new Date(scan.scannedAt) : new Date(r.createdAt);
      const scanDate = scanDateObj.toLocaleDateString('en-US');
      const scanTime = scanDateObj.toLocaleTimeString('en-US');
      const status = getExpiryStatus(r.expiryDate);

      return [
        r.id,
        r.scanId,
        r.medicineName || 'Not detected',
        r.productType || 'Other',
        r.activeIngredient || 'Not detected',
        r.strength || 'Not detected',
        r.generalIndication || 'Not detected',
        r.brandName || 'Not detected',
        r.manufacturer || 'Not detected',
        r.batchNumber || 'Not detected',
        r.manufacturingDate || 'Not detected',
        r.expiryDate || 'Not detected',
        r.mrp || 'Not detected',
        r.quantity || 'Not detected',
        r.packSize || 'Not detected',
        r.prescriptionStatus || 'Not detected',
        status,
        scanDate,
        scanTime,
      ].map(escapeCsv).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="medscan_records.csv"');
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// 12. Excel (XLSX) Export
apiRouter.get('/export/xlsx', async (req: Request, res: Response) => {
  try {
    await getDb();
    const scans = queryAll<ScanRow>(`SELECT * FROM scans`);
    const scanMap = new Map<string, ScanRow>();
    scans.forEach((s) => scanMap.set(s.scanId, s));

    const records = queryAll<MedicineRecordRow>(`SELECT * FROM medicine_records ORDER BY id ASC`);

    const data = records.map((r) => {
      const scan = scanMap.get(r.scanId);
      const scanDateObj = scan ? new Date(scan.scannedAt) : new Date(r.createdAt);

      return {
        'ID': r.id,
        'Scan ID': r.scanId,
        'Medicine Name': r.medicineName || 'Not detected',
        'Product Type': r.productType || 'Other',
        'Active Ingredient': r.activeIngredient || 'Not detected',
        'Strength': r.strength || 'Not detected',
        'General Indication': r.generalIndication || 'Not detected',
        'Brand': r.brandName || 'Not detected',
        'Manufacturer': r.manufacturer || 'Not detected',
        'Batch Number': r.batchNumber || 'Not detected',
        'Manufacturing Date': r.manufacturingDate || 'Not detected',
        'Expiry Date': r.expiryDate || 'Not detected',
        'MRP': r.mrp || 'Not detected',
        'Quantity': r.quantity || 'Not detected',
        'Pack Size': r.packSize || 'Not detected',
        'Prescription Status': r.prescriptionStatus || 'Not detected',
        'Status': getExpiryStatus(r.expiryDate),
        'Scan Date': scanDateObj.toLocaleDateString('en-US'),
        'Scan Time': scanDateObj.toLocaleTimeString('en-US'),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicine Records');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="medscan_records.xlsx"');
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('Export XLSX error:', err);
    return res.status(500).json({ error: 'Failed to export XLSX' });
  }
});

// 13. Database clear endpoint to reset if user requests clean slate
apiRouter.post('/clear-all', async (req: Request, res: Response) => {
  try {
    await getDb();
    execute(`DELETE FROM medicine_records`);
    execute(`DELETE FROM scans`);
    return res.json({ success: true, message: 'All scans and medicine records have been cleared. Database is now blank.' });
  } catch (err: any) {
    console.error('Clear-all error:', err);
    return res.status(500).json({ error: 'Failed to clear database records' });
  }
});

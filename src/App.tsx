import React, { useState, useEffect } from 'react';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ScanMedicinePage } from './pages/ScanMedicinePage';
import { MedicineRecordsPage } from './pages/MedicineRecordsPage';
import { ScanHistoryPage } from './pages/ScanHistoryPage';
import { ExpiryManagementPage } from './pages/ExpiryManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MedicineDetailModal } from './components/MedicineDetailModal';
import { MedicineRecord, DashboardStats } from './types';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [activeModalRecord, setActiveModalRecord] = useState<MedicineRecord | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Initial load: fetch stats (database starts completely blank by default)
    initAppData();
  }, []);

  const initAppData = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.warn('Initial data load notice:', err);
    }
  };

  const refreshStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  const handleScanSaved = (scanId: string) => {
    refreshStats();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
      {/* Navigation Sidebar & Mobile Header */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          refreshStats();
        }}
        validCount={stats?.valid}
        expiringCount={stats?.expiringSoon}
      />

      {/* Main Content Area */}
      <main className="lg:pl-64 flex-1 flex flex-col transition-all duration-200">
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-1">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onScanClick={() => setCurrentTab('scan')}
              onViewRecord={(rec) => setActiveModalRecord(rec)}
              onViewAllRecords={() => setCurrentTab('records')}
            />
          )}

          {currentTab === 'scan' && (
            <ScanMedicinePage
              onScanSaved={handleScanSaved}
              onBackToDashboard={() => setCurrentTab('dashboard')}
              onViewHistory={() => setCurrentTab('history')}
            />
          )}

          {currentTab === 'records' && (
            <MedicineRecordsPage onScanNew={() => setCurrentTab('scan')} />
          )}

          {currentTab === 'history' && (
            <ScanHistoryPage onScanNew={() => setCurrentTab('scan')} />
          )}

          {currentTab === 'expiry' && <ExpiryManagementPage />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'settings' && (
            <SettingsPage
              onDataReset={() => {
                refreshStats();
              }}
            />
          )}
        </div>

        {/* Global Medical Disclaimer Footer */}
        <footer className="border-t border-teal-100 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <p className="max-w-3xl mx-auto leading-relaxed">
            <strong>MedScan AI</strong> – Intelligent Medicine Package Information Extraction and Management System.
            <br />
            Medical Notice: Information extracted from packaging is for informational and inventory management purposes only and is not a substitute for professional medical advice.
          </p>
        </footer>
      </main>

      {/* Global Medicine Detail Modal */}
      <MedicineDetailModal
        record={activeModalRecord}
        isOpen={!!activeModalRecord}
        onClose={() => setActiveModalRecord(null)}
        onUpdate={async (updated) => {
          if (updated.id) {
            await api.updateRecord(updated.id, updated);
            refreshStats();
          }
        }}
        onDelete={async (id) => {
          await api.deleteRecord(id);
          refreshStats();
        }}
      />
    </div>
  );
}

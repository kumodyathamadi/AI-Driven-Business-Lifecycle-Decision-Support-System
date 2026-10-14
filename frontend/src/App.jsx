import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Breadcrumbs from './components/Breadcrumbs';
import Dashboard from './components/Dashboard';
import WorkspaceLayout from './components/WorkspaceLayout';
import BusinessOverview from './components/BusinessOverview';
import FeasibilityCard from './components/FeasibilityCard';
import ShapExplanation from './components/ShapExplanation';
import RecommendationsView from './components/RecommendationsView';
import TopsisTable from './components/TopsisTable';
import WhatIfSimulator from './components/WhatIfSimulator';
import BusinessPlan from './components/BusinessPlan';
import AnalysisPage from './components/workspace/AnalysisPage';
import StrategiesPage from './components/workspace/StrategiesPage';
import NotFoundPage from './components/NotFoundPage';
import { ToastProvider } from './components/common/Toast';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
function AppLayout({ activeProfile }) {
  return (
    <div className="app-container">
      <Navbar currentProfile={activeProfile} />
      <div className="main-layout">
        <main className="content-viewport">
          <Breadcrumbs activeProfile={activeProfile} />
          <Outlet />
        </main>
      </div>
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card-solid)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>SME360 AI</strong> — Professional AI Business Plan Generator
      </footer>
    </div>
  );
}

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <Routes>
              {/* Redirect /login directly to /dashboard (Login/Register form removed) */}
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />

              {/* Application Routes */}
              <Route element={<AppLayout activeProfile={activeProfile} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <Dashboard 
                      activeProfile={activeProfile} 
                      onAnalysisComplete={(p) => setActiveProfile(p)} 
                    />
                  } 
                />

                  {/* Redirect removed routes directly to /dashboard */}
                  <Route path="/businesses" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/analysis/new" element={<Navigate to="/dashboard?action=new" replace />} />
                  <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/help" element={<Navigate to="/dashboard" replace />} />

                  {/* Workspace Routes under /businesses/:id */}
                  <Route 
                    path="/businesses/:id" 
                    element={<WorkspaceLayout onProfileLoaded={(p) => setActiveProfile(p)} />}
                  >
                    <Route index element={<AnalysisPage initialSection="overview" />} />
                    <Route path="analysis" element={<AnalysisPage initialSection="overview" />} />
                    <Route path="overview" element={<AnalysisPage initialSection="overview" />} />
                    <Route path="feasibility" element={<AnalysisPage initialSection="feasibility" />} />
                    <Route path="insights" element={<AnalysisPage initialSection="key-insights" />} />
                    <Route path="strategies" element={<StrategiesPage initialSection="recommendations" />} />
                    <Route path="recommendations" element={<StrategiesPage initialSection="recommendations" />} />
                    <Route path="options" element={<StrategiesPage initialSection="options" />} />
                    <Route path="scenarios" element={<WhatIfSimulator />} />
                    <Route path="plan" element={<BusinessPlan />} />
                    <Route path="profile" element={<Navigate to="../" replace />} />
                  </Route>

                  {/* 404 Catch-All Page */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

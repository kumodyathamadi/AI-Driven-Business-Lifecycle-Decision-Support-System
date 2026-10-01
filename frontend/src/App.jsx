import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Breadcrumbs from './components/Breadcrumbs';
import Dashboard from './components/Dashboard';
import MyBusinesses from './components/MyBusinesses';
import NewAnalysisPage from './components/NewAnalysisPage';
import WorkspaceLayout from './components/WorkspaceLayout';
import BusinessOverview from './components/BusinessOverview';
import FeasibilityCard from './components/FeasibilityCard';
import ShapExplanation from './components/ShapExplanation';
import RecommendationsView from './components/RecommendationsView';
import TopsisTable from './components/TopsisTable';
import WhatIfSimulator from './components/WhatIfSimulator';
import BusinessPlan from './components/BusinessPlan';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './components/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';

function AppLayout({ activeProfile }) {
  return (
    <div className="app-container">
      <Navbar currentProfile={activeProfile} />
      <div className="main-layout">
        <Sidebar activeProfile={activeProfile} />
        <main className="content-viewport">
          <Breadcrumbs activeProfile={activeProfile} />
          <Outlet />
        </main>
      </div>
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', background: 'rgba(9, 13, 22, 0.95)' }}>
        <strong style={{ color: '#94a3b8' }}>SME360 AI</strong> - Smarter Decisions • Stronger SMEs | AI-Driven SME Business Lifecycle Decision Support System
      </footer>
    </div>
  );
}

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected SaaS Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout activeProfile={activeProfile} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard activeProfile={activeProfile} />} />
                <Route path="/businesses" element={<MyBusinesses />} />
                <Route 
                  path="/analysis/new" 
                  element={<NewAnalysisPage onAnalysisComplete={(p) => setActiveProfile(p)} />} 
                />

                {/* Workspace Routes under /businesses/:id */}
                <Route 
                  path="/businesses/:id" 
                  element={<WorkspaceLayout onProfileLoaded={(p) => setActiveProfile(p)} />}
                >
                  <Route index element={<BusinessOverview />} />
                  <Route path="feasibility" element={<FeasibilityCard />} />
                  <Route path="insights" element={<ShapExplanation />} />
                  <Route path="recommendations" element={<RecommendationsView />} />
                  <Route path="options" element={<TopsisTable />} />
                  <Route path="scenarios" element={<WhatIfSimulator />} />
                  <Route path="plan" element={<BusinessPlan />} />
                </Route>

                {/* 404 Catch-All Page */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

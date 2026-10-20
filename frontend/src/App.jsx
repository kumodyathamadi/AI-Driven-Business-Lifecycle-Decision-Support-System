import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Breadcrumbs from './components/Breadcrumbs';
import Dashboard from './components/Dashboard';
import MyBusinesses from './components/MyBusinesses';
import ReportsHistory from './components/ReportsHistory';
import WorkspaceHeader from './components/WorkspaceHeader';
import BusinessOverview from './components/BusinessOverview';
import AiIntakeAssistant from './components/AiIntakeAssistant';
import BusinessForm from './components/BusinessForm';
import FeasibilityCard from './components/FeasibilityCard';
import ShapExplanation from './components/ShapExplanation';
import TopsisTable from './components/TopsisTable';
import StrategyCard from './components/StrategyCard';
import WhatIfSimulator from './components/WhatIfSimulator';
import BusinessPlan from './components/BusinessPlan';
import ProfileViewer from './components/ProfileViewer';
import Component4RiskSuite from './components/Component4RiskSuite';
import { analyzeBusiness, fetchAnalysisRecordById } from './services/api';
import { Sparkles, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [intakeMode, setIntakeMode] = useState('ai_assistant'); // 'ai_assistant' or 'manual_form'
  const [loading, setLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState(null);
  const [structuredProfile, setStructuredProfile] = useState(null);

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    try {
      setCurrentInput(formData);
      const profileResult = await analyzeBusiness(formData);
      setStructuredProfile(profileResult);
      setActiveTab('overview');
    } catch (err) {
      alert(`Error running AI Business Analysis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecordById = async (recordId, targetTab = 'overview') => {
    setLoading(true);
    try {
      const recordData = await fetchAnalysisRecordById(recordId);
      setStructuredProfile(recordData);
      setCurrentInput(recordData.business_input);
      setActiveTab(targetTab);
    } catch (err) {
      alert(`Could not load record ${recordId}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioSuccess = (updatedProfile) => {
    setStructuredProfile(updatedProfile);
  };

  const handleExportJson = () => {
    if (!structuredProfile) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(structuredProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sme360_ai_profile_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Determine if activeTab is inside the Business Workspace
  const isWorkspaceTab = [
    'overview', 'workspace_risk', 'mitigation_plan', 'growth_readiness', 'scenarios',
    'workspace_history', 'plan', 'profile', 'feasibility', 'insights', 'recommendations',
    'options', 'scenario', 'history'
  ].includes(activeTab);

  return (
    <div className="app-container">
      {/* Top Navbar Header */}
      <Navbar currentProfile={structuredProfile} onExportJson={handleExportJson} />

      {/* Main SaaS Layout with Sidebar + Content Viewport */}
      <div className="main-layout">

        {/* Left Sidebar Navigation (4 primary destinations + context-sensitive workspace) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeProfile={structuredProfile}
        />

        {/* Primary Content Viewport */}
        <main className="content-viewport">

          {/* Top Breadcrumb Navigation */}
          <Breadcrumbs
            activeTab={activeTab}
            activeProfile={structuredProfile}
            onNavigate={setActiveTab}
          />

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 1: HOME DASHBOARD                                     */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <Dashboard
              activeProfile={structuredProfile}
              onStartNew={() => setActiveTab('new_analysis')}
              onViewMyBusinesses={() => setActiveTab('my_businesses')}
              onSelectRecord={handleSelectRecordById}
              onNavigateToRiskAssessment={() => setActiveTab('component4_risk')}
              onNavigateToReports={() => setActiveTab('reports_history')}
            />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 2: MY BUSINESSES                                      */}
          {/* ========================================================================= */}
          {activeTab === 'my_businesses' && (
            <MyBusinesses
              onSelectRecord={handleSelectRecordById}
              onStartNew={() => setActiveTab('new_analysis')}
              onAssessBusiness={() => setActiveTab('component4_risk')}
            />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 3: RISK ASSESSMENT (Component 4 Guided 5-Step Flow)   */}
          {/* ========================================================================= */}
          {activeTab === 'component4_risk' && (
            <Component4RiskSuite initialPlanData={structuredProfile} />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 4: REPORTS & HISTORY                                  */}
          {/* ========================================================================= */}
          {activeTab === 'reports_history' && (
            <ReportsHistory
              onSelectRecord={handleSelectRecordById}
              onOpenComponent4Assessment={() => setActiveTab('component4_risk')}
            />
          )}

          {/* ========================================================================= */}
          {/* SECONDARY UTILITY: NEW ANALYSIS INTAKE (AI Assistant or Manual Form)     */}
          {/* ========================================================================= */}
          {activeTab === 'new_analysis' && (
            <div>
              {intakeMode === 'ai_assistant' ? (
                <AiIntakeAssistant
                  onCompleteIntake={handleFormSubmit}
                  onSwitchToManual={() => setIntakeMode('manual_form')}
                />
              ) : (
                <BusinessForm
                  onSubmit={handleFormSubmit}
                  loading={loading}
                  onSwitchToAi={() => setIntakeMode('ai_assistant')}
                />
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* BUSINESS WORKSPACE SECTIONS (Section 5)                                   */}
          {/* ========================================================================= */}
          {isWorkspaceTab && structuredProfile && (
            <div>
              {/* Workspace Header with Business Name, Unique ID, Stage, Date, Status */}
              <WorkspaceHeader
                profile={structuredProfile}
                activeTab={activeTab}
                onNavigate={setActiveTab}
              />

              {/* Workspace Section 1: Business Overview */}
              {activeTab === 'overview' && (
                <BusinessOverview
                  profile={structuredProfile}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Workspace Section 2: Risk Assessment */}
              {activeTab === 'workspace_risk' && (
                <Component4RiskSuite initialPlanData={structuredProfile} />
              )}

              {/* Workspace Section 3: Mitigation Plan (Recommendations + TOPSIS Ranking) */}
              {(activeTab === 'mitigation_plan' || activeTab === 'recommendations' || activeTab === 'options') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Sparkles size={22} style={{ color: '#c084fc' }} />
                      Strategic Mitigation Plan &amp; Options Ranking
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                      Contextual strategic directions prioritized using multi-criteria TOPSIS evaluation to improve business longevity and capital efficiency.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {structuredProfile.strategic_recommendations?.candidate_strategies?.map((strat, idx) => (
                      <StrategyCard key={idx} strategy={strat} rank={idx + 1} />
                    ))}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                      Multi-Criteria TOPSIS Decision Ranking
                    </h4>
                    <TopsisTable topsisRanking={structuredProfile.strategic_recommendations?.topsis_ranking} />
                  </div>
                </div>
              )}

              {/* Workspace Section 4: Growth Readiness & Feasibility */}
              {(activeTab === 'growth_readiness' || activeTab === 'feasibility' || activeTab === 'insights') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <FeasibilityCard
                    feasibilityData={structuredProfile.feasibility_analysis}
                    executiveSummary={structuredProfile.personalized_business_plan?.executive_overview?.business_summary}
                  />
                  <ShapExplanation shapData={structuredProfile.explainability} />
                </div>
              )}

              {/* Workspace Section 5: Scenarios (What-If Simulator) */}
              {(activeTab === 'scenarios' || activeTab === 'scenario') && (
                <WhatIfSimulator
                  scenarioData={structuredProfile.scenario_analysis}
                  currentInput={currentInput}
                  onScenarioSuccess={handleScenarioSuccess}
                />
              )}

              {/* Workspace Section 6: Assessment History */}
              {(activeTab === 'workspace_history' || activeTab === 'history') && (
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Clock size={18} style={{ color: '#60a5fa' }} />
                    Assessment History for this Enterprise
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Evaluation runs associated with reference ID <code>{structuredProfile.metadata?.record_id}</code>.
                  </p>

                  <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#ffffff' }}>Latest Evaluation Run</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Recorded on: {new Date(structuredProfile.metadata?.generated_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                        {structuredProfile.feasibility_analysis?.predicted_label || 'Evaluated'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Section 7: Business Plan Document */}
              {activeTab === 'plan' && (
                <BusinessPlan profile={structuredProfile} />
              )}

              {/* Business Profile Viewer */}
              {activeTab === 'profile' && (
                <ProfileViewer profile={structuredProfile} onExportJson={handleExportJson} />
              )}
            </div>
          )}

          {/* When user clicks a workspace tab without having a profile selected */}
          {isWorkspaceTab && !structuredProfile && (
            <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '14px' }}>
              <Briefcase size={42} style={{ color: '#64748b', marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                No Business Selected for Workspace
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: '1.5rem', maxWidth: '520px', margin: '0.35rem auto 1.5rem auto' }}>
                Please select an enterprise from <strong>My Businesses</strong> or evaluate a business in <strong>Risk Assessment</strong> to view detailed workspace metrics, mitigations, and scenarios.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => setActiveTab('my_businesses')} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                  Browse My Businesses
                </button>
                <button onClick={() => setActiveTab('component4_risk')} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                  <ShieldAlert size={15} />
                  Assess a Business
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Product Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', background: 'rgba(9, 13, 22, 0.95)' }}>
        <strong style={{ color: '#94a3b8' }}>SME360 AI</strong> &bull; Smarter Decisions &bull; Stronger SMEs | AI-Driven SME Business Lifecycle Decision Support System
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Component4Overview from './components/Component4Overview';
import Component4RiskSuite from './components/Component4RiskSuite';
import MyAssessments from './components/MyAssessments';
import Component4Reports from './components/Component4Reports';
import Component4Scenarios from './components/Component4Scenarios';
import WorkspaceContextBar from './components/WorkspaceContextBar';
import { getComponent4Analysis } from './services/api';

export default function App() {
  // Navigation State
  // Global Tabs: 'overview', 'new_assessment', 'my_assessments', 'reports'
  // Contextual Tabs: 'c4_profile', 'c4_risk_results', 'c4_gnn_insights', 'c4_mitigation_plan', 'c4_growth_readiness', 'c4_scenarios'
  const [activeTab, setActiveTab] = useState('overview');
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [preSelectedBusiness, setPreSelectedBusiness] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Check if current tab is a contextual active-assessment workspace tab
  const isContextualTab = [
    'c4_profile', 
    'c4_risk_results', 
    'c4_gnn_insights', 
    'c4_mitigation_plan', 
    'c4_growth_readiness', 
    'c4_scenarios'
  ].includes(activeTab);

  // Open an assessment from Overview, My Assessments, or Reports
  const handleSelectAssessment = async (analysisId, businessId = null) => {
    if (!analysisId) {
      setActiveTab('new_assessment');
      return;
    }
    setLoadingAssessment(true);
    try {
      const res = await getComponent4Analysis(analysisId);
      const data = res?.data || res;
      setActiveAssessment(data);
      setActiveTab('c4_risk_results');
    } catch (err) {
      console.warn('Could not fetch full analysis by ID, using stub/fallback:', err);
      // Fallback object so workspace still opens
      const fallback = {
        analysis_id: analysisId,
        business_id: businessId || 'SME-FALLBACK',
        business_name: businessId || 'Registered Enterprise',
        overall_risk_level: 'MEDIUM',
        overall_risk_category: 'MEDIUM'
      };
      setActiveAssessment(fallback);
      setActiveTab('c4_risk_results');
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Start new assessment workflow
  const handleStartNewAssessment = () => {
    setPreSelectedBusiness(null);
    setActiveTab('new_assessment');
  };

  // Re-assess an existing business from My Assessments
  const handleStartNewForBusiness = (biz) => {
    setPreSelectedBusiness(biz);
    setActiveTab('new_assessment');
  };

  // When assessment is executed and loaded in Component4RiskSuite
  const handleAssessmentLoaded = (data) => {
    setActiveAssessment(data);
  };

  // Clear active assessment and return to Overview
  const handleCloseActiveAssessment = () => {
    setActiveAssessment(null);
    setActiveTab('overview');
  };

  return (
    <div className="app-container">
      {/* Top Professional Header */}
      <Navbar />

      {/* Main SaaS Layout: Sidebar + Primary Content Viewport */}
      <div className="main-layout">
        {/* Scoped Sidebar: 4 primary destinations + contextual active assessment */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeAssessment={activeAssessment}
          onClearActiveAssessment={handleCloseActiveAssessment}
        />

        {/* Primary Content Viewport */}
        <main className="content-viewport">
          
          {/* Top Workspace Context Bar (Visible only when in active assessment contextual tabs) */}
          {isContextualTab && activeAssessment && (
            <WorkspaceContextBar
              activeAssessment={activeAssessment}
              activeTab={activeTab}
              onNavigate={setActiveTab}
              onCloseAssessment={handleCloseActiveAssessment}
            />
          )}

          {/* Loading indicator when switching assessments */}
          {loadingAssessment && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading assessment data...
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 1: OVERVIEW DASHBOARD                                 */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <Component4Overview
              onStartNewAssessment={handleStartNewAssessment}
              onSelectAssessment={handleSelectAssessment}
              onViewMyAssessments={() => setActiveTab('my_assessments')}
            />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 2: NEW RISK ASSESSMENT (6-Step Guided Flow)           */}
          {/* ========================================================================= */}
          {activeTab === 'new_assessment' && (
            <Component4RiskSuite
              initialPlanData={preSelectedBusiness ? { business_id: preSelectedBusiness.id, business_name: preSelectedBusiness.business_name } : null}
              initialStep={1}
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 3: MY ASSESSMENTS                                     */}
          {/* ========================================================================= */}
          {activeTab === 'my_assessments' && (
            <MyAssessments
              onSelectAssessment={handleSelectAssessment}
              onStartNewForBusiness={handleStartNewForBusiness}
              onStartNewAssessment={handleStartNewAssessment}
            />
          )}

          {/* ========================================================================= */}
          {/* PRIMARY DESTINATION 4: REPORTS & DOWNLOADS                                */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            <Component4Reports
              onSelectAssessment={handleSelectAssessment}
            />
          )}

          {/* ========================================================================= */}
          {/* CONTEXTUAL WORKSPACE SECTIONS FOR ACTIVE ASSESSMENT                       */}
          {/* ========================================================================= */}

          {/* Contextual Section 1: Business Profile */}
          {activeTab === 'c4_profile' && activeAssessment && (
            <Component4RiskSuite
              initialPlanData={activeAssessment}
              initialStep={2}
              activeContextTab="c4_profile"
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* Contextual Section 2: Risk Assessment Results */}
          {activeTab === 'c4_risk_results' && activeAssessment && (
            <Component4RiskSuite
              initialPlanData={activeAssessment}
              initialStep={4}
              activeContextTab="c4_risk_results"
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* Contextual Section 3: GNN Insights */}
          {activeTab === 'c4_gnn_insights' && activeAssessment && (
            <Component4RiskSuite
              initialPlanData={activeAssessment}
              initialStep={5}
              activeContextTab="c4_gnn_insights"
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* Contextual Section 4: Mitigation Plan */}
          {activeTab === 'c4_mitigation_plan' && activeAssessment && (
            <Component4RiskSuite
              initialPlanData={activeAssessment}
              initialStep={6}
              activeContextTab="c4_mitigation_plan"
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* Contextual Section 5: Growth Readiness */}
          {activeTab === 'c4_growth_readiness' && activeAssessment && (
            <Component4RiskSuite
              initialPlanData={activeAssessment}
              initialStep={6}
              activeContextTab="c4_growth_readiness"
              onAssessmentLoaded={handleAssessmentLoaded}
            />
          )}

          {/* Contextual Section 6: Scenario Analysis */}
          {activeTab === 'c4_scenarios' && activeAssessment && (
            <Component4Scenarios
              activeAssessment={activeAssessment}
            />
          )}

        </main>
      </div>

      {/* Product Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '0.85rem 2rem', 
        textAlign: 'center', 
        fontSize: '0.72rem', 
        color: 'var(--text-muted)', 
        background: 'var(--bg-surface)' 
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>SME360 AI &middot; Component 4</strong> &bull; GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation System
      </footer>
    </div>
  );
}

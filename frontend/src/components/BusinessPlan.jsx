import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { downloadBusinessPlanPdf, downloadBusinessPlanDocx } from '../services/api';
import { useToast } from './common/Toast';

import './plan/business_plan.css';
import PlanCover from './plan/PlanCover';
import PlanSnapshot from './plan/PlanSnapshot';
import PlanContents from './plan/PlanContents';
import PlanSection01Overview from './plan/PlanSection01Overview';
import PlanSection02Feasibility from './plan/PlanSection02Feasibility';
import PlanSection03Recommendations from './plan/PlanSection03Recommendations';
import PlanSection04FinanceOps from './plan/PlanSection04FinanceOps';
import PlanSection05ScenariosRoadmap from './plan/PlanSection05ScenariosRoadmap';
import PlanHighlightsSidebar from './plan/PlanHighlightsSidebar';
import FinalSummary from './plan/FinalSummary';

export default function BusinessPlan({ profile: propProfile }) {
  const ctx = useOutletContext();
  const profile = propProfile || ctx?.profile;
  const toast = useToast();
  
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Section open/closed state: Open only the first section by default
  const [openSections, setOpenSections] = useState({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  const toggleSection = (sectionNum) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionNum]: !prev[sectionNum]
    }));
  };

  const jumpToSection = (sectionNum, sectionId) => {
    // Expand the target section
    setOpenSections(prev => ({
      ...prev,
      [sectionNum]: true
    }));

    // Smooth scroll to the target section
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  if (!profile) return null;

  const planData = profile.personalized_business_plan || profile.business_plan || {};
  const {
    executive_overview = {},
    operational_plan = {},
    marketing_plan = {},
    financial_plan = {},
    action_roadmap = {},
  } = planData;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      // Keep the unique official cover page provided for exported documents
      const payload = { ...profile, cover_image: 'default' };
      await downloadBusinessPlanPdf(payload);
      if (toast?.success) toast.success('PDF plan generated and downloaded successfully!');
      else if (toast?.showToast) toast.showToast('PDF plan generated and downloaded successfully!', 'success');
    } catch (err) {
      if (toast?.error) toast.error(`PDF generation failed: ${err.message}`);
      else if (toast?.showToast) toast.showToast(`PDF generation failed: ${err.message}`, 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      // Keep the unique official cover page provided for exported documents
      const payload = { ...profile, cover_image: 'default' };
      await downloadBusinessPlanDocx(payload);
      if (toast?.success) toast.success('Word document (.docx) exported successfully!');
      else if (toast?.showToast) toast.showToast('Word document (.docx) exported successfully!', 'success');
    } catch (err) {
      if (toast?.error) toast.error(`Word document generation failed: ${err.message}`);
      else if (toast?.showToast) toast.showToast(`Word document generation failed: ${err.message}`, 'error');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      if (toast?.success) toast.success('Shareable business plan link copied to clipboard!');
      else if (toast?.showToast) toast.showToast('Shareable business plan link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bp-container">
      
      {/* 1. Cover Card: Title, Badges, Meta Line & 4 Actions (Download PDF primary, Word, Share, Print) */}
      <PlanCover
        profile={profile}
        executiveOverview={executive_overview}
        downloadingPdf={downloadingPdf}
        downloadingDocx={downloadingDocx}
        copiedLink={copiedLink}
        onDownloadPdf={handleDownloadPdf}
        onDownloadDocx={handleDownloadDocx}
        onShareLink={handleShareLink}
        onPrint={handlePrint}
      />

      {/* 2. Key Figures Row (Six Tiles) */}
      <PlanSnapshot
        profile={profile}
        financialPlan={financial_plan}
        marketingPlan={marketing_plan}
      />

      {/* 3. Two-Column Body on Desktop */}
      <div className="bp-layout">
        
        {/* Left (Sticky): Plan Contents List with Anchor Links + Key Plan Highlights */}
        <aside className="bp-left-column">
          <PlanContents
            openSections={openSections}
            onSelectSection={jumpToSection}
          />

          <div className="bp-sidebar-highlights-wrapper">
            <PlanHighlightsSidebar
              profile={profile}
              executiveOverview={executive_overview}
              financialPlan={financial_plan}
              marketingPlan={marketing_plan}
              downloadingPdf={downloadingPdf}
              downloadingDocx={downloadingDocx}
              copiedLink={copiedLink}
              onDownloadPdf={handleDownloadPdf}
              onDownloadDocx={handleDownloadDocx}
              onShareLink={handleShareLink}
              onPrint={handlePrint}
            />
          </div>
        </aside>

        {/* Right: The Plan Sections as Collapsible Panels */}
        <main className="bp-document" id="plan-main-content">
          
          {/* SECTION 01 — Business & Market Overview */}
          <PlanSection01Overview
            profile={profile}
            isOpen={openSections[1]}
            onToggle={() => toggleSection(1)}
          />

          {/* SECTION 02 — AI Feasibility & Key Insights */}
          <PlanSection02Feasibility
            profile={profile}
            isOpen={openSections[2]}
            onToggle={() => toggleSection(2)}
          />

          {/* SECTION 03 — Strategic Recommendations & TOPSIS Ranking */}
          <PlanSection03Recommendations
            profile={profile}
            isOpen={openSections[3]}
            onToggle={() => toggleSection(3)}
          />

          {/* SECTION 04 — Financial & Operational Plan (Strategy-Aligned) */}
          <PlanSection04FinanceOps
            profile={profile}
            isOpen={openSections[4]}
            onToggle={() => toggleSection(4)}
          />

          {/* SECTION 05 — Scenario Analysis & Action Roadmap */}
          <PlanSection05ScenariosRoadmap
            profile={profile}
            isOpen={openSections[5]}
            onToggle={() => toggleSection(5)}
          />

          {/* 5. Final AI Recommendation & Operational Summary block at the end */}
          <FinalSummary
            profile={profile}
          />

        </main>

      </div>

    </div>
  );
}

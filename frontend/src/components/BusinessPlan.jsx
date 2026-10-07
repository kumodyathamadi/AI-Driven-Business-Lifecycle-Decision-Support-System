import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { downloadBusinessPlanPdf, downloadBusinessPlanDocx } from '../services/api';
import { useToast } from './common/Toast';

import './plan/business_plan.css';
import PlanHeader from './plan/PlanHeader';
import PlanSnapshot from './plan/PlanSnapshot';
import PlanSection01Overview from './plan/PlanSection01Overview';
import PlanSection02Feasibility from './plan/PlanSection02Feasibility';
import PlanSection03Recommendations from './plan/PlanSection03Recommendations';
import PlanSection04FinanceOps from './plan/PlanSection04FinanceOps';
import PlanSection05ScenariosRoadmap from './plan/PlanSection05ScenariosRoadmap';
import PlanHighlightsSidebar from './plan/PlanHighlightsSidebar';

export default function BusinessPlan({ profile: propProfile }) {
  const ctx = useOutletContext();
  const profile = propProfile || ctx?.profile;
  const toast = useToast();
  
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
      await downloadBusinessPlanPdf(profile);
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
      await downloadBusinessPlanDocx(profile);
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
      
      {/* 1. Header / Hero: Document Title, Metadata & Actions */}
      <PlanHeader
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

      {/* 2. Executive Summary — "Business Plan at a Glance" */}
      <PlanSnapshot
        profile={profile}
        financialPlan={financial_plan}
        marketingPlan={marketing_plan}
      />

      {/* 3. Two-Column Layout: Main Continuous Document + Sticky Highlights Sidebar */}
      <div className="bp-layout">
        
        {/* Main Continuous Research & Decision Document */}
        <main className="bp-document">
          
          {/* SECTION 01 — Business & Market Overview */}
          <PlanSection01Overview
            profile={profile}
          />

          {/* SECTION 02 — AI Feasibility & Key Insights */}
          <PlanSection02Feasibility
            profile={profile}
          />

          {/* SECTION 03 — Strategic Recommendations & TOPSIS Ranking */}
          <PlanSection03Recommendations
            profile={profile}
          />

          {/* SECTION 04 — Financial & Operational Plan (Strategy-Aligned) */}
          <PlanSection04FinanceOps
            profile={profile}
          />

          {/* SECTION 05 — Scenario Analysis & Action Roadmap */}
          <PlanSection05ScenariosRoadmap
            profile={profile}
          />

        </main>

        {/* Desktop Sticky Highlights Sidebar */}
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

    </div>
  );
}

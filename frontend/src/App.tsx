import React, { useState } from 'react';
import { RegistrationComplianceDashboard } from './components/component2.tsx';

export const App: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<'comp1' | 'comp2' | 'comp3' | 'comp4'>('comp2');

  return (
    <div className="w-full h-screen overflow-hidden flex bg-slate-100 font-sans">
      {activeComponent === 'comp2' ? (
        <RegistrationComplianceDashboard />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-700">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 mb-4 text-2xl">
            <i className="fa-solid fa-cubes"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {activeComponent === 'comp1' && 'Component 1 — Idea & Feasibility Analysis'}
            {activeComponent === 'comp3' && 'Component 3 — Financial Management & Fraud Monitoring'}
            {activeComponent === 'comp4' && 'Component 4 — Business Monitoring & Growth Advisory'}
          </h2>
          <p className="text-sm text-slate-500 max-w-md text-center mb-6">
            This lifecycle module is integrated within the LifeCycle AI Decision Support System. Switch back to Component 2 to view the active Business Registration & Regulatory Compliance engine.
          </p>
          <button
            onClick={() => setActiveComponent('comp2')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-shield-halved"></i>
            Open Component 2 (Registration & Compliance)
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiIntakeAssistant from './AiIntakeAssistant';
import BusinessForm from './BusinessForm';
import { analyzeBusiness } from '../services/api';
import { useToast } from './common/Toast';

export default function NewAnalysisPage({ onAnalysisComplete }) {
  const [intakeMode, setIntakeMode] = useState('ai_assistant'); // 'ai_assistant' or 'manual_form'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    try {
      const profileResult = await analyzeBusiness(formData);
      const recordId = profileResult.metadata?.record_id;

      if (onAnalysisComplete) {
        onAnalysisComplete(profileResult);
      }

      toast.success('Business feasibility analysis completed successfully!');

      if (recordId) {
        navigate(`/businesses/${recordId}/feasibility`);
      } else {
        navigate('/businesses');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(`Analysis failed: ${err.message}`);
      alert(`Error running AI Business Analysis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}

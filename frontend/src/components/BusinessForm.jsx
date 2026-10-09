import React from 'react';
import NewBusinessForm from './NewBusinessForm';
import ExistingBusinessGrowthForm from './ExistingBusinessGrowthForm';

export { NewBusinessForm, ExistingBusinessGrowthForm };

/**
 * BusinessForm — Dual-Form Dispatcher Component
 * 
 * Dynamically routes to the appropriate specialized intake experience:
 * - NewBusinessForm: For entrepreneurs starting a new startup.
 * - ExistingBusinessGrowthForm: For existing businesses pursuing strategic growth & expansion.
 */
export default function BusinessForm(props) {
  const stage = (props.selectedStage || props.initialValues?.business_stage || '').toLowerCase();
  const isExisting = stage.includes('exist');

  if (isExisting) {
    return <ExistingBusinessGrowthForm {...props} />;
  }
  return <NewBusinessForm {...props} />;
}

import { useState, useEffect, useRef, useCallback } from 'react';

export const DRAFT_STORAGE_KEY = 'sme360:startup-intake-draft';

/**
 * useFormDraft
 * Custom hook to safely auto-save form state and step to localStorage.
 * Features:
 * - Debounced writes (400ms)
 * - Safe error handling (try/catch)
 * - Restores draft on demand
 * - Cleans up on submit/discard
 */
export function useFormDraft({ formData, currentStep, isDirty, storageKey = DRAFT_STORAGE_KEY }) {
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [availableDraft, setAvailableDraft] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(null);

  const debounceTimerRef = useRef(null);

  // Check for existing draft on initial mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.formData && typeof parsed.formData === 'object') {
          // Check if the draft has any actual entered data
          const hasData = Object.entries(parsed.formData).some(
            ([k, v]) => k !== 'business_stage' && v !== '' && v !== null && v !== undefined
          );
          if (hasData) {
            setAvailableDraft(parsed);
            setShowDraftBanner(true);
            setLastSavedTimestamp(parsed.savedAt || null);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read draft from localStorage:', err);
    }
  }, [storageKey]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        setSaveStatus('saving');
        const payload = {
          formData,
          currentStep,
          savedAt: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setSaveStatus('saved');
        setLastSavedTimestamp(Date.now());
      } catch (err) {
        console.warn('Failed to auto-save draft to localStorage:', err);
        setSaveStatus('idle');
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, currentStep, isDirty, storageKey]);

  // Synchronous immediate save (e.g. on "Save draft & close")
  const saveDraftNow = useCallback((data, step) => {
    try {
      const payload = {
        formData: data || formData,
        currentStep: step || currentStep,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setSaveStatus('saved');
      setLastSavedTimestamp(Date.now());
      return true;
    } catch (err) {
      console.warn('Failed to save draft immediately:', err);
      return false;
    }
  }, [formData, currentStep, storageKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setAvailableDraft(null);
      setShowDraftBanner(false);
      setSaveStatus('idle');
    } catch (err) {
      console.warn('Failed to remove draft from localStorage:', err);
    }
  }, [storageKey]);

  const dismissDraftBanner = useCallback(() => {
    setShowDraftBanner(false);
  }, []);

  return {
    saveStatus,
    availableDraft,
    showDraftBanner,
    lastSavedTimestamp,
    saveDraftNow,
    clearDraft,
    dismissDraftBanner,
  };
}

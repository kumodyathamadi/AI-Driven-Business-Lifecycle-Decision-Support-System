import React, { useRef, useState } from 'react';
import { 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  FileText
} from 'lucide-react';

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export default function PlanCoverUploader({ coverImage, onCoverImageChange }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateAndProcessFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    // 1. Extension check
    const extension = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setErrorMessage(`Unsupported format (.${extension}). Allowed formats: PNG, JPG, JPEG, WEBP.`);
      return;
    }

    // 2. MIME type check
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (file.type && !validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file type. Please upload a PNG, JPG, JPEG, or WEBP image.');
      return;
    }

    // 3. Size check (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Image is too large (${sizeMb} MB). Maximum allowed size is 10 MB.`);
      return;
    }

    // 4. Read as Base64 Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      onCoverImageChange({
        dataUrl,
        name: file.name,
        sizeBytes: file.size,
        type: file.type || `image/${extension}`,
        formattedSize: (file.size / 1024).toFixed(0) + ' KB'
      });
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.value = '';
    onCoverImageChange(null);
    setErrorMessage('');
  };

  const handleUseOfficial = (e) => {
    if (e) e.stopPropagation();
    onCoverImageChange({
      dataUrl: 'default',
      previewUrl: '/assets/sme360_official_cover.png',
      name: 'SME360_Official_Cover_2026.png',
      formattedSize: '245 KB',
      type: 'image/png',
      isOfficial: true
    });
    setErrorMessage('');
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <section className="bp-cover-uploader-card" aria-label="Cover Page Configuration">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        id="bp-cover-image-input"
      />

      <div className="bp-cover-uploader-header">
        <div className="bp-cover-header-title-group">
          <div className="bp-cover-header-icon-wrap">
            <ImageIcon size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <h3 className="bp-cover-title">Report Cover Page (Page 1)</h3>
            <p className="bp-cover-subtitle">
              User-provided cover image rendered in full A4 format on <strong>Page 1</strong> of the Business Plan.
            </p>
          </div>
        </div>

        {coverImage ? (
          <span className="bp-badge-pill adopted" style={{ fontSize: '0.74rem' }}>
            <CheckCircle2 size={13} />
            <span>{coverImage.isOfficial ? 'Official Cover Active' : 'Custom Cover Active'}</span>
          </span>
        ) : (
          <span className="bp-badge-pill stage" style={{ fontSize: '0.72rem' }}>
            <span>No Cover (Standard 8-Page Plan)</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="bp-cover-error-alert" role="alert">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {!coverImage ? (
        /* Empty / Upload State */
        <div 
          className={`bp-cover-dropzone ${dragActive ? 'drag-active' : ''}`}
          onClick={handleTriggerUpload}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTriggerUpload(); }}
        >
          <div className="bp-cover-dropzone-icon">
            <UploadCloud size={30} style={{ color: dragActive ? '#38bdf8' : '#60a5fa' }} />
          </div>
          <div className="bp-cover-dropzone-text" style={{ flex: 1 }}>
            <span className="bp-cover-dropzone-primary">
              Click to browse or drag & drop a custom Cover Page image
            </span>
            <span className="bp-cover-dropzone-secondary">
              Supported formats: <strong>PNG, JPG, JPEG, WEBP</strong> • Max file size: <strong>10 MB</strong> • Recommended: <strong>A4 Portrait</strong>
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', background: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}
            onClick={(e) => { e.stopPropagation(); handleUseOfficial(e); }}
            title="Restore the official SME360 AI Cover Page"
          >
            <Sparkles size={14} style={{ color: '#38bdf8' }} />
            <span>Use Official Cover</span>
          </button>
        </div>
      ) : (
        /* Active Preview & Controls State */
        <div className="bp-cover-preview-container">
          {/* A4 Proportion Miniature Preview Frame */}
          <div className="bp-cover-preview-frame" title="Cover Page Preview (A4 Portrait)">
            <img 
              src={coverImage.previewUrl || coverImage.dataUrl} 
              alt="Custom Cover Page Preview" 
              className="bp-cover-preview-img"
            />
            <div className="bp-cover-preview-tag">
              <Sparkles size={11} />
              <span>PAGE 1 COVER</span>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="bp-cover-preview-info">
            <div className="bp-cover-notice-card">
              <div className="bp-cover-notice-title">
                <CheckCircle2 size={15} style={{ color: '#34d399', flexShrink: 0 }} />
                <strong>This image will appear as Page 1 of the generated Business Plan.</strong>
              </div>
              <p className="bp-cover-notice-desc">
                Your cover image will occupy Page 1 in full A4 presentation without headers or footers. The complete Strategic Business Plan content will begin on Page 2.
              </p>
            </div>

            <div className="bp-cover-meta-row">
              <span className="bp-cover-meta-item">
                <FileText size={13} style={{ color: '#94a3b8' }} />
                <span>File: <strong>{coverImage.name}</strong></span>
              </span>
              <span className="bp-cover-meta-item">
                <span>Size: <strong>{coverImage.formattedSize}</strong></span>
              </span>
              <span className="bp-cover-meta-item">
                <span>Format: <strong>{coverImage.type.replace('image/', '').toUpperCase()}</strong></span>
              </span>
            </div>

            <div className="bp-cover-action-buttons">
              <button
                type="button"
                className="btn btn-secondary bp-cover-btn"
                onClick={handleTriggerUpload}
                title="Select a different image to replace current cover"
              >
                <RefreshCw size={14} />
                <span>Replace Cover</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary bp-cover-btn-remove"
                onClick={handleRemove}
                title="Remove cover image and restore standard report format"
              >
                <Trash2 size={14} />
                <span>Remove Cover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

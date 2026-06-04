"use client";

import { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignaturePad({ onSave, onClear, translations }) {
  const padRef = useRef(null);

  // Resize handler to ensure canvas drawing coordinates align correctly
  useEffect(() => {
    const handleResize = () => {
      if (padRef.current) {
        padRef.current.clear(); // Clear canvas to reinitialize dimensions
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClear = () => {
    if (padRef.current) {
      padRef.current.clear();
      if (onClear) onClear();
    }
  };

  const handleSave = () => {
    if (padRef.current) {
      if (padRef.current.isEmpty()) {
        alert(translations.signatureRequired);
        return;
      }
      const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
      if (onSave) onSave(dataUrl);
    }
  };

  return (
    <div className="signature-container">
      <div className="signature-pad-wrapper">
        <SignatureCanvas
          ref={padRef}
          penColor="#061c3d"
          canvasProps={{
            className: "signature-canvas"
          }}
        />
      </div>
      <div className="signature-actions">
        <button type="button" className="btn btn-secondary" onClick={handleClear}>
          {translations.clear}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          {translations.save}
        </button>
      </div>
    </div>
  );
}

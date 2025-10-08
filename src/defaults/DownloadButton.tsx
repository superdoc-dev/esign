import React from "react";
import type { DownloadButtonProps, DownloadConfig } from "../types";

export const createDownloadButton = (config?: DownloadConfig) => {
  const Component: React.FC<DownloadButtonProps> = ({
    onClick,
    fileName,
    isDisabled,
  }) => {
    const label = config?.label || "Download";

    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`superdoc-esign-btn superdoc-esign-document-control`}
        style={{
          padding: "10px 20px",
          borderRadius: "6px",
          border: "none",
          background: "#fff",
          color: "#333",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {label} {fileName && `(${fileName})`}
      </button>
    );
  };

  return Component;
};

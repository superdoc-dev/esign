import React from "react";
import type { SubmitButtonProps, SubmitConfig } from "../types";

export const createSubmitButton = (config?: SubmitConfig) => {
  const Component: React.FC<SubmitButtonProps> = ({
    onClick,
    isValid,
    isDisabled,
    isSubmitting,
  }) => {
    const getLabel = () => {
      return config?.label || "Submit";
    };

    return (
      <button
        onClick={onClick}
        disabled={!isValid || isDisabled || isSubmitting}
        className={`superdoc-esign-btn superdoc-esign-form-action`}
        style={{
          padding: "12px 24px",
          borderRadius: "6px",
          border: "none",
          background: "#007bff",
          color: "#fff",
          cursor: !isValid || isDisabled ? "not-allowed" : "pointer",
          opacity: !isValid || isDisabled ? 0.5 : 1,
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {getLabel()}
      </button>
    );
  };

  return Component;
};

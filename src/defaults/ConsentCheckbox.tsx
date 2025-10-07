import React from "react";
import type { FieldComponentProps } from "../types";

export const ConsentCheckbox: React.FC<FieldComponentProps> = ({
  value,
  onChange,
  isDisabled,
  label,
}) => {
  return (
    <label
      className="superdoc-esign-consent-checkbox"
      style={{ display: "flex", gap: "8px" }}
    >
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={isDisabled}
      />
      <span>{label}</span>
    </label>
  );
};

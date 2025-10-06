import React from "react";
import type { FieldComponentProps } from "../types";

export const SignatureInput: React.FC<FieldComponentProps> = ({
  value,
  onChange,
  isDisabled,
  label,
}) => {
  return (
    <div className="superdoc-esign-signature-input">
      {label && <label>{label}</label>}
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        placeholder="Type your full name"
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "18px",
          fontFamily: "cursive",
          borderBottom: "2px solid #333",
        }}
      />
    </div>
  );
};

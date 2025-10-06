import React from "react";
import type { FieldComponentProps } from "../types";

export const SignatureInput: React.FC<FieldComponentProps> = ({
  value,
  onChange,
  isDisabled,
  label,
}) => {
  return (
    <div>
      {label && <label>{label}</label>}
      <input
        type="text"
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        placeholder="Type your full name"
        style={{
          fontFamily: "cursive",
          fontSize: "18px",
        }}
      />
    </div>
  );
};

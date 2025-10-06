import React, { useState } from "react";
import type { FieldComponentProps } from "../types";

export const SignatureInput: React.FC<FieldComponentProps> = ({
  onChange,
  isDisabled,
  label,
}) => {
  const [text, setText] = useState("");

  const updateSignature = (newText: string) => {
    setText(newText);

    // Always output as image data URL
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (newText) {
      ctx.font = "italic 30px cursive";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(newText, canvas.width / 2, canvas.height / 2);
    }

    onChange(canvas.toDataURL());
  };

  return (
    <div className="superdoc-esign-signature-input">
      {label && <label>{label}</label>}
      <input
        type="text"
        value={text}
        onChange={(e) => updateSignature(e.target.value)}
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

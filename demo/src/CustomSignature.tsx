import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import type { FieldComponentProps } from '@superdoc-dev/esign';

const CustomSignature: React.FC<FieldComponentProps> = ({ value, onChange, isDisabled, label }) => {
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const switchMode = (newMode: 'type' | 'draw') => {
    setMode(newMode);
    onChange('');
    if (newMode === 'draw' && signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const clearCanvas = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onChange('');
    }
  };

  useEffect(() => {
    if (!canvasRef.current || mode !== 'draw') return;

    signaturePadRef.current = new SignaturePad(canvasRef.current, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    if (isDisabled) {
      signaturePadRef.current.off();
    }

    signaturePadRef.current.addEventListener('endStroke', () => {
      if (signaturePadRef.current) {
        onChange(signaturePadRef.current.toDataURL());
      }
    });

    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [mode, isDisabled, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{label}</label>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button
          type="button"
          onClick={() => switchMode('type')}
          disabled={isDisabled}
          style={{
            padding: '6px 12px',
            background: mode === 'type' ? '#14b8a6' : 'white',
            color: mode === 'type' ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          Type
        </button>
        <button
          type="button"
          onClick={() => switchMode('draw')}
          disabled={isDisabled}
          style={{
            padding: '6px 12px',
            background: mode === 'draw' ? '#14b8a6' : 'white',
            color: mode === 'draw' ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          Draw
        </button>
      </div>
      {mode === 'type' ? (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          placeholder="Type your full name"
          style={{
            fontFamily: 'cursive',
            fontSize: '20px',
            padding: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#14b8a6')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={500}
            height={150}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isDisabled ? 'not-allowed' : 'crosshair',
              background: 'white',
              width: '100%',
              height: '150px',
            }}
          />
          <button
            type="button"
            onClick={clearCanvas}
            disabled={isDisabled}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomSignature;

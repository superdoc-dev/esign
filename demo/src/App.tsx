import React, { useState, useRef, useEffect } from 'react';
import SuperDocESign from '@superdoc-dev/esign';
import type {
  SubmitData,
  SigningState,
  FieldChange,
  DownloadData,
  SuperDocESignHandle,
  FieldComponentProps,
} from '@superdoc-dev/esign';
import SignaturePad from 'signature_pad';
import 'superdoc/style.css';
import './App.css';

// Document field definitions with labels
const documentFieldsConfig = [
  {
    id: '123456',
    label: 'Date',
    defaultValue: new Date().toLocaleDateString(),
    readOnly: true,
    type: 'text' as const,
  },
  {
    id: '234567',
    label: 'Full Name',
    defaultValue: 'John Doe',
    readOnly: false,
    type: 'text' as const,
  },
  {
    id: '345678',
    label: 'Company',
    defaultValue: 'SuperDoc',
    readOnly: false,
    type: 'text' as const,
  },
  { id: '456789', label: 'Plan', defaultValue: 'Premium', readOnly: false, type: 'text' as const },
  { id: '567890', label: 'State', defaultValue: 'CA', readOnly: false, type: 'text' as const },
  {
    id: '678901',
    label: 'Address',
    defaultValue: '123 Main St, Anytown, USA',
    readOnly: false,
    type: 'text' as const,
  },
];

// Custom signature component with type/draw modes using signature_pad
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

export function App() {
  const [submitted, setSubmitted] = useState(false);
  const [submitData, setSubmitData] = useState<SubmitData | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  // Stable eventId that persists across renders
  const [eventId] = useState(() => `demo-${Date.now()}`);

  // Ref to the esign component
  const esignRef = useRef<SuperDocESignHandle>(null);

  // State for document field values
  const [documentFields, setDocumentFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(documentFieldsConfig.map((f) => [f.id, f.defaultValue])),
  );

  const updateDocumentField = (id: string, value: string) => {
    setDocumentFields((prev) => ({ ...prev, [id]: value }));
    esignRef.current?.updateFieldInDocument({ id, value });
  };

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setEvents((prev) => [...prev.slice(-4), `${time} - ${msg}`]);
  };

  const handleSubmit = async (data: SubmitData) => {
    log('⏳ Signing document...');
    console.log('Submit data:', data);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const bearerToken = import.meta.env.VITE_SUPERDOC_SERVICES_API_KEY;
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    try {
      // Step 1: Prepare fields for annotation
      const fields = [...data.documentFields, ...data.signerFields]
        .filter(
          (field) =>
            field.id !== 'consent_agreement' && field.id !== 'terms' && field.id !== 'email',
        )
        .map((field) => {
          // Signature field: add options with IP label
          if (field.id === '789012') {
            const isDrawnSignature =
              typeof field.value === 'string' && field.value?.startsWith('data:image/');
            return {
              id: field.id,
              value: field.value,
              type: isDrawnSignature ? 'signature' : 'text',
              options: {
                bottomLabel: {
                  text: 'ip: 127.0.0.1',
                  color: '#666',
                },
              },
            };
          }
          // Document fields
          const docField = documentFieldsConfig.find((f) => f.id === field.id);
          return {
            id: field.id,
            value: field.value,
            type: docField?.type || 'text',
          };
        });

      // Step 2: Annotate the document
      log('⏳ Annotating document...');
      const annotateResponse = await fetch('/v1/annotate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          document: {
            url: 'https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement_updated.docx',
          },
          fields,
        }),
      });

      if (!annotateResponse.ok) {
        const error = await annotateResponse.text();
        throw new Error(error || 'Failed to annotate document');
      }

      const annotateResult = await annotateResponse.json();
      const annotatedBase64 = annotateResult.document.base64;

      // Step 3: Sign the annotated document
      log('⏳ Applying digital signature...');
      const signPayload = {
        eventId: data.eventId,
        document: {
          base64: annotatedBase64,
        },
        auditTrail: data.auditTrail,
        signer: {
          name: documentFields['234567'] || 'Signer', // Full Name field
          email: 'andrii@superdoc.dev',
          ip: '127.0.0.1',
          userAgent: navigator.userAgent,
        },
        certificate: {
          enable: true,
        },
        metadata: {
          company: documentFields['345678'],
          plan: documentFields['456789'],
        },
      };

      const signResponse = await fetch('/v1/sign', {
        method: 'POST',
        headers,
        body: JSON.stringify(signPayload),
      });

      if (!signResponse.ok) {
        const error = await signResponse.text();
        throw new Error(error || 'Failed to sign document');
      }

      const signResult = await signResponse.json();
      const { base64: signedBase64 } = signResult.document;

      // Step 4: Download the signed PDF
      const byteCharacters = atob(signedBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_agreement_${data.eventId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      log('✓ Document signed and downloaded!');
      setSubmitted(true);
      setSubmitData(data);
    } catch (error) {
      console.error('Error signing document:', error);
      log(`✗ Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownload = async (data: DownloadData) => {
    if (typeof data.documentSource !== 'string') {
      log('Download requires a document URL.');
      return;
    }

    const fields = [...data.fields.document, ...data.fields.signer]
      .filter((field) => field.id !== 'consent_agreement' && field.id !== '406948812')
      .map((field) => {
        // Signature field: determine type from value (data:image = signature, else text)
        if (field.id === '789012') {
          const isDrawnSignature =
            typeof field.value === 'string' && field.value.startsWith('data:image/');
          return {
            id: field.id,
            value: field.value,
            type: isDrawnSignature ? 'signature' : 'text',
          };
        }
        // Document fields have type from config
        const docField = documentFieldsConfig.find((f) => f.id === field.id);
        return {
          id: field.id,
          value: field.value,
          type: docField?.type || 'text',
        };
      });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const bearerToken = import.meta.env.VITE_SUPERDOC_SERVICES_API_KEY;
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    console.log('Annotating document with fields:', fields);

    try {
      const response = await fetch('/v1/annotate?to=pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          document: { url: data.documentSource },
          fields,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to annotate document');
      }

      const result = await response.json();
      const { base64, contentType } = result.document;

      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
      log('✓ Downloaded PDF');
    } catch (error) {
      console.error('Error processing document:', error);
      log('Download failed');
    }
  };

  const handleStateChange = (state: SigningState) => {
    if (state.scrolled && !events.some((e) => e.includes('Scrolled'))) {
      log('↓ Scrolled to bottom');
    }
    if (state.isValid && !events.some((e) => e.includes('Ready'))) {
      log('✓ Ready to submit');
    }
    console.log('State:', state);
  };

  const handleFieldChange = (field: FieldChange) => {
    const displayValue =
      typeof field.value === 'string' && field.value.startsWith('data:image/')
        ? `${field.value.slice(0, 30)}... (base64 image)`
        : field.value;
    log(`Field "${field.id}": ${displayValue}`);
    console.log('Field change:', field);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '20px' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1>
          <a
            href="https://www.npmjs.com/package/@superdoc-dev/esign"
            target="_blank"
            rel="noopener"
          >
            @superdoc-dev/esign
          </a>
        </h1>
        <p style={{ color: '#666' }}>
          React eSign component from{' '}
          <a href="https://superdoc.dev" target="_blank" rel="noopener">
            SuperDoc
          </a>
        </p>
      </header>

      {submitted ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            background: '#f0fdf4',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2>Agreement Signed!</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>Event ID: {submitData?.eventId}</p>
          {submitData?.signerFields.find((f) => f.id === 'signature') && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#666', marginBottom: '8px' }}>Signature:</p>
              <div
                style={{
                  fontFamily: 'cursive',
                  fontSize: '24px',
                  padding: '16px',
                  background: 'white',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                {submitData.signerFields.find((f) => f.id === 'signature')?.value}
              </div>
            </div>
          )}
          <button
            onClick={() => {
              setSubmitted(false);
              setEvents([]);
            }}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: '20px' }}>Employment Agreement</h2>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Use the document toolbar to download the current agreement at any time.
          </p>

          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <SuperDocESign
                ref={esignRef}
                eventId={eventId}
                document={{
                  source:
                    'https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement_updated.docx',
                  mode: 'full',
                  validation: {
                    scroll: { required: true },
                  },
                }}
                fields={{
                  document: documentFieldsConfig.map((f) => ({
                    id: f.id,
                    value: documentFields[f.id],
                    type: f.type,
                  })),
                  signer: [
                    {
                      id: '789012',
                      type: 'signature',
                      label: 'Your Signature',
                      validation: { required: true },
                      component: CustomSignature,
                    },
                    {
                      id: 'terms',
                      type: 'checkbox',
                      label: 'I accept the terms and conditions',
                      validation: { required: true },
                    },
                    {
                      id: 'email',
                      type: 'checkbox',
                      label: 'Send me a copy of the agreement',
                      validation: { required: false },
                    },
                  ],
                }}
                download={{ label: 'Download PDF' }}
                onSubmit={handleSubmit}
                onDownload={handleDownload}
                onStateChange={handleStateChange}
                onFieldChange={handleFieldChange}
                documentHeight="500px"
              />

              {/* Event Log */}
              {events.length > 0 && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                    }}
                  >
                    EVENT LOG
                  </div>
                  {events.map((evt, i) => (
                    <div key={i} style={{ padding: '2px 0', color: '#374151' }}>
                      {evt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Sidebar - Document Fields */}
            <div
              style={{
                width: '280px',
                flexShrink: 0,
                padding: '16px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                alignSelf: 'flex-start',
              }}
            >
              <h3
                style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#374151' }}
              >
                Document Fields
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documentFieldsConfig.map((field) => (
                  <div key={field.id}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={documentFields[field.id]}
                      onChange={(e) => updateDocumentField(field.id, e.target.value)}
                      readOnly={field.readOnly}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: field.readOnly ? '#f3f4f6' : 'white',
                        color: field.readOnly ? '#6b7280' : '#111827',
                        cursor: field.readOnly ? 'not-allowed' : 'text',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

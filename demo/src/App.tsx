import React, { useState } from 'react';
import SuperDocESign from '@superdoc-dev/esign';
import type { SubmitData, SigningState, FieldChange } from '@superdoc-dev/esign';
import 'superdoc/dist/style.css';
import './App.css';

export function App() {
    const [submitted, setSubmitted] = useState(false);
    const [submitData, setSubmitData] = useState<SubmitData | null>(null);
    const [events, setEvents] = useState<string[]>([]);

    const log = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${msg}`);
        setEvents(prev => [...prev.slice(-4), `${time} - ${msg}`]);
    };

    const handleSubmit = async (data: SubmitData) => {
        log('✓ Agreement signed');
        console.log('Submit data:', data);
        setSubmitted(true);
        setSubmitData(data);
    };

    const handleStateChange = (state: SigningState) => {
        if (state.scrolled && !events.some(e => e.includes('Scrolled'))) {
            log('↓ Scrolled to bottom');
        }
        if (state.isValid && !events.some(e => e.includes('Ready'))) {
            log('✓ Ready to submit');
        }
        console.log('State:', state);
    };

    const handleFieldChange = (field: FieldChange) => {
        log(`Field "${field.id}": ${field.value}`);
        console.log('Field change:', field);
    };

    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1>
                    <a href="https://www.npmjs.com/package/@superdoc-dev/esign" target="_blank" rel="noopener">
                        @superdoc-dev/esign
                    </a>
                </h1>
                <p style={{ color: '#666' }}>
                    React eSign component from <a href="https://superdoc.dev" target="_blank" rel="noopener">SuperDoc</a>
                </p>
            </header>

            {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                    <h2>Agreement Signed!</h2>
                    <p style={{ color: '#666', marginTop: '10px' }}>
                        Event ID: {submitData?.eventId}
                    </p>
                    {submitData?.signerFields.find(f => f.id === 'signature') && (
                        <div style={{ marginTop: '20px' }}>
                            <p style={{ color: '#666', marginBottom: '8px' }}>Signature:</p>
                            <div style={{
                                fontFamily: 'cursive',
                                fontSize: '24px',
                                padding: '16px',
                                background: 'white',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}>
                                {submitData.signerFields.find(f => f.id === 'signature')?.value}
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
                            fontSize: '16px'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <>
                    <h2 style={{ marginBottom: '20px' }}>Employment Agreement</h2>
                    <SuperDocESign
                        eventId={`demo-${Date.now()}`}
                        document={{
                            source: "https://storage.googleapis.com/public_statichosting/word_documents/agreement_template.docx",
                            mode: 'full',
                            displayOptions: {
                                scrollRequired: true
                            }
                        }}
                        fields={{
                            document: [
                                { alias: 'userName', value: 'John Doe' },
                                { alias: 'date', value: new Date().toLocaleDateString() },
                                { alias: 'company', value: 'SuperDoc' },
                                { alias: 'serviceType', value: 'Premium' },
                                { alias: 'jurisdiction', value: 'CA' },
                                { alias: 'companyAddress', value: '123 Main St, Anytown, USA' }
                            ],
                            signer: [
                                {
                                    id: 'signature',
                                    alias: 'signature',
                                    type: 'signature',
                                    label: 'Your Signature',
                                    validation: { required: true }
                                },
                                {
                                    id: 'terms',
                                    type: 'consent',
                                    label: 'I accept the terms and conditions',
                                    validation: { required: true }
                                }
                            ]
                        }}
                        onSubmit={handleSubmit}
                        onStateChange={handleStateChange}
                        onFieldChange={handleFieldChange}
                        documentHeight="500px"
                    />

                    {/* Event Log */}
                    {events.length > 0 && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: 'monospace'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#6b7280' }}>
                                EVENT LOG
                            </div>
                            {events.map((evt, i) => (
                                <div key={i} style={{ padding: '2px 0', color: '#374151' }}>{evt}</div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
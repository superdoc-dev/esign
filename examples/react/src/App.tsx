import React, { useEffect, useRef, useState } from 'react';
import SuperDocEsign from '@superdoc-dev/esign';
import './App.css';

export function App() {
    const containerRef = useRef<HTMLDivElement>(null);
    const esignRef = useRef<SuperDocEsign | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [requirements, setRequirements] = useState({
        scroll: false,
        signature: false,
        consents: [] as string[],
        isValid: false
    });
    const [accepted, setAccepted] = useState(false);

    const initializeEsign = async (documentSource: Blob | string) => {
        if (!containerRef.current) return;

        // Clean up previous instance
        if (esignRef.current && typeof esignRef.current.destroy === 'function') {
            esignRef.current.destroy();
        }
        esignRef.current = null;

        // Reset state
        setIsReady(false);
        setAccepted(false);
        setRequirements({
            scroll: false,
            signature: false,
            consents: [],
            isValid: false
        });

        try {
            esignRef.current = new SuperDocEsign({
                container: containerRef.current,
                document: documentSource,

                // Populate fields in document
                fields: {
                    company: 'Demo Corp',
                    userName: 'John Doe',
                    date: new Date().toLocaleDateString()
                },

                // Requirements
                requirements: {
                    scroll: true,
                    signature: true,
                    consents: ['acknowledge']
                },

                // UI elements
                elements: {
                    signature: '#signature-input',
                    consents: '[data-consent]'
                },

                // Callbacks
                onReady: () => {
                    console.log('eSign component ready');
                    setIsReady(true);
                },

                onFieldsDiscovered: (fields) => {
                    console.log('Document fields:', fields);
                },

                onChange: (status) => {
                    console.log('Requirements status:', status);
                    setRequirements(status);
                },

                onAccept: async (data) => {
                    console.log('Document accepted:', data);

                    // Send to your API
                    try {
                        // await api.recordAcceptance(data);
                        setAccepted(true);
                    } catch (error) {
                        console.error('Failed to record acceptance:', error);
                    }
                },

                onError: (error) => {
                    console.error('eSign error:', error);
                }
            });
        } catch (error) {
            console.error('Failed to load document:', error);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            await initializeEsign(url);
        }
    };

    useEffect(() => {
        return () => {
            esignRef.current?.destroy();
        };
    }, []);

    const handleAccept = async () => {
        const data = await esignRef.current?.accept();
        if (data) {
            console.log('Acceptance recorded:', data);
        }
    };

    const handleNext = () => {
        if (accepted) {
            console.log('Proceeding to next step...');
            alert('Agreement accepted! Moving to next step...');
            // In real app: window.location.href = '/next-step';
        }
    };

    const getStatusMessage = () => {
        if (!esignRef.current && !isReady) return 'Please load a document to begin';
        if (!isReady) return 'Loading document...';
        if (accepted) return '✓ Document accepted - Click Next to proceed';

        const pending: string[] = [];
        if (!requirements.scroll) pending.push('scroll to bottom');
        if (!requirements.signature) pending.push('add signature');
        if (requirements.consents.length === 0) pending.push('check acknowledgment');

        if (pending.length > 0) {
            return `Please ${pending.join(', ')}`;
        }

        return 'Ready to accept';
    };

    return (
        <div className="agreement-form">
            <h1>FCRA Disclosure Agreement</h1>

            {/* Status indicator */}
            <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '4px',
                backgroundColor: accepted ? '#d4f4e7' : requirements.isValid ? '#fff3cd' : '#f8f9fa',
                color: accepted ? '#155724' : requirements.isValid ? '#856404' : '#6c757d',
                border: `1px solid ${accepted ? '#c3e6cb' : requirements.isValid ? '#ffeeba' : '#dee2e6'}`,
                fontSize: '0.9rem'
            }}>
                {getStatusMessage()}
            </div>

            {/* File upload */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="file-upload" style={{ marginLeft: '10px' }}>Load document</label>
                <input type="file" id="file-upload" accept=".docx" onChange={handleFileUpload} />
            </div>

            {/* Document viewer (SuperDoc renders here) */}
            <div ref={containerRef} className="document-container" />

            {/* Controls */}
            <div className="controls">
                {/* Signature field */}
                <div className="form-group">
                    <label htmlFor="signature-input">
                        Electronic Signature {requirements.signature ? '' : '✓'}
                    </label>
                    <input
                        id="signature-input"
                        type="text"
                        className="signature-input"
                        placeholder="Type your full name"
                        disabled={accepted}
                    />
                </div>

                {/* Consent checkbox */}
                <div className="checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            name="acknowledge"
                            data-consent="acknowledge"
                            disabled={accepted}
                        />
                        I acknowledge that I have received and understand this document
                    </label>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="accept-button"
                        onClick={handleAccept}
                        disabled={!requirements.isValid || accepted}
                        style={{
                            flex: 1,
                            backgroundColor: accepted ? '#6c757d' : undefined
                        }}
                    >
                        {accepted ? '✓ Accepted' : 'Accept Document'}
                    </button>

                    <button
                        className="accept-button"
                        onClick={handleNext}
                        disabled={!accepted}
                        style={{
                            flex: 1,
                            backgroundColor: !accepted ? '#ccc' : '#1AB893'
                        }}
                    >
                        Next →
                    </button>
                </div>

                {/* Download link (optional) */}
                {accepted && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <a href="#" onClick={(e) => {
                            e.preventDefault();
                            console.log('Download signed document');
                        }} style={{ color: '#1AB893', textDecoration: 'none' }}>
                            Download signed copy
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
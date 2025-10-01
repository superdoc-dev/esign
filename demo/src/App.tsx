import React, { useState, useRef, useEffect, useCallback } from 'react';
import SuperDocESign from '@superdoc-dev/esign';
import type { SuperDocESignHandle, Status, AuditData, FieldInfo } from '@superdoc-dev/esign';
import 'superdoc/dist/style.css';
import './App.css';

export function App() {
    const esignRef = useRef<SuperDocESignHandle>(null);
    const prevStatusRef = useRef<Status>({
        scroll: false,
        signature: false,
        consents: [],
        isValid: false
    });

    // Configuration state
    const [config, setConfig] = useState({
        scroll: true,
        signature: true,
        consents: ['terms', 'privacy']
    });

    // Component state
    const [status, setStatus] = useState<Status>({
        scroll: false,
        signature: false,
        consents: [],
        isValid: false
    });

    const [isReady, setIsReady] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);

    // Event log
    const [events, setEvents] = useState<string[]>([]);

    // Fields
    const [fields, setFields] = useState<FieldInfo[]>([]);

    // Audit data
    const [auditData, setAuditData] = useState<AuditData | null>(null);

    // Collapsed sections
    const [collapsed, setCollapsed] = useState({
        requirements: false,
        fields: true,
        status: false,
        events: false
    });

    const [signatureData, setSignatureData] = useState<string | null>(null);

    const toggleSection = (section: keyof typeof collapsed) => {
        setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const log = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        setEvents(prev => [...prev.slice(-9), `${time} - ${msg}`]);
    }, []);

    // Handle status changes
    const handleStatusChange = useCallback((newStatus: Status) => {
        const prev = prevStatusRef.current;

        // Track individual changes
        if (newStatus.scroll && !prev.scroll) {
            log('Document scrolled to bottom');
        }

        if (newStatus.signature && !prev.signature) {
            log('Signature captured');
        }

        // Track consent changes
        const prevConsents = prev.consents || [];
        const newConsents = newStatus.consents || [];

        newConsents.forEach(consent => {
            if (!prevConsents.includes(consent)) {
                log(`Consent checked: ${consent}`);
            }
        });

        prevConsents.forEach(consent => {
            if (!newConsents.includes(consent)) {
                log(`Consent unchecked: ${consent}`);
            }
        });

        if (newStatus.isValid && !prev.isValid) {
            log('All requirements met - ready to accept');
        }

        setStatus(newStatus);
        prevStatusRef.current = newStatus;
    }, [log]);

    const handleReady = useCallback(() => {
        log('Component initialized');
        setIsReady(true);
    }, [log]);

    const handleFieldsDiscovered = useCallback((discoveredFields: FieldInfo[]) => {
        log(`Discovered ${discoveredFields.length} fields`);
        setFields(discoveredFields);
    }, [log]);

    const handleAccept = useCallback(async (data: AuditData) => {
        log('Agreement accepted');
        setIsAccepted(true);
        setAuditData(data);
    }, [log]);

    const handleReset = () => {
        esignRef.current?.reset();
        setIsAccepted(false);
        setAuditData(null);
        setStatus({
            scroll: false,
            signature: false,
            consents: [],
            isValid: false
        });
        setEvents([]);
        prevStatusRef.current = {
            scroll: false,
            signature: false,
            consents: [],
            isValid: false
        };

        // Reset isReady to force signature tracking to reinitialize
        setIsReady(false);
        setTimeout(() => setIsReady(true), 0);

    };

    // Handle signature field and convert to image
    useEffect(() => {
        if (!isReady) return;

        const signatureInput = document.querySelector('[data-esign-signature]') as HTMLInputElement;
        if (!signatureInput) return;

        const handleSignature = () => {
            const value = signatureInput.value.trim();
            if (value) {
                // Create signature image from text
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 80;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.font = '32px cursive';
                    ctx.fillStyle = '#000';
                    ctx.fillText(value, 10, 50);

                    const dataUrl = canvas.toDataURL('image/png');
                    setSignatureData(dataUrl);

                    // IMPORTANT: Store the signature image for the component to retrieve
                    signatureInput.dataset.signatureImage = dataUrl;

                    // Pass the signature image to the document
                    esignRef.current?.superdoc?.activeEditor?.commands.updateStructuredContentByAlias('signature', {
                        json: {
                            type: 'image',
                            attrs: { src: dataUrl, alt: 'Signature' }
                        }
                    });
                }
            } else {
                setSignatureData(null);
                delete signatureInput.dataset.signatureImage;
            }
        };

        signatureInput.addEventListener('input', handleSignature);
        signatureInput.addEventListener('change', handleSignature);

        return () => {
            signatureInput.removeEventListener('input', handleSignature);
            signatureInput.removeEventListener('change', handleSignature);
        };
    }, [isReady]);

    // Handle field updates
    const handleFieldUpdate = useCallback((fieldId: string, value: string) => {
        // Update local state
        setFields(currentFields =>
            currentFields.map(f => f.id === fieldId ? { ...f, value } : f)
        );

        // Update in document
        esignRef.current?.updateFields([{ id: fieldId, value }]);
    }, []);

    // Group fields by alias for display
    const groupedFields = fields.reduce((acc, field) => {
        const key = field.label || field.id;
        if (!acc.some(f => (f.label || f.id) === key)) {
            acc.push(field);
        }
        return acc;
    }, [] as FieldInfo[]);

    return (
        <div className="demo">
            <header>
                <div className="header-content">
                    <div className="header-left">
                        <h1><a href="https://www.npmjs.com/package/@superdoc-dev/esign" target="_blank" rel="noopener">@superdoc-dev/esign</a></h1>
                        <p>React eSign component from <a href="https://superdoc.dev" target="_blank" rel="noopener">SuperDoc</a></p>
                    </div>
                    <nav className="header-nav">
                        <a href="https://www.npmjs.com/package/@superdoc-dev/esign" target="_blank" rel="noopener">
                            NPM
                        </a>
                        <a href="https://docs.superdoc.dev/esign" target="_blank" rel="noopener">
                            Docs
                        </a>
                        <a href="https://github.com/superdoc-dev/esign" target="_blank" rel="noopener">
                            GitHub
                        </a>
                        <a href="https://discord.gg/b9UuaZRyaB" target="_blank" rel="noopener">
                            Discord
                        </a>
                    </nav>
                </div>
            </header>

            <div className="layout">
                {/* Left: Application */}
                <div className="app-side">
                    <div className="app-header">
                        <h2>HR Onboarding Portal</h2>
                        <span className="badge">React Example</span>
                    </div>

                    {isAccepted ? (
                        // Success State
                        <div className="success-state">
                            <div className="success-icon">✅</div>
                            <h3>Agreement Successfully Accepted!</h3>
                            <p>The employment agreement has been signed and recorded.</p>
                            {auditData && (
                                <div className="audit-info">
                                    <p><strong>Timestamp:</strong> {auditData.timestamp}</p>
                                    <p><strong>Duration:</strong> {auditData.duration}s</p>
                                    <p><strong>Scrolled:</strong> {auditData.scrolled ? 'Yes' : 'No'}</p>
                                    <p><strong>Signed:</strong> {auditData.signed ? 'Yes' : 'No'}</p>
                                    <p><strong>Consents:</strong> {auditData.consents.join(', ') || 'None'}</p>
                                    {auditData.fields && auditData.fields.length > 0 && (
                                        <p><strong>Fields:</strong> {auditData.fields.map((f: any) =>
                                            `${f.alias || f.id}: ${f.value}`
                                        ).join(', ')}</p>
                                    )}
                                    {auditData.signatureImage && (
                                        <div style={{ marginTop: '12px' }}>
                                            <p><strong>Signature:</strong></p>
                                            <img
                                                src={auditData.signatureImage}
                                                alt="Signature"
                                                style={{
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    maxWidth: '300px',
                                                    background: 'white'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <button onClick={handleReset} className="primary-button">
                                Start Over
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Document Viewer */}
                            <div className="document-section">
                                <label>Employment Agreement</label>
                                <SuperDocESign
                                    ref={esignRef}
                                    document="https://storage.googleapis.com/public_statichosting/word_documents/agreement_template.docx"
                                    requirements={config}
                                    fields={[
                                        { alias: 'userName', value: 'John Doe' },
                                        { alias: 'date', value: new Date().toLocaleDateString() },
                                        { alias: 'company', value: 'SuperDoc' }
                                    ]}
                                    signatureSelector="[data-esign-signature]"
                                    consentSelector="[data-esign-consent]"
                                    onReady={handleReady}
                                    onChange={handleStatusChange}
                                    onAccept={handleAccept}
                                    onFieldsDiscovered={handleFieldsDiscovered}
                                    className="document-container"
                                />
                                {!status.scroll && config.scroll && (
                                    <div className="hint">↓ Scroll to read entire agreement</div>
                                )}
                            </div>

                            {/* Signature */}
                            {config.signature && (
                                <div className="form-section">
                                    <label>
                                        Electronic Signature
                                        {status.signature && <span className="check">✓</span>}
                                    </label>
                                    <input
                                        type="text"
                                        data-esign-signature
                                        placeholder="Type your full name"
                                        disabled={config.scroll && !status.scroll}
                                        className="signature-input"
                                    />
                                </div>
                            )}

                            {/* Consents */}
                            {config.consents.length > 0 && (
                                <div className="form-section">
                                    <label>Acknowledgments</label>
                                    <div className="consent-list">
                                        {config.consents.includes('terms') && (
                                            <label className="consent-item">
                                                <input
                                                    type="checkbox"
                                                    data-esign-consent="terms"
                                                    name="terms"
                                                    disabled={
                                                        (config.scroll && !status.scroll) ||
                                                        (config.signature && !status.signature)
                                                    }
                                                />
                                                <span>I accept the terms and conditions</span>
                                            </label>
                                        )}
                                        {config.consents.includes('privacy') && (
                                            <label className="consent-item">
                                                <input
                                                    type="checkbox"
                                                    data-esign-consent="privacy"
                                                    name="privacy"
                                                    disabled={
                                                        (config.scroll && !status.scroll) ||
                                                        (config.signature && !status.signature)
                                                    }
                                                />
                                                <span>I acknowledge the privacy policy</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Accept Button */}
                            <button
                                className="accept-button"
                                disabled={!status.isValid}
                                onClick={() => esignRef.current?.accept()}
                            >
                                {status.isValid ? 'Accept Agreement' : 'Complete requirements above'}
                            </button>
                        </>
                    )}
                </div>

                {/* Right: Controls & Events */}
                <div className="control-side">
                    {/* Fields Panel */}
                    {groupedFields.length > 0 && (
                        <div className="panel">
                            <h3 onClick={() => toggleSection('fields')} style={{ cursor: 'pointer' }}>
                                Document Fields ({groupedFields.length})
                                <span style={{ float: 'right' }}>{collapsed.fields ? '▼' : '▲'}</span>
                            </h3>
                            {!collapsed.fields && (
                                <div className="fields-list">
                                    {groupedFields.map((field) => (
                                        <div key={field.id} className="field-item">
                                            <label>
                                                <code>{field.label || field.id}</code>
                                            </label>
                                            <input
                                                type="text"
                                                value={field.value || ''}
                                                onChange={(e) => handleFieldUpdate(field.id, e.target.value)}
                                                placeholder="Enter value..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Configuration Panel */}
                    <div className="panel">
                        <h3 onClick={() => toggleSection('requirements')} style={{ cursor: 'pointer' }}>
                            Requirements Configuration
                            <span style={{ float: 'right' }}>{collapsed.requirements ? '▼' : '▲'}</span>
                        </h3>
                        {!collapsed.requirements && (
                            <div className="config-options">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.scroll}
                                        onChange={e => setConfig({ ...config, scroll: e.target.checked })}
                                    />
                                    <code>scroll: {config.scroll.toString()}</code>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.signature}
                                        onChange={e => setConfig({ ...config, signature: e.target.checked })}
                                    />
                                    <code>signature: {config.signature.toString()}</code>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.consents.includes('terms')}
                                        onChange={e => setConfig({
                                            ...config,
                                            consents: e.target.checked
                                                ? [...config.consents, 'terms']
                                                : config.consents.filter(c => c !== 'terms')
                                        })}
                                    />
                                    <code>consents: ['terms']</code>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.consents.includes('privacy')}
                                        onChange={e => setConfig({
                                            ...config,
                                            consents: e.target.checked
                                                ? [...config.consents, 'privacy']
                                                : config.consents.filter(c => c !== 'privacy')
                                        })}
                                    />
                                    <code>consents: ['privacy']</code>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Status Panel */}
                    <div className="panel">
                        <h3 onClick={() => toggleSection('status')} style={{ cursor: 'pointer' }}>
                            Status
                            <span style={{ float: 'right' }}>{collapsed.status ? '▼' : '▲'}</span>
                        </h3>
                        {!collapsed.status && (
                            <div className="status-list">
                                <div className={isReady ? 'active' : ''}>
                                    <span className="indicator">{isReady ? '●' : '○'}</span>
                                    Ready
                                </div>
                                <div className={status.scroll ? 'active' : ''}>
                                    <span className="indicator">{status.scroll ? '●' : '○'}</span>
                                    Scrolled
                                </div>
                                <div className={status.signature ? 'active' : ''}>
                                    <span className="indicator">{status.signature ? '●' : '○'}</span>
                                    Signed
                                </div>
                                {config.consents.map(consent => (
                                    <div key={consent} className={status.consents.includes(consent) ? 'active' : ''}>
                                        <span className="indicator">
                                            {status.consents.includes(consent) ? '●' : '○'}
                                        </span>
                                        Consent: {consent}
                                    </div>
                                ))}
                                <div className={isAccepted ? 'active' : ''}>
                                    <span className="indicator">{isAccepted ? '●' : '○'}</span>
                                    Accepted
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Events Panel */}
                    <div className="panel">
                        <h3 onClick={() => toggleSection('events')} style={{ cursor: 'pointer' }}>
                            Event Log
                            <span style={{ float: 'right' }}>{collapsed.events ? '▼' : '▲'}</span>
                        </h3>
                        {!collapsed.events && (
                            <div className="event-log">
                                {events.length === 0 ? (
                                    <div className="empty">Waiting for events...</div>
                                ) : (
                                    events.map((evt, i) => (
                                        <div key={i} className="event-item">{evt}</div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
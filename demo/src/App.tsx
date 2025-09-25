import React, { useState, useRef, useEffect } from 'react';
import SuperDocEsign from '@superdoc-dev/esign';
import './App.css';

export function App() {
    const containerRef = useRef<HTMLDivElement>(null);
    const esignRef = useRef<any>(null);
    const prevRequirementsRef = useRef<any>({
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
    const [status, setStatus] = useState({
        ready: false,
        scrolled: false,
        signed: false,
        consents: [] as string[],
        accepted: false,
        isValid: false  // Track the component's isValid state
    });

    // Event log
    const [events, setEvents] = useState<string[]>([]);

    const log = (msg: string) => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        setEvents(prev => [...prev.slice(-9), `${time} - ${msg}`]);
    };

    useEffect(() => {
        // Clean up previous
        if (esignRef.current) {
            esignRef.current.destroy();
            setStatus({
                ready: false,
                scrolled: false,
                signed: false,
                consents: [],
                accepted: false,
                isValid: false
            });
            setEvents([]);
            prevRequirementsRef.current = {
                scroll: false,
                signature: false,
                consents: [],
                isValid: false
            };
        }

        // Initialize
        esignRef.current = new SuperDocEsign({
            container: containerRef.current!,
            document: 'https://storage.googleapis.com/public_statichosting/word_documents/employment_agreement.docx',

            requirements: config,

            elements: {
                signature: '#signature-input',
                consents: '[data-consent]'
            },

            fields: {
                employeeName: 'John Doe',
                position: 'Senior Developer',
                startDate: new Date().toLocaleDateString()
            },

            onReady: () => {
                log('Component initialized');
                setStatus(s => ({ ...s, ready: true }));
            },

            onChange: (reqs) => {
                const prev = prevRequirementsRef.current;

                // Track individual changes
                if (reqs.scroll && !prev.scroll) {
                    log('Document scrolled to bottom');
                    setStatus(s => ({ ...s, scrolled: true }));
                }

                if (reqs.signature && !prev.signature) {
                    log('Signature captured');
                    setStatus(s => ({ ...s, signed: true }));
                }

                // Track consent changes
                const prevConsents = prev.consents || [];
                const newConsents = reqs.consents || [];

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

                // Update all status including isValid
                setStatus(s => ({
                    ...s,
                    consents: newConsents,
                    isValid: reqs.isValid  // IMPORTANT: Track the component's isValid
                }));

                if (reqs.isValid && !prev.isValid) {
                    log('All requirements met - ready to accept');
                }

                prevRequirementsRef.current = reqs;
            },

            onAccept: (data) => {
                log(`Agreement accepted`);
                setStatus(s => ({ ...s, accepted: true }));
                console.log('Audit data:', data);
            }
        });

        return () => {
            esignRef.current?.destroy();
        };
    }, [config]);

    const handleAccept = () => {
        if (status.isValid) {  // Use the component's isValid state
            esignRef.current?.accept();
        }
    };

    return (
        <div className="demo">
            <header>
                <div className="header-content">
                    <div className="header-left">
                        <h1><a href="https://www.npmjs.com/package/@superdoc-dev/esign" target="_blank" rel="noopener">@superdoc-dev/esign</a></h1>
                        <p>eSign component from <a href="https://superdoc.dev" target="_blank" rel="noopener">SuperDoc</a></p>
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
                        <span className="badge">Example Application</span>
                    </div>

                    {status.accepted ? (
                        // Success State
                        <div className="success-state">
                            <div className="success-icon">✅</div>
                            <h3>Agreement Successfully Accepted!</h3>
                            <p>The employment agreement has been signed and recorded.</p>
                            <div className="audit-info">
                                <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                                <p><strong>Document:</strong> Employment Agreement v2.1</p>
                                <p><strong>Status:</strong> Legally Binding</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Document Viewer */}
                            <div className="document-section">
                                <label>Employment Agreement</label>
                                <div ref={containerRef} className="document-container" />
                                {!status.scrolled && config.scroll && (
                                    <div className="hint">↓ Scroll to read entire agreement</div>
                                )}
                            </div>

                            {/* Signature */}
                            {config.signature && (
                                <div className="form-section">
                                    <label>
                                        Electronic Signature
                                        {status.signed && <span className="check">✓</span>}
                                    </label>
                                    <input
                                        id="signature-input"
                                        type="text"
                                        placeholder="Type your full name"
                                        disabled={config.scroll && !status.scrolled}
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
                                                    data-consent="terms"
                                                    name="terms"
                                                    disabled={
                                                        (config.scroll && !status.scrolled) ||
                                                        (config.signature && !status.signed)
                                                    }
                                                />
                                                <span>I accept the terms and conditions</span>
                                            </label>
                                        )}
                                        {config.consents.includes('privacy') && (
                                            <label className="consent-item">
                                                <input
                                                    type="checkbox"
                                                    data-consent="privacy"
                                                    name="privacy"
                                                    disabled={
                                                        (config.scroll && !status.scrolled) ||
                                                        (config.signature && !status.signed)
                                                    }
                                                />
                                                <span>I acknowledge the privacy policy</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Accept Button - Fixed */}
                            <button
                                className="accept-button"
                                disabled={!status.isValid}
                                onClick={handleAccept}
                            >
                                {status.isValid ? 'Accept Agreement' : 'Complete requirements above'}
                            </button>
                        </>
                    )}
                </div>

                {/* Right: Controls & Events */}
                <div className="control-side">
                    {/* Configuration */}
                    <div className="panel">
                        <h3>Requirements: {`{}`}</h3>
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
                    </div>

                    {/* Status */}
                    <div className="panel">
                        <h3>Status</h3>
                        <div className="status-list">
                            <div className={status.ready ? 'active' : ''}>
                                <span className="indicator">{status.ready ? '●' : '○'}</span>
                                Ready
                            </div>
                            <div className={status.scrolled ? 'active' : ''}>
                                <span className="indicator">{status.scrolled ? '●' : '○'}</span>
                                Scrolled
                            </div>
                            <div className={status.signed ? 'active' : ''}>
                                <span className="indicator">{status.signed ? '●' : '○'}</span>
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
                            <div className={status.accepted ? 'active' : ''}>
                                <span className="indicator">{status.accepted ? '●' : '○'}</span>
                                Accepted
                            </div>
                        </div>
                    </div>

                    {/* Events */}
                    <div className="panel">
                        <h3>Event Log</h3>
                        <div className="event-log">
                            {events.length === 0 ? (
                                <div className="empty">Waiting for events...</div>
                            ) : (
                                events.map((evt, i) => (
                                    <div key={i} className="event-item">{evt}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
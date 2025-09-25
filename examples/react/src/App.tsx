import React, { useState, useEffect, useRef } from 'react';
import SuperDocEsign from '@superdoc-dev/esign';

/**
 * Basic React integration example
 */
function App() {
    // Component state
    const [isReady, setIsReady] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [requirements, setRequirements] = useState({
        scroll: false,
        signature: false,
        isValid: false
    });

    // Ref to hold the eSign instance
    const esignRef = useRef(null);

    useEffect(() => {
        // Initialize the component
        esignRef.current = new SuperDocEsign({
            // 1. Where to render the document
            container: '#document-viewer',

            // 2. What document to show (can be URL, Blob, or File)
            document: 'https://storage.googleapis.com/public_statichosting/word_documents/sample.docx',

            // 3. Define what users must complete
            requirements: {
                scroll: true,      // Must scroll to bottom
                signature: true,   // Must provide signature
                consents: ['tos'] // Must check specific checkboxes
            },

            // 4. Tell eSign which UI elements to track
            elements: {
                signature: '#signature-input',     // Your signature input
                consents: 'input[name="tos"]'     // Your checkbox(es)
            },

            // 5. Optional: Populate fields in the document
            fields: {
                userName: 'John Doe',
                date: new Date().toLocaleDateString()
            },

            // 6. Callbacks for component lifecycle
            onReady: () => {
                console.log('Component ready');
                setIsReady(true);
            },

            onChange: (status) => {
                console.log('Requirements changed:', status);
                setRequirements(status);

                // Auto-accept when all requirements are met
                if (status.isValid && !isAccepted) {
                    esignRef.current.accept();
                }
            },

            onAccept: async (auditData) => {
                console.log('Document accepted with data:', auditData);
                /* 
                auditData contains:
                {
                  timestamp: "2024-01-01T12:00:00Z",
                  duration: 45,  // seconds spent on document
                  scrolled: true,
                  signed: true,
                  consents: ['tos'],
                  fields: { userName: 'John Doe', ... }
                }
                */

                // Send to your backend
                try {
                    await fetch('/api/accept-agreement', {
                        method: 'POST',
                        body: JSON.stringify(auditData)
                    });
                    setIsAccepted(true);
                } catch (error) {
                    console.error('Failed to save acceptance:', error);
                }
            },

            onError: (error) => {
                console.error('eSign error:', error);
            }
        });

        // Cleanup on unmount
        return () => {
            esignRef.current?.destroy();
        };
    }, []);

    // Helper methods you might need
    const resetDocument = () => {
        esignRef.current?.reset();
        setIsAccepted(false);
    };

    const loadNewDocument = (file) => {
        // You can load a new document at any time
        esignRef.current?.loadDocument(file);
    };

    return (
        <div>
            <h1>Terms of Service</h1>

            {/* The document viewer - SuperDoc renders here */}
            <div id="document-viewer" style={{
                height: '500px',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                margin: '20px 0',
                background: 'white',
                overflow: 'auto'
            }} />

            {/* Your signature UI - tracked by eSign */}
            <input
                id="signature-input"
                type="text"
                placeholder="Type your full name"
                disabled={isAccepted}
            />

            {/* Your consent UI - tracked by eSign */}
            <label>
                <input
                    type="checkbox"
                    name="tos"
                    disabled={!requirements.scroll || !requirements.signature}
                />
                I accept the terms of service
            </label>

            {/* Status display */}
            <div>
                {!isReady && 'Loading...'}
                {isReady && !requirements.scroll && 'Please scroll to bottom'}
                {isReady && !requirements.signature && 'Please sign'}
                {isAccepted && '✓ Agreement accepted'}
            </div>
        </div>
    );
}

export default App;
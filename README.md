# @superdoc-dev/esign

React component that wraps SuperDoc for document signing workflows with audit trails and compliance tracking.

## Installation

```bash
npm install @superdoc-dev/esign
```

## Quick Start

```jsx
import React from 'react';
import SuperDocESign from '@superdoc-dev/esign';
import 'superdoc/dist/style.css';

function App() {
  const handleSubmit = async (data) => {
    // Send to your backend
    await fetch('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    alert('Document signed!');
  };

  return (
    <SuperDocESign
      eventId={`session-${Date.now()}`}
      
      document={{
        source: "https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement.docx",
        validation: { scroll: { required: true } }
      }}
      
      fields={{
        document: [
          { id: '1', value: 'John Doe' },
          { id: '2', value: new Date().toLocaleDateString() },
          { id: '3', value: 'SuperDoc' },
          { id: '4', value: 'Premium' },
          { id: '5', value: 'CA' },
          { id: '6', value: '123 Main St, Anytown, USA' }
        ],
        signer: [
          {
            id: '7',
            type: 'signature',
            validation: { required: true },
            label: 'Type your full name'
          },
          {
            id: '8',
            type: 'checkbox',
            validation: { required: true },
            label: 'I accept the terms'
          }
        ]
      }}
      
      onSubmit={handleSubmit}
    />
  );
}
```

## Backend - Create Signed PDF

Use the SuperDoc API to create the final signed document:

```javascript
// Node.js/Express
app.post('/api/sign', async (req, res) => {
  const { eventId, auditTrail, documentFields, signerFields } = req.body;
  
  // 1. Fill document fields
  const annotated = await fetch('https://api.superdoc.dev/v1/annotate', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      document: 'template.docx',
      fields: [...documentFields, ...signerFields]
    })
  });
  
  // 2. Add digital signature
  const signed = await fetch('https://api.superdoc.dev/v1/sign', {
    method: 'POST', 
    headers: { 
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      document: await annotated.blob(),
      auditTrail: auditTrail
    })
  });
  
  // 3. Save PDF
  await saveToStorage(await signed.blob(), `signed_${eventId}.pdf`);
  
  res.json({ success: true });
});
```

See [Python, Node.js, and more examples](https://docs.superdoc.dev/solutions/esign/backend).

## What You Receive

```javascript
{
  eventId: "session-123",
  timestamp: "2024-01-15T10:30:00Z",
  duration: 45000,
  documentFields: [
    { id: "1", value: "John Doe" }
  ],
  signerFields: [
    { id: "7", value: "John Doe" },
    { id: "8", value: true }
  ],
  auditTrail: [
    { type: "ready", timestamp: "..." },
    { type: "scroll", timestamp: "..." },
    { type: "field_change", timestamp: "..." },
    { type: "submit", timestamp: "..." }
  ],
  isFullyCompleted: true
}
```

## Documentation

Full docs at [docs.superdoc.dev/solutions/esign](https://docs.superdoc.dev/solutions/esign)

## License

AGPLv3
# @superdoc-dev/esign

A React eSignature component for SuperDoc that handles document acceptance workflows.

## Installation

```bash
npm install @superdoc-dev/esign superdoc
```

## Quick Start

```jsx
import React, { useRef, useState } from 'react';
import SuperDocESign from '@superdoc-dev/esign';
import 'superdoc/dist/style.css';

function App() {
  const esignRef = useRef();
  const [status, setStatus] = useState({});

  const handleAccept = async () => {
    const auditData = await esignRef.current?.accept();
    if (auditData) {
      // Send to your API
      await api.saveSignature(auditData);
    }
  };

  return (
    <div>
      {/* Document viewer */}
      <SuperDocESign
        ref={esignRef}
        document="https://example.com/agreement.docx"
        requirements={{
          scroll: true,
          signature: true,
          consents: ['terms', 'privacy']
        }}
        onChange={setStatus}
        onAccept={handleAccept}
      />

      {/* Your signature UI */}
      <input
        type="text"
        data-esign-signature
        placeholder="Type your full name"
        disabled={!status.scroll}
      />

      {/* Your consent UI */}
      <label>
        <input
          type="checkbox"
          data-esign-consent="terms"
          disabled={!status.scroll || !status.signature}
        />
        I accept the terms
      </label>

      {/* Accept button */}
      <button
        onClick={() => esignRef.current?.accept()}
        disabled={!status.isValid}
      >
        Accept Agreement
      </button>
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `document` | `string \| File \| Blob` | Document to display |
| `requirements` | `Object` | What users must complete |
| `fields` | `Array` | Initial field values |
| `signatureSelector` | `string` | CSS selector for signature element (default: `[data-esign-signature]`) |
| `consentSelector` | `string` | CSS selector for consent checkboxes (default: `[data-esign-consent]`) |
| `onChange` | `(status) => void` | Called when requirements change |
| `onAccept` | `(data) => void` | Called when document is accepted |
| `onReady` | `() => void` | Called when component is ready |
| `onFieldsDiscovered` | `(fields) => void` | Called when document fields are found |

## Methods (via ref)

- `accept()` - Process acceptance and return audit data
- `reset()` - Clear all state
- `updateFields(fields)` - Update document field values
- `getStatus()` - Get current requirement status
- `getFields()` - Get all document fields

## Requirements

Configure what users must complete before accepting:

```jsx
<SuperDocESign
  requirements={{
    scroll: true,        // Must scroll to bottom
    signature: true,     // Must provide signature
    consents: ['terms', 'privacy']  // Must check these boxes
  }}
/>
```

## Signature Input

Use the `data-esign-signature` attribute on any input or canvas:

```jsx
{/* Text input */}
<input type="text" data-esign-signature placeholder="Type your name" />

{/* Canvas signature pad */}
<canvas data-esign-signature width="400" height="200" />

{/* Custom component */}
<SignaturePad data-esign-signature data-signed={isSigned} />
```

## Consent Checkboxes

Use the `data-esign-consent` attribute with a unique name:

```jsx
<label>
  <input type="checkbox" data-esign-consent="terms" />
  I accept the terms
</label>

<label>
  <input type="checkbox" data-esign-consent="privacy" />
  I acknowledge the privacy policy
</label>
```

## Field Population

Replace placeholders in your document with dynamic data:

```jsx
<SuperDocESign
  fields={[
    { alias: 'userName', value: 'John Doe' },
    { alias: 'date', value: new Date().toLocaleDateString() },
    { alias: 'company', value: 'Acme Inc.' }
  ]}
/>
```

## Audit Data

When a user accepts, you receive comprehensive audit data:

```typescript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  duration: 45,  // seconds spent on document
  fields: [
    { id: "field1", alias: "userName", value: "John Doe" }
  ],
  scrolled: true,
  signed: true,
  consents: ["terms", "privacy"],
  signatureImage: "data:image/png;base64,..."  // if canvas
}
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import SuperDocESign, { 
  SuperDocESignHandle, 
  Status, 
  AuditData, 
  FieldUpdate 
} from '@superdoc-dev/esign';

const esignRef = useRef<SuperDocESignHandle>(null);
const [status, setStatus] = useState<Status>({
  scroll: false,
  signature: false,
  consents: [],
  isValid: false
});

const handleAccept = async (data: AuditData) => {
  // Process acceptance
};
```

## Examples

See the [examples](./examples) directory for complete implementations.

## License

MIT

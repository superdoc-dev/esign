# @superdoc-dev/esign

React eSignature component for document signing workflows with SuperDoc.

## Installation

```bash
npm install @superdoc-dev/esign superdoc
```

## Quick Start

```jsx
import SuperDocESign from '@superdoc-dev/esign';
import 'superdoc/dist/style.css';

function App() {
  return (
    <SuperDocESign
      eventId="unique-session-id"
      
      document={{
        source: "contract.pdf",
        mode: "full",
        displayOptions: {
          scrollRequired: true
        }
      }}
      
      fields={{
        document: [
          { alias: 'company', value: 'Acme Corp' }
        ],
        signer: [
          {
            id: 'signature',
            type: 'signature',
            validation: { required: true },
            label: 'Your Signature'
          }
        ]
      }}
      
      onSubmit={async (data) => {
        await api.saveSignature(data);
      }}
    />
  );
}
```

## API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | string | ✓ | Unique identifier for signing session |
| `document` | object | ✓ | Document configuration |
| `fields` | object | | Field definitions |
| `download` | object | | Download button config |
| `submit` | object | | Submit button config |
| `onSubmit` | function | ✓ | Submit handler |
| `onDownload` | function | | Download handler |
| `onStateChange` | function | | State change handler |
| `onFieldChange` | function | | Field change handler |
| `isDisabled` | boolean | | Disable all interactions |

### Document Configuration

```jsx
document={{
  source: File | Blob | string,  // Required
  mode: 'full' | 'download_only' | 'preview',
  displayOptions: {
    scrollRequired: boolean,
    watermark: boolean
  }
}}
```

### Field Reference System

Fields can be referenced using either `id` or `alias`:

- **`id`**: System identifier (e.g., "field_123")
- **`alias`**: Human-readable name (e.g., "customer_name")

This allows the same value to appear multiple places in a document:

```jsx
// Document template might have:
// "Dear {{customer_name}},"
// "Agreement between {{company}} and {{customer_name}}"
// "Signed by: {{customer_name}}"

fields={{
  document: [
    { 
      alias: 'customer_name',  // Used in document {{customer_name}}
      value: 'John Doe' 
    },
    { 
      alias: 'company', 
      value: 'Acme Corp' 
    },
    { 
      id: 'date_field',
      alias: 'sign_date',  // Can have both id and alias
      value: '2024-01-15' 
    }
  ],
  
  signer: [
    {
      id: 'sig_001',
      alias: 'signature',  // Document shows {{signature}} 
      type: 'signature',
      validation: { required: true }
    },
    {
      id: 'consent_terms',
      alias: 'terms_accepted',  // Can reference as {{terms_accepted}}
      type: 'consent',
      label: 'I accept the terms'
    }
  ]
}}
```

**How it works:**
1. Document fields are injected on load using their id/alias
2. Signer fields are collected and can replace placeholders using their alias
3. The same alias can appear multiple times in the document
4. All instances get the same value

### Field Configuration

```jsx
fields={{
  // Values to inject into document
  document: [
    { 
      id: 'field_id',      // Optional
      alias: 'field_name', // Optional (at least one of id or alias required)
      value: 'any value' 
    }
  ],
  
  // Fields for signer to complete
  signer: [
    {
      id: 'unique_id',     // Required for signer fields
      alias: 'field_ref',  // Optional alias for document references
      type: 'signature' | 'consent' | 'checkbox' | 'text',
      validation: {
        required: boolean,
        minLength: number,
        maxLength: number
      },
      label: 'Field Label',
      component: CustomComponent // Optional - consistent with download/submit!
    }
  ]
}}
```

### UI Customization

Simple customization:
```jsx
download={{
  fileName: "contract.pdf",
  label: "Download Contract",
  variant: "secondary"
}}

submit={{
  label: "Sign Document",
  loadingLabel: "Processing...",
  variant: "primary"
}}
```

Full custom components:
```jsx
download={{
  component: ({ onClick, fileName, isDisabled }) => (
    <CustomButton onClick={onClick} disabled={isDisabled}>
      Download {fileName}
    </CustomButton>
  )
}}

submit={{
  component: ({ onClick, isValid, isDisabled, isSubmitting }) => (
    <CustomButton 
      onClick={onClick} 
      disabled={!isValid || isDisabled}
    >
      {isSubmitting ? 'Processing...' : 'Sign & Submit'}
    </CustomButton>
  )
}}
```

### Custom Field Components

```jsx
// Custom signature pad component
const CustomSignaturePad = ({ value, onChange, isDisabled, label }) => (
  <div className="custom-signature">
    <label>{label}</label>
    <canvas 
      // ... canvas signature implementation
      onMouseUp={(e) => onChange(canvasDataURL)}
      style={{ border: '1px solid #000', cursor: 'crosshair' }}
    />
  </div>
);

// Use it in fields
fields={{
  signer: [
    {
      id: 'signature',
      type: 'signature',
      validation: { required: true },
      component: CustomSignaturePad  // Consistent with download/submit!
    }
  ]
}}
```

## Examples

### Basic Agreement

```jsx
<SuperDocESign
  eventId="session-123"
  document={{ source: "terms.pdf" }}
  fields={{
    signer: [
      {
        id: 'accept',
        type: 'consent',
        validation: { required: true },
        label: 'I accept the terms'
      }
    ]
  }}
  onSubmit={handleSubmit}
/>
```

### Employment Offer with Repeated Fields

```jsx
// Example: Employment offer with repeated fields
<SuperDocESign
  eventId="offer-123"
  
  document={{
    source: offerLetter,  // Contains {{employee_name}}, {{salary}}, etc.
    mode: "full",
    displayOptions: {
      scrollRequired: true
    }
  }}
  
  fields={{
    document: [
      { 
        alias: 'employee_name',  // Appears 5 times in document
        value: 'Jane Smith' 
      },
      { 
        alias: 'position',       // Appears 3 times
        value: 'Senior Engineer' 
      },
      { 
        alias: 'salary',         // Appears 2 times
        value: '$120,000' 
      },
      {
        alias: 'start_date',
        value: 'February 1, 2024'
      }
    ],
    
    signer: [
      {
        id: 'employee_signature',
        alias: 'employee_sig',   // {{employee_sig}} in document
        type: 'signature',
        validation: { required: true },
        label: 'Your Signature'
      },
      {
        id: 'accept_offer',
        alias: 'offer_accepted',
        type: 'consent',
        validation: { required: true },
        label: 'I accept this offer'
      }
    ]
  }}
  
  submit={{
    label: 'Accept Offer'
  }}
  
  onSubmit={handleAcceptOffer}
/>
```

### Full Contract with All Features

```jsx
<SuperDocESign
  eventId="contract-456"
  
  document={{
    source: serviceAgreement,
    mode: "full",
    displayOptions: {
      scrollRequired: true,
      watermark: true
    }
  }}
  
  fields={{
    document: [
      { alias: 'client_name', value: 'John Doe' },
      { alias: 'company', value: 'Acme Corp' },
      { alias: 'service_type', value: 'Premium Support' },
      { alias: 'contract_date', value: new Date().toLocaleDateString() }
    ],
    signer: [
      {
        id: 'client_signature',
        alias: 'signature',
        type: 'signature',
        validation: { required: true },
        label: 'Your Signature'
      },
      {
        id: 'consent_terms',
        type: 'consent',
        validation: { required: true },
        label: 'I agree to the terms and conditions'
      },
      {
        id: 'consent_privacy',
        type: 'consent',
        validation: { required: true },
        label: 'I acknowledge the privacy policy'
      },
      {
        id: 'email_updates',
        type: 'checkbox',
        validation: { required: false },
        label: 'Send me email updates'
      }
    ]
  }}
  
  download={{
    fileName: 'service_agreement_signed.pdf',
    label: 'Download Agreement',
    variant: 'secondary'
  }}
  
  submit={{
    label: 'Sign Agreement',
    loadingLabel: 'Processing...',
    invalidLabel: 'Please complete all required fields',
    variant: 'success'
  }}
  
  onSubmit={async (data) => {
    await api.saveSignedContract(data);
    console.log('Signed by:', data.signerFields);
  }}
  
  onDownload={(blob, fileName) => {
    console.log('Downloaded:', fileName);
  }}
  
  onStateChange={(state) => {
    console.log('Valid:', state.isValid);
  }}
  
  isDisabled={false}
/>
```

## Progressive Customization

The component supports three levels of customization:

```jsx
// Level 1: Use all defaults
<SuperDocESign 
  eventId="session-1"
  document={{ source: "doc.pdf" }} 
  onSubmit={handleSubmit} 
/>

// Level 2: Simple customization
<SuperDocESign
  eventId="session-2"
  document={{ source: "doc.pdf" }}
  submit={{ label: "I Agree", variant: "success" }}
  download={{ label: "Get Copy" }}
  onSubmit={handleSubmit}
/>

// Level 3: Full custom components
<SuperDocESign
  eventId="session-3"
  document={{ source: "doc.pdf" }}
  submit={{ component: CustomSubmitButton }}
  download={{ component: CustomDownloadButton }}
  fields={{
    signer: [{
      id: 'sig',
      type: 'signature',
      component: CustomSignaturePad
    }]
  }}
  onSubmit={handleSubmit}
/>
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import SuperDocESign from '@superdoc-dev/esign';
import type { 
  SuperDocESignProps,
  SubmitData, 
  SigningState,
  DocumentField,
  SignerField,
  FieldComponentProps
} from '@superdoc-dev/esign';
```

## License

MIT

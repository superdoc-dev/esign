# @superdoc-dev/esign

A lightweight eSignature orchestration component for SuperDoc that handles document acceptance workflows without the complexity.

## What is this?

SuperDoc eSign wraps the SuperDoc editor to provide a complete clickwrap/eSign experience. It tracks whether users have reviewed documents, captured signatures, and provided consent - then packages this data for your compliance needs.

## Why?

Building legally-compliant document acceptance flows requires careful orchestration of multiple requirements:
- Proving users actually reviewed the document (scroll tracking)
- Capturing signatures when needed
- Managing consent checkboxes
- Recording acceptance with proper audit trails

Rather than implementing this logic repeatedly, this component provides a simple, reusable solution that integrates with your existing UI components.

## Key Features

- **Document Loading**: Handles DOCX, HTML, Markdown documents via SuperDoc
- **Requirement Tracking**: Monitors scroll progress, signature capture, and consent checkboxes
- **UI Agnostic**: Bring your own buttons, checkboxes, and signature components
- **Field Population**: Replace placeholders in documents with user data
- **Simple API**: Clear callbacks for requirement changes and acceptance

## Installation

```bash
npm install @superdoc-dev/esign
```

## Quick Start

```javascript
import SuperDocEsign from '@superdoc-dev/esign';

const esign = new SuperDocEsign({
  container: '#document-viewer',
  document: 'agreement.pdf',
  
  requirements: {
    scroll: true,
    signature: true,
    consents: ['terms']
  },
  
  elements: {
    signature: '#signature-pad',
    consents: '#terms-checkbox'
  },
  
  onChange: (status) => {
    // Enable/disable accept button
    acceptBtn.disabled = !status.isValid;
  },
  
  onAccept: async (data) => {
    // Send to your compliance API
    await api.recordAcceptance(data);
  }
});
```

## Common Use Cases

### Terms of Service / Privacy Policy
Require users to scroll through and acknowledge legal documents before proceeding.

### Employment Agreements
Capture electronic signatures on offer letters and NDAs with field personalization.

### Consent Forms
Track multiple consent checkboxes for GDPR, marketing communications, or medical authorizations.

### Embedded Workflows
Integrate document acceptance into larger forms - perfect for onboarding flows where agreements are one step among many.

## How It Works

1. **Load Document**: Display any document using SuperDoc's viewer
2. **Track Requirements**: Monitor scroll, signature, and checkbox states
3. **Enable Acceptance**: When all requirements are met, enable acceptance
4. **Record Data**: Capture timestamp, duration, and requirement completion for audit trails

## API

### Configuration

| Option | Type | Description |
|--------|------|-------------|
| `document` | File \| string | Document to display |
| `container` | string \| HTMLElement | Where to render the document |
| `requirements` | Object | What users must complete |
| `elements` | Object | Your UI components to track |
| `fields` | Object | Data to populate in document |

### Methods

- `getStatus()` - Check current requirement state
- `isValid()` - Quick check if ready to accept
- `accept()` - Process acceptance and return data
- `updateFields()` - Update document placeholders
- `reset()` - Clear all state
- `destroy()` - Clean up component

## Examples

See the `/examples` directory for complete implementations in React and vanilla JavaScript.

## Philosophy

This component follows a simple principle: **we handle the orchestration, you handle the UI**. 

We track whether requirements are met and notify you of changes. You decide how to style checkboxes, implement signature capture, and design buttons. This separation ensures the component works with any UI framework or design system.
import type { SuperDoc } from "superdoc"; // eslint-disable-line

export interface FieldReference {
  id?: string;
  alias?: string;
}

export interface DocumentField extends FieldReference {
  value: any;
}

export interface SignerField extends FieldReference {
  id: string;
  type: "signature" | "consent" | "checkbox" | "text";
  label?: string;
  value?: any;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
  component?: React.ComponentType<FieldComponentProps>;
}

export interface FieldComponentProps {
  value: any;
  onChange: (value: any) => void;
  isDisabled: boolean;
  isValid?: boolean;
  label?: string;
  error?: string;
}

export interface DownloadButtonProps {
  onClick: () => void;
  fileName?: string;
  isDisabled: boolean;
}

export interface SubmitButtonProps {
  onClick: () => void;
  isValid: boolean;
  isDisabled: boolean;
  isSubmitting: boolean;
}

export interface DownloadConfig {
  fileName?: string;
  label?: string;
  component?: React.ComponentType<DownloadButtonProps>;
}

export interface SubmitConfig {
  label?: string;
  component?: React.ComponentType<SubmitButtonProps>;
}

export interface SuperDocESignProps {
  eventId: string;

  document: {
    source: string | File | Blob;
    mode?: "full" | "download" | "preview";
    displayOptions?: {
      scrollRequired?: boolean;
    };
  };

  fields?: {
    document?: DocumentField[];
    signer?: SignerField[];
  };

  download?: DownloadConfig;
  submit?: SubmitConfig;

  // Events
  onSubmit: (data: SubmitData) => void | Promise<void>;
  onDownload?: (blob: Blob, fileName: string) => void;
  onStateChange?: (state: SigningState) => void;
  onFieldChange?: (field: FieldChange) => void;
  onFieldsDiscovered?: (fields: FieldInfo[]) => void;

  isDisabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  documentHeight?: string;
}

export interface SigningState {
  scrolled: boolean;
  fields: Map<string, any>;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface SubmitData {
  eventId: string;
  timestamp: string;
  duration: number;
  auditTrail: AuditEvent[];
  documentFields: Array<DocumentField>;
  signerFields: Array<SignerFieldValue>;
  isFullyCompleted: boolean;
}

export interface AuditEvent {
  timestamp: string;
  type: "ready" | "scroll" | "field_change" | "submit";
  data?: any;
}

export type FieldInfo = DocumentField & { label?: string };
export type FieldUpdate = DocumentField;
export type FieldChange = DocumentField & { previousValue?: any };

export interface SignerFieldValue {
  id: string;
  alias?: string;
  value: any;
}

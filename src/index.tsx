import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { SuperDoc } from "superdoc";

// Types
export interface FieldUpdate {
  id?: string;
  alias?: string;
  value: any;
}

export interface Status {
  scroll: boolean;
  signature: boolean;
  consents: string[];
  isValid: boolean;
}

export interface AuditData {
  timestamp: string;
  duration: number;
  fields: FieldUpdate[];
  scrolled: boolean;
  signed: boolean;
  consents: string[];
  signatureImage?: string;
}

export interface FieldInfo {
  id: string;
  label?: string;
  value?: any;
}

export interface DownloadRequestData {
  blob: Blob;
  fields: FieldInfo[];
}

export interface SuperDocESignProps {
  // Document
  document: string | File | Blob;

  // Requirements
  requirements?: {
    scroll?: boolean;
    signature?: boolean;
    consents?: string[];
  };

  // Initial field values
  fields?: FieldUpdate[];

  // Element selectors
  signatureSelector?: string;
  consentSelector?: string;
  downloadSelector?: string;

  // Callbacks
  onReady?: () => void;
  onChange?: (status: Status) => void;
  onAccept?: (data: AuditData) => void | Promise<void>;
  onFieldsDiscovered?: (fields: FieldInfo[]) => void;
  onDownloadRequest?: (data: DownloadRequestData) => void | Promise<void>;

  // Style
  className?: string;
  style?: React.CSSProperties;
}

export interface SuperDocESignHandle {
  accept: () => Promise<AuditData | false>;
  reset: () => void;
  updateFields: (fields: FieldUpdate[]) => void;
  getStatus: () => Status;
  getFields: () => FieldInfo[];
  requestDownload: () => Promise<DownloadRequestData | false>;
  superdoc: SuperDoc | null;
}

const SuperDocESign = forwardRef<SuperDocESignHandle, SuperDocESignProps>(
  (
    {
      document,
      requirements = {},
      fields: initialFields = [],
      signatureSelector = "[data-esign-signature]",
      consentSelector = "[data-esign-consent]",
      downloadSelector = "[data-esign-download]",
      onReady,
      onChange,
      onAccept,
      onFieldsDiscovered,
      onDownloadRequest,
      className,
      style,
    },
    ref,
  ) => {
    // State
    const [scrolled, setScrolled] = useState(false);
    const [signed, setSigned] = useState(false);
    const [consents, setConsents] = useState<Set<string>>(new Set());
    const [fields, setFields] = useState<Map<string, FieldInfo>>(new Map());
    const [isReady, setIsReady] = useState(false);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const superdocRef = useRef<SuperDoc | null>(null);
    const startTimeRef = useRef(Date.now());

    // Compute status
    const getStatus = useCallback((): Status => {
      const requiredConsents = requirements.consents || [];
      const hasAllConsents = requiredConsents.every((name) =>
        consents.has(name),
      );

      return {
        scroll: !requirements.scroll || scrolled,
        signature: !requirements.signature || signed,
        consents: Array.from(consents),
        isValid:
          (!requirements.scroll || scrolled) &&
          (!requirements.signature || signed) &&
          hasAllConsents,
      };
    }, [scrolled, signed, consents, requirements]);

    // Initialize SuperDoc
    useEffect(() => {
      if (!containerRef.current) return;

      const initSuperDoc = async () => {
        const { SuperDoc } = await import("superdoc");

        const instance = new SuperDoc({
          selector: containerRef.current!,
          document,
          documentMode: "viewing",
          onReady: () => {
            setIsReady(true);
            discoverAndInitializeFields(instance);
            onReady?.();
          },
          onException: ({ error }: { error: Error }) => {
            console.error("SuperDoc error:", error);
          },
        });

        superdocRef.current = instance;
      };

      initSuperDoc();

      return () => {
        superdocRef.current?.destroy?.();
        superdocRef.current = null;
      };
    }, [document]);

    // Discover fields in document
    const discoverAndInitializeFields = (superdoc: SuperDoc) => {
      if (!superdoc.activeEditor) return;

      const editor = superdoc.activeEditor;
      const tags =
        editor.helpers.structuredContentCommands.getStructuredContentTags(
          editor.state,
        );

      const configValues = new Map<string, any>();
      initialFields.forEach((f) => {
        const key = f.id || f.alias;
        if (key) configValues.set(key, f.value);
      });

      const discoveredFields: FieldInfo[] = tags.map(({ node }: any) => {
        const id = node.attrs.id;
        const alias = node.attrs.alias;
        const configValue = configValues.get(id) ?? configValues.get(alias);

        return {
          id,
          label: alias,
          value: configValue ?? node.textContent ?? "",
        };
      });

      if (discoveredFields.length > 0) {
        const fieldsMap = new Map(discoveredFields.map((f) => [f.id, f]));
        setFields(fieldsMap);
        onFieldsDiscovered?.(discoveredFields);

        // Apply initial values
        initialFields.forEach((field) => {
          updateFieldInDocument(field);
        });
      }
    };

    // Update field in document
    const updateFieldInDocument = (field: FieldUpdate) => {
      if (!superdocRef.current?.activeEditor) return;

      const editor = superdocRef.current.activeEditor;
      const textValue = String(field.value);

      if (field.id) {
        editor.commands.updateStructuredContentById(field.id, {
          text: textValue,
        });
      } else if (field.alias) {
        editor.commands.updateStructuredContentByAlias(field.alias, {
          text: textValue,
        });
      }
    };

    // Track scroll
    useEffect(() => {
      if (!requirements.scroll || !isReady) return;

      const scrollContainer = containerRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        if (scrollPercentage >= 0.95 || scrollHeight <= clientHeight) {
          setScrolled(true);
        }
      };

      scrollContainer.addEventListener("scroll", handleScroll);
      handleScroll(); // Check initial state

      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, [requirements.scroll, isReady]);

    // Track signature
    useEffect(() => {
      if (!requirements.signature) return;

      const checkSignature = () => {
        const element = globalThis.document.querySelector(
          signatureSelector,
        ) as HTMLElement;
        if (!element) return;

        const hasValue = getSignatureValue(element);
        setSigned(hasValue);
      };

      // Use MutationObserver to detect when signature element appears
      const observer = new MutationObserver(checkSignature);
      observer.observe(globalThis.document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "data-signed"],
      });

      // Also check on input events
      const handleInput = (e: Event) => {
        if ((e.target as Element).matches(signatureSelector)) {
          checkSignature();
        }
      };

      globalThis.document.addEventListener("input", handleInput, true);
      globalThis.document.addEventListener("change", handleInput, true);

      // Initial check
      checkSignature();

      return () => {
        observer.disconnect();
        globalThis.document.removeEventListener("input", handleInput, true);
        globalThis.document.removeEventListener("change", handleInput, true);
      };
    }, [requirements.signature, signatureSelector]);

    // Track consents
    useEffect(() => {
      if (!requirements.consents || requirements.consents.length === 0) return;

      const checkConsents = () => {
        const checkboxes = globalThis.document.querySelectorAll(
          consentSelector,
        ) as NodeListOf<HTMLInputElement>;
        const newConsents = new Set<string>();

        checkboxes.forEach((checkbox) => {
          const name =
            checkbox.name || checkbox.dataset.esignConsent || checkbox.id;
          if (name && checkbox.checked) {
            newConsents.add(name);
          }
        });

        setConsents(newConsents);
      };

      // Listen for changes
      const handleChange = (e: Event) => {
        if ((e.target as Element).matches(consentSelector)) {
          checkConsents();
        }
      };

      globalThis.document.addEventListener("change", handleChange, true);

      // Initial check
      checkConsents();

      return () => {
        globalThis.document.removeEventListener("change", handleChange, true);
      };
    }, [requirements.consents, consentSelector]);

    // Helper: Get signature value
    const getSignatureValue = (element: HTMLElement): boolean => {
      if (!element) return false;

      // Canvas signature pad
      if (element.tagName === "CANVAS") {
        const canvas = element as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some(
          (channel) => channel !== 0 && channel !== 255,
        );
      }

      // Input element
      if ("value" in element) {
        return !!(element as HTMLInputElement).value?.trim();
      }

      // Custom component with data attribute
      return element.dataset.signed === "true";
    };

    // Get signature image if canvas
    const getSignatureImage = (): string | undefined => {
      const element = globalThis.document.querySelector(
        signatureSelector,
      ) as HTMLElement;

      // Check for stored signature image in data attribute
      if (element?.dataset.signatureImage) {
        return element.dataset.signatureImage;
      }

      // Fall back to canvas if using one
      if (element?.tagName === "CANVAS") {
        return (element as HTMLCanvasElement).toDataURL("image/png");
      }

      return undefined;
    };

    // Notify status changes
    useEffect(() => {
      const status = getStatus();
      onChange?.(status);
    }, [scrolled, signed, consents, requirements, getStatus, onChange]);

    // Public methods
    const accept = useCallback(async (): Promise<AuditData | false> => {
      const status = getStatus();
      if (!status.isValid) return false;

      const currentFields: FieldUpdate[] = Array.from(fields.values()).map(
        (f) => ({
          id: f.id,
          alias: f.label,
          value: f.value,
        }),
      );

      const data: AuditData = {
        timestamp: new Date().toISOString(),
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        fields: currentFields,
        scrolled,
        signed,
        consents: Array.from(consents),
        signatureImage: getSignatureImage(),
      };

      await onAccept?.(data);
      return data;
    }, [fields, scrolled, signed, consents, getStatus, onAccept]);

    const reset = useCallback(() => {
      setScrolled(false);
      setSigned(false);
      setConsents(new Set());
      startTimeRef.current = Date.now();

      // Reset scroll
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }

      // Clear signature
      const signatureElement = globalThis.document.querySelector(
        signatureSelector,
      ) as HTMLElement;
      if (signatureElement) {
        if (signatureElement.tagName === "CANVAS") {
          const ctx = (signatureElement as HTMLCanvasElement).getContext("2d");
          ctx?.clearRect(
            0,
            0,
            signatureElement.clientWidth,
            signatureElement.clientHeight,
          );
        } else if ("value" in signatureElement) {
          (signatureElement as HTMLInputElement).value = "";
        }
        signatureElement.dataset.signed = "false";
      }

      // Clear checkboxes
      const checkboxes = globalThis.document.querySelectorAll(
        consentSelector,
      ) as NodeListOf<HTMLInputElement>;
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
    }, [signatureSelector, consentSelector]);

    const updateFields = useCallback(
      (updates: FieldUpdate[]) => {
        updates.forEach((update) => {
          updateFieldInDocument(update);

          // Update local state
          const field = fields.get(update.id || "");
          if (field) {
            field.value = update.value;
            setFields(new Map(fields));
          }
        });
      },
      [fields],
    );

    const getFields = useCallback((): FieldInfo[] => {
      return Array.from(fields.values());
    }, [fields]);

    const requestDownload = useCallback(async (): Promise<
      DownloadRequestData | false
    > => {
      if (!superdocRef.current) return false;

      try {
        const result = await superdocRef.current.export({
          exportType: ["docx"],
          isFinalDoc: true,
          triggerDownload: false,
        });

        if (!result) return false;

        const downloadData: DownloadRequestData = {
          blob: result,
          fields: Array.from(fields.values()),
        };

        await onDownloadRequest?.(downloadData);
        return downloadData;
      } catch (error) {
        console.error("Download request failed:", error);
        return false;
      }
    }, [fields, onDownloadRequest]);

    // Track download button clicks
    useEffect(() => {
      if (!isReady) return;

      const handleDownloadClick = (e: Event) => {
        e.preventDefault();
        requestDownload();
      };

      const downloadElements =
        globalThis.document.querySelectorAll(downloadSelector);
      downloadElements.forEach((el) => {
        el.addEventListener("click", handleDownloadClick);
      });

      return () => {
        downloadElements.forEach((el) => {
          el.removeEventListener("click", handleDownloadClick);
        });
      };
    }, [downloadSelector, isReady, requestDownload]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        accept,
        reset,
        updateFields,
        getStatus,
        getFields,
        requestDownload,
        superdoc: superdocRef.current,
      }),
      [accept, reset, updateFields, getStatus, getFields, requestDownload],
    );

    return <div
      ref={containerRef}
      className={`superdoc-esign ${className || ''}`}
      data-superdoc="esign"
      style={style}
    />;
  },
);

SuperDocESign.displayName = "SuperDocESign";

export default SuperDocESign;

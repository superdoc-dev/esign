import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { SuperDoc } from "superdoc";
import type * as Types from "./types";
import {
  SignatureInput,
  ConsentCheckbox,
  createDownloadButton,
  createSubmitButton,
} from "./defaults";

export * from "./types";
export { SignatureInput, ConsentCheckbox };

type Editor = NonNullable<SuperDoc["activeEditor"]>;

const SuperDocESign = forwardRef<any, Types.SuperDocESignProps>(
  (props, ref) => {
    const {
      eventId,
      document,
      fields = {},
      download,
      submit,
      onSubmit,
      onDownload,
      onStateChange,
      onFieldChange,
      onFieldsDiscovered,
      isDisabled = false,
      className,
      style,
      documentHeight = "600px",
    } = props;

    // State
    const [scrolled, setScrolled] = useState(
      !document.displayOptions?.scrollRequired,
    );
    const [fieldValues, setFieldValues] = useState<
      Map<string, Types.FieldValue>
    >(new Map());
    const [isValid, setIsValid] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [auditTrail, setAuditTrail] = useState<Types.AuditEvent[]>([]);
    const [isReady, setIsReady] = useState(false);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const superdocRef = useRef<SuperDoc | null>(null);
    const startTimeRef = useRef(Date.now());
    const fieldsRef = useRef(fields);
    fieldsRef.current = fields;

    const updateFieldInDocument = useCallback((field: Types.FieldUpdate) => {
      if (!superdocRef.current?.activeEditor) return;
      const editor = superdocRef.current.activeEditor;

      const signerField = fieldsRef.current.signer?.find(
        (f) => f.id === field.id || f.alias === field.alias,
      );

      let updatePayload;

      // For signature fields, always convert to image regardless of input
      if (signerField?.type === "signature" && field.value) {
        const imageUrl =
          typeof field.value === "string" &&
          field.value.startsWith("data:image/")
            ? field.value // Already an image
            : textToImageDataUrl(String(field.value)); // Convert text to image

        updatePayload = {
          json: {
            type: "image",
            attrs: { src: imageUrl, alt: "Signature" },
          },
        };
      } else {
        updatePayload = { text: String(field.value ?? "") };
      }

      if (field.alias) {
        editor.commands.updateStructuredContentByAlias(
          field.alias,
          updatePayload,
        );
      }
    }, []);

    // Synchronous helper function
    function textToImageDataUrl(text: string): string {
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "italic 30px cursive";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      return canvas.toDataURL();
    }

    // Discover fields in document and apply initial values
    const discoverAndApplyFields = useCallback(
      (editor: Editor) => {
        if (!editor) return;

        const tags =
          editor.helpers.structuredContentCommands.getStructuredContentTags(
            editor.state,
          );

        // Build initial values map
        const configValues = new Map<string, Types.FieldValue>();

        fieldsRef.current.document?.forEach((f) => {
          if (f.id) configValues.set(f.id, f.value);
          if (f.alias) configValues.set(f.alias, f.value);
        });

        fieldsRef.current.signer?.forEach((f) => {
          if (f.value !== undefined) {
            configValues.set(f.id, f.value);
            if (f.alias) configValues.set(f.alias, f.value);
          }
        });

        // Discover fields
        const discovered: Types.FieldInfo[] = tags
          .map(({ node }: any) => ({
            id: node.attrs.id,
            alias: node.attrs.alias,
            label: node.attrs.alias,
            value:
              configValues.get(node.attrs.id) ??
              configValues.get(node.attrs.alias) ??
              node.textContent ??
              "",
          }))
          .filter((f: Types.FieldInfo) => f.id || f.alias);

        if (discovered.length > 0) {
          onFieldsDiscovered?.(discovered);

          // Apply initial values from both document and signer fields
          const allFields = [
            ...(fieldsRef.current.document || []),
            ...(fieldsRef.current.signer || []),
          ];

          allFields
            .filter((field) => field.value !== undefined)
            .forEach((field) =>
              updateFieldInDocument({
                id: field.id,
                alias: field.alias,
                value: field.value!,
              }),
            );
        }
      },
      [onFieldsDiscovered, updateFieldInDocument],
    );

    // Add audit event
    const addAuditEvent = (event: Omit<Types.AuditEvent, "timestamp">) => {
      const auditEvent: Types.AuditEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      setAuditTrail((prev) => [...prev, auditEvent]);
    };

    // Initialize SuperDoc - ONLY ONCE per document
    useEffect(() => {
      if (!containerRef.current) return;

      const initSuperDoc = async () => {
        const { SuperDoc } = await import("superdoc");

        const instance = new SuperDoc({
          selector: containerRef.current!,
          document: document.source,
          documentMode: "viewing",
          onReady: () => {
            if (instance.activeEditor) {
              discoverAndApplyFields(instance.activeEditor);
            }
            addAuditEvent({ type: "ready" });
            setIsReady(true);
          },
        });

        superdocRef.current = instance;
      };

      initSuperDoc();

      return () => {
        if (superdocRef.current) {
          superdocRef.current.destroy();
          superdocRef.current = null;
        }
      };
    }, [document.source, document.mode, discoverAndApplyFields]);

    // Track scroll manually
    useEffect(() => {
      if (!document.displayOptions?.scrollRequired || !isReady) return;

      const scrollContainer = containerRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        // Trigger at 95% or if content fits in viewport
        if (scrollPercentage >= 0.95 || scrollHeight <= clientHeight) {
          setScrolled(true);
          addAuditEvent({
            type: "scroll",
            data: { percent: Math.round(scrollPercentage * 100) },
          });
        }
      };

      scrollContainer.addEventListener("scroll", handleScroll);
      handleScroll(); // Check initial state

      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, [document.displayOptions?.scrollRequired, isReady]);

    // Handle field change from signer inputs
    const handleFieldChange = useCallback(
      (fieldId: string, value: Types.FieldValue) => {
        setFieldValues((prev) => {
          const previousValue = prev.get(fieldId);
          const newMap = new Map(prev);
          newMap.set(fieldId, value);

          // Find the field config to get alias
          const fieldConfig = fieldsRef.current.signer?.find(
            (f) => f.id === fieldId,
          );

          // Update in document
          updateFieldInDocument({
            id: fieldId,
            alias: fieldConfig?.alias,
            value: value,
          });

          // Add to audit trail
          addAuditEvent({
            type: "field_change",
            data: { fieldId, value, previousValue },
          });

          // Notify parent
          onFieldChange?.({
            id: fieldId,
            value,
            previousValue,
          });

          return newMap;
        });
      },
      [onFieldChange, updateFieldInDocument],
    );

    // Check if form is valid
    const checkIsValid = useCallback((): boolean => {
      // Check scroll requirement
      if (document.displayOptions?.scrollRequired && !scrolled) {
        return false;
      }

      // Check required fields
      return (fields.signer || []).every((field) => {
        if (!field.validation?.required) return true;
        const value = fieldValues.get(field.id);
        return value && (typeof value !== "string" || value.trim());
      });
    }, [scrolled, fields.signer, fieldValues, document.displayOptions]);

    // Validate form and notify state changes
    useEffect(() => {
      const valid = checkIsValid();
      setIsValid(valid);

      const state: Types.SigningState = {
        scrolled,
        fields: fieldValues,
        isValid: valid,
        isSubmitting,
      };
      onStateChange?.(state);
    }, [scrolled, fieldValues, isSubmitting, checkIsValid, onStateChange]);

    // Handle download
    const handleDownload = useCallback(async () => {
      if (isDisabled) return;

      const blob = await superdocRef.current?.export({
        exportType: ["pdf"],
        isFinalDoc: true,
        triggerDownload: false,
      });
      if (blob && onDownload) {
        onDownload(blob, download?.fileName || "document.pdf");
      } else if (blob) {
        // Default download behavior
        const url = URL.createObjectURL(blob);
        const a = globalThis.document.createElement("a");
        a.href = url;
        a.download = download?.fileName || "document.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    }, [isDisabled, download, onDownload]);

    // Handle submit
    const handleSubmit = useCallback(async () => {
      if (!isValid || isDisabled || isSubmitting) return;

      setIsSubmitting(true);
      addAuditEvent({ type: "submit" });

      const submitData: Types.SubmitData = {
        eventId,
        timestamp: new Date().toISOString(),
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        auditTrail,
        documentFields: fields.document || [],
        signerFields: (fields.signer || []).map((field) => ({
          id: field.id,
          alias: field.alias,
          value: fieldValues.get(field.id) ?? null,
        })),
        isFullyCompleted: isValid,
      };

      try {
        await onSubmit(submitData);
      } finally {
        setIsSubmitting(false);
      }
    }, [
      isValid,
      isDisabled,
      isSubmitting,
      eventId,
      auditTrail,
      fields,
      fieldValues,
      onSubmit,
    ]);

    // Render field
    const renderField = (field: Types.SignerField) => {
      const Component = field.component || getDefaultComponent(field.type);

      return (
        <Component
          key={field.id}
          value={fieldValues.get(field.id) ?? null}
          onChange={(value) => handleFieldChange(field.id, value)}
          isDisabled={isDisabled}
          label={field.label}
        />
      );
    };

    // Get default component
    const getDefaultComponent = (
      type: "signature" | "consent" | "checkbox" | "text",
    ) => {
      switch (type) {
        case "signature":
        case "text":
          return SignatureInput;
        case "consent":
        case "checkbox":
          return ConsentCheckbox;
      }
    };

    // Render action buttons
    const renderActionButtons = () => {
      const DownloadButton =
        download?.component || createDownloadButton(download);
      const SubmitButton = submit?.component || createSubmitButton(submit);

      return (
        <div
          className="superdoc-esign-actions"
          style={{ display: "flex", gap: "10px" }}
        >
          {document.mode !== "download" && (
            <SubmitButton
              onClick={handleSubmit}
              isValid={isValid}
              isDisabled={isDisabled}
              isSubmitting={isSubmitting}
            />
          )}
          <DownloadButton
            onClick={handleDownload}
            fileName={download?.fileName}
            isDisabled={isDisabled}
          />
        </div>
      );
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getState: () => ({
        scrolled,
        fields: fieldValues,
        isValid,
        isSubmitting,
      }),
      getAuditTrail: () => auditTrail,
      reset: () => {
        setScrolled(!document.displayOptions?.scrollRequired);
        setFieldValues(new Map());
        setIsValid(false);
        setAuditTrail([]);
      },
    }));

    return (
      <div
        className={`superdoc-esign-container ${className || ""}`}
        style={style}
      >
        {/* Document viewer section */}
        <div className="superdoc-esign-document">
          <div
            ref={containerRef}
            style={{ height: documentHeight, overflow: "auto" }}
          />
        </div>

        {/* Controls section - separate from document */}
        <div className="superdoc-esign-controls" style={{ marginTop: "20px" }}>
          {/* Signer fields */}
          {fields.signer && fields.signer.length > 0 && (
            <div
              className="superdoc-esign-fields"
              style={{ marginBottom: "20px" }}
            >
              {fields.signer.map(renderField)}
            </div>
          )}

          {/* Action buttons */}
          {renderActionButtons()}
        </div>
      </div>
    );
  },
);

SuperDocESign.displayName = "SuperDocESign";

export default SuperDocESign;

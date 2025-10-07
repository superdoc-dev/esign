import {
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

    const containerRef = useRef<HTMLDivElement>(null);
    const superdocRef = useRef<SuperDoc | null>(null);
    const startTimeRef = useRef(Date.now());
    const fieldsRef = useRef(fields);
    fieldsRef.current = fields;

    const updateFieldInDocument = useCallback((field: Types.FieldUpdate) => {
      if (!superdocRef.current?.activeEditor) return;
      const editor = superdocRef.current.activeEditor;

      const signerField = fieldsRef.current.signer?.find((f) => f.id === field.id);

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

      if (field.id) {
        editor.commands.updateStructuredContentById(
          field.id,
          updatePayload,
        );
      }
    }, []);

    function textToImageDataUrl(text: string): string {
      const canvas = globalThis.document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const fontSize = 30;
      ctx.font = `italic ${fontSize}px cursive`;

      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;

      const estimatedHeight = fontSize * 1.3; // Cursive fonts typically need ~1.3x font size
      const paddingX = 4;
      const paddingY = 6; // Extra vertical padding for cursive descenders

      canvas.width = Math.ceil(textWidth + paddingX * 2);
      canvas.height = Math.ceil(estimatedHeight + paddingY * 2);

      ctx.font = `italic ${fontSize}px cursive`;
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        text,
        canvas.width / 2,
        canvas.height / 2
      );

      return canvas.toDataURL("image/png");
    }

    const discoverAndApplyFields = useCallback(
      (editor: Editor) => {
        if (!editor) return;

        const tags =
          editor.helpers.structuredContentCommands.getStructuredContentTags(
            editor.state,
          );

        const configValues = new Map<string, Types.FieldValue>();

        fieldsRef.current.document?.forEach((f) => {
          if (f.id) configValues.set(f.id, f.value);
        });

        fieldsRef.current.signer?.forEach((f) => {
          if (f.value !== undefined) {
            configValues.set(f.id, f.value);
          }
        });

        const discovered: Types.FieldInfo[] = tags
          .map(({ node }: any) => ({
            id: node.attrs.id,
            label: node.attrs.label,
            value:
              configValues.get(node.attrs.id) ??
              node.textContent ??
              "",
          }))
          .filter((f: Types.FieldInfo) => f.id);

        if (discovered.length > 0) {
          onFieldsDiscovered?.(discovered);

          const allFields = [
            ...(fieldsRef.current.document || []),
            ...(fieldsRef.current.signer || []),
          ];

          allFields
            .filter((field) => field.value !== undefined)
            .forEach((field) =>
              updateFieldInDocument({
                id: field.id,
                value: field.value!,
              }),
            );
        }
      },
      [onFieldsDiscovered, updateFieldInDocument],
    );

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

    useEffect(() => {
      if (!document.displayOptions?.scrollRequired || !isReady) return;

      const scrollContainer = containerRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        if (scrollPercentage >= 0.95 || scrollHeight <= clientHeight) {
          setScrolled(true);
          addAuditEvent({
            type: "scroll",
            data: { percent: Math.round(scrollPercentage * 100) },
          });
        }
      };

      scrollContainer.addEventListener("scroll", handleScroll);
      handleScroll();

      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, [document.displayOptions?.scrollRequired, isReady]);

    const handleFieldChange = useCallback(
      (fieldId: string, value: Types.FieldValue) => {
        setFieldValues((prev) => {
          const previousValue = prev.get(fieldId);
          const newMap = new Map(prev);
          newMap.set(fieldId, value);

          updateFieldInDocument({
            id: fieldId,
            value: value,
          });

          addAuditEvent({
            type: "field_change",
            data: { fieldId, value, previousValue },
          });

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
    const checkIsValid = useCallback((): boolean => {
      if (document.displayOptions?.scrollRequired && !scrolled) {
        return false;
      }

      return (fields.signer || []).every((field) => {
        if (!field.validation?.required) return true;
        const value = fieldValues.get(field.id);
        return value && (typeof value !== "string" || value.trim());
      });
    }, [scrolled, fields.signer, fieldValues, document.displayOptions]);
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
        const url = URL.createObjectURL(blob);
        const a = globalThis.document.createElement("a");
        a.href = url;
        a.download = download?.fileName || "document.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    }, [isDisabled, download, onDownload]);
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

/**
 * @superdoc-dev/esign
 * eSignature component for SuperDoc
 *
 * @version 0.1.0
 * @license MIT
 */

type SuperDocInstance = import("superdoc").SuperDoc;

export interface FieldUpdate {
  id?: string;
  alias?: string;
  value: any;
}

export interface SuperDocEsignConfig {
  // Document setup
  document: string | File | Blob;
  container: string | HTMLElement;
  superdoc?: SuperDocInstance;

  // Field values to replace
  fields?: FieldUpdate[];

  // Requirements
  requirements?: {
    scroll?: boolean;
    signature?: boolean;
    consents?: string[];
  };

  // UI elements (user provides these)
  elements?: {
    signature?: string | HTMLElement;
    consents?: string | HTMLElement | HTMLElement[] | NodeList;
  };

  // Callbacks
  onReady?: () => void;
  onChange?: (status: Status) => void;
  onAccept?: (data: AuditData) => void | Promise<void>;
  onError?: (error: Error) => void;
  onFieldsDiscovered?: (fields: FieldInfo[]) => void;
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

export default class SuperDocEsign {
  private config: SuperDocEsignConfig;
  private superdoc: SuperDocInstance | null = null;
  private state = {
    scrolled: false,
    signed: false,
    consents: new Set<string>(),
    startTime: Date.now(),
    fields: new Map<string, FieldInfo>(),
  };

  constructor(config: SuperDocEsignConfig) {
    this.config = config;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Initialize SuperDoc
      if (this.config.superdoc) {
        this.superdoc = this.config.superdoc;
        this.onSuperDocReady();
      } else if (this.config.document && this.config.container) {
        await this.initSuperDoc();
      } else {
        throw new Error(
          "Either superdoc instance or document + container required",
        );
      }
    } catch (error) {
      this.config.onError?.(error as Error);
    }
  }

  private async initSuperDoc(): Promise<void> {
    try {
      const { SuperDoc } = await import("superdoc");

      this.superdoc = new SuperDoc({
        selector: this.config.container,
        document: this.config.document,
        documentMode: "viewing",
        onReady: () => this.onSuperDocReady(),
        onException: ({ error }: { error: Error }) =>
          this.config.onError?.(error),
      });
    } catch {
      throw new Error("Failed to initialize SuperDoc");
    }
  }

  private onSuperDocReady(): void {
    // Discover and populate fields
    this.discoverFields();

    if (this.config.fields) {
      this.updateFields(this.config.fields);
    }

    // Setup tracking
    this.setupTracking();

    // Ready
    this.config.onReady?.();
    this.checkRequirements();
  }

  private discoverFields(): void {
    if (!this.superdoc?.activeEditor) return;

    const editor = this.superdoc.activeEditor;
    const tags =
      editor.helpers.structuredContentCommands.getStructuredContentTags(
        editor.state,
      );

    // Create a map of initial values from config
    const configValues = new Map<string, any>();
    this.config.fields?.forEach((f) => {
      const key = f.id || f.alias;
      if (key) configValues.set(key, f.value);
    });

    const fields: FieldInfo[] = tags.map(({ node }: { node: any }) => {
      const id = node.attrs.id;
      const alias = node.attrs.alias;
      const configValue = configValues.get(id) ?? configValues.get(alias);

      return {
        id,
        label: alias,
        value: configValue ?? node.textContent ?? "",
      };
    });

    if (fields.length > 0) {
      fields.forEach((field) => this.state.fields.set(field.id, field));
      this.config.onFieldsDiscovered?.(fields);
    }
  }

  private setupTracking(): void {
    // Scroll tracking
    if (this.config.requirements?.scroll) {
      this.trackScroll();
    }

    // Signature tracking
    if (
      this.config.requirements?.signature &&
      this.config.elements?.signature
    ) {
      this.trackSignature();
    }

    // Consent tracking
    if (this.config.requirements?.consents && this.config.elements?.consents) {
      this.trackConsents();
    }
  }

  private trackScroll(): void {
    const container = this.getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

      if (scrollPercentage >= 0.95) {
        this.state.scrolled = true;
        this.checkRequirements();
      }
    };

    container.addEventListener("scroll", handleScroll);

    // Check if already scrolled
    handleScroll();
  }

  private trackSignature(): void {
    const element = this.getElement(this.config.elements?.signature);
    if (!element) return;

    const checkSignature = () => {
      const hasSigned = this.hasSignatureValue(element);
      if (hasSigned !== this.state.signed) {
        this.state.signed = hasSigned;
        this.checkRequirements();
      }
    };

    // Listen for changes
    ["input", "change", "mouseup", "touchend"].forEach((event) => {
      element.addEventListener(event, checkSignature);
    });
  }

  private trackConsents(): void {
    const elements = this.getElements(this.config.elements?.consents);

    elements.forEach((element) => {
      const checkbox = element as HTMLInputElement;
      const id = checkbox.name || checkbox.id;

      if (!id) return;

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.state.consents.add(id);
        } else {
          this.state.consents.delete(id);
        }
        this.checkRequirements();
      });

      // Check initial state
      if (checkbox.checked) {
        this.state.consents.add(id);
      }
    });
  }

  private checkRequirements(): void {
    const status = this.getStatus();
    this.config.onChange?.(status);
  }

  private hasSignatureValue(element: HTMLElement): boolean {
    // Canvas
    if (element.tagName === "CANVAS") {
      const canvas = element as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return imageData.data.some((channel) => channel !== 0);
    }

    // Input
    if ("value" in element) {
      return !!(element as HTMLInputElement).value?.trim();
    }

    // Custom component
    return element.dataset.signed === "true";
  }

  private getScrollContainer(): HTMLElement | null {
    const container = this.config.container
      ? this.getElement(this.config.container)
      : (document.querySelector(
          ".super-editor-scroll-container",
        ) as HTMLElement | null);

    return container;
  }

  // Public API

  getFields(): FieldInfo[] {
    return Array.from(this.state.fields.values());
  }

  updateFields(fields: FieldUpdate[]): void {
    if (!this.superdoc?.activeEditor) return;

    const editor = this.superdoc.activeEditor;

    fields.forEach(({ id, alias, value }) => {
      const textValue = String(value);

      if (id) {
        editor.commands.updateStructuredContentById(id, { text: textValue });
        const field = this.state.fields.get(id);
        if (field) field.value = value;
      } else if (alias) {
        editor.commands.updateStructuredContentByAlias(alias, {
          text: textValue,
        });
        // Update local state by finding field with matching alias
        for (const field of this.state.fields.values()) {
          if (field.label === alias) {
            field.value = value;
            break;
          }
        }
      }
    });
  }

  getStatus(): Status {
    const requirements = this.config.requirements || {};
    const requiredConsents = requirements.consents || [];

    const status: Status = {
      scroll: !requirements.scroll || this.state.scrolled,
      signature: !requirements.signature || this.state.signed,
      consents: Array.from(this.state.consents),
      isValid: false,
    };

    // Check if all consents are met
    const allConsents = requiredConsents.every((id) =>
      this.state.consents.has(id),
    );

    status.isValid = status.scroll && status.signature && allConsents;

    return status;
  }

  isValid(): boolean {
    return this.getStatus().isValid;
  }

  async accept(): Promise<AuditData | false> {
    if (!this.isValid()) {
      return false;
    }

    // Get current field values
    const currentFields: FieldUpdate[] = Array.from(
      this.state.fields.values(),
    ).map((f) => ({
      id: f.id,
      alias: f.label,
      value: f.value,
    }));

    const data: AuditData = {
      timestamp: new Date().toISOString(),
      duration: Math.round((Date.now() - this.state.startTime) / 1000),
      fields: currentFields,
      scrolled: this.state.scrolled,
      signed: this.state.signed,
      consents: Array.from(this.state.consents),
      signatureImage: this.getSignatureImage(),
    };

    await this.config.onAccept?.(data);
    return data;
  }

  reset(): void {
    this.state = {
      scrolled: false,
      signed: false,
      consents: new Set<string>(),
      startTime: Date.now(),
      fields: this.state.fields,
    };

    const container = this.getScrollContainer();
    if (container) {
      container.scrollTop = 0;
    }

    this.checkRequirements();
  }

  destroy(): void {
    if (this.superdoc && !this.config.superdoc) {
      this.superdoc.destroy?.();
    }
    this.superdoc = null;
  }

  // Utilities

  private getSignatureImage(): string | undefined {
    const element = this.getElement(this.config.elements?.signature);
    if (element?.tagName === "CANVAS") {
      return (element as HTMLCanvasElement).toDataURL("image/png");
    }
    return undefined;
  }

  private getElement(selector: any): HTMLElement | null {
    if (!selector) return null;
    if (typeof selector === "string") {
      return document.querySelector<HTMLElement>(selector);
    }
    return selector as HTMLElement;
  }

  private getElements(selectors: any): HTMLElement[] {
    if (!selectors) return [];

    if (typeof selectors === "string") {
      return Array.from(document.querySelectorAll<HTMLElement>(selectors));
    }

    if (selectors instanceof NodeList) {
      return Array.from(selectors) as HTMLElement[];
    }

    if (Array.isArray(selectors)) {
      return selectors
        .map((s) => this.getElement(s))
        .filter(Boolean) as HTMLElement[];
    }

    return [selectors];
  }
}

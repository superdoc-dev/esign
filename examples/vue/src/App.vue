<template>
    <div>
        <h1>Terms of Service</h1>

        <!-- The document viewer - SuperDoc renders here -->
        <div ref="documentContainer" class="document-viewer" />

        <!-- Your signature UI - tracked by eSign -->
        <input id="signature-input" type="text" placeholder="Type your full name" :disabled="isAccepted" />

        <!-- Your consent UI - tracked by eSign -->
        <label>
            <input type="checkbox" name="tos" :disabled="!canAccept" />
            I accept the terms of service
        </label>

        <!-- Status display -->
        <div class="status">
            <span v-if="!isReady">Loading...</span>
            <span v-else-if="!requirements.scroll">Please scroll to bottom</span>
            <span v-else-if="!requirements.signature">Please sign</span>
            <span v-else-if="isAccepted">✓ Agreement accepted</span>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import SuperDocEsign from '@superdoc-dev/esign';

// Component state
const isReady = ref(false);
const isAccepted = ref(false);
const requirements = ref({
    scroll: false,
    signature: false,
    isValid: false
});

// Template refs
const documentContainer = ref(null);

// Instance ref
let esignInstance = null;

// Computed
const canAccept = computed(() =>
    requirements.value.scroll && requirements.value.signature
);

// Lifecycle
onMounted(() => {
    // Initialize the component
    esignInstance = new SuperDocEsign({
        // 1. Where to render the document
        container: documentContainer.value,

        // 2. What document to show
        document: 'https://storage.googleapis.com/public_statichosting/word_documents/sample.docx',

        // 3. Define requirements
        requirements: {
            scroll: true,
            signature: true,
            consents: ['tos']
        },

        // 4. Tell eSign which UI elements to track
        elements: {
            signature: '#signature-input',
            consents: 'input[name="tos"]'
        },

        // 5. Optional: Populate fields
        fields: {
            userName: 'John Doe',
            date: new Date().toLocaleDateString()
        },

        // 6. Callbacks
        onReady: () => {
            console.log('Component ready');
            isReady.value = true;
        },

        onChange: (status) => {
            console.log('Requirements changed:', status);
            requirements.value = status;

            // Auto-accept when ready
            if (status.isValid && !isAccepted.value) {
                esignInstance.accept();
            }
        },

        onAccept: async (auditData) => {
            console.log('Document accepted:', auditData);

            // Send to your backend
            try {
                await fetch('/api/accept-agreement', {
                    method: 'POST',
                    body: JSON.stringify(auditData)
                });
                isAccepted.value = true;
            } catch (error) {
                console.error('Failed to save:', error);
            }
        },

        onError: (error) => {
            console.error('eSign error:', error);
        }
    });
});

onUnmounted(() => {
    // Cleanup
    esignInstance?.destroy();
});

// Methods you can expose
const resetDocument = () => {
    esignInstance?.reset();
    isAccepted.value = false;
};

const loadNewDocument = (file) => {
    esignInstance?.loadDocument(file);
};
</script>

<style scoped>
.document-viewer {
    height: 500px;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    margin: 20px 0;
    background: white;
    overflow: auto;
}
</style>
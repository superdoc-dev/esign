import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, normalizeFields } from './server.js';

describe('Server', () => {
  describe('GET /health', () => {
    it('returns ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('normalizeFields', () => {
    it('returns empty array when no fields provided', () => {
      expect(normalizeFields()).toEqual([]);
      expect(normalizeFields({})).toEqual([]);
      expect(normalizeFields({ document: [], signer: [] })).toEqual([]);
    });

    it('normalizes document fields with default text type', () => {
      const fields = {
        document: [{ id: '123', value: 'test value' }],
      };

      const result = normalizeFields(fields);

      expect(result).toEqual([{ id: '123', value: 'test value', type: 'text' }]);
    });

    it('preserves table type for table fields', () => {
      const fields = {
        document: [
          { id: '123', value: [['row1'], ['row2']], type: 'table' },
        ],
      };

      const result = normalizeFields(fields);

      expect(result).toEqual([
        { id: '123', value: [['row1'], ['row2']], type: 'table' },
      ]);
    });

    it('preserves text type when explicitly set', () => {
      const fields = {
        document: [{ id: '123', value: 'hello', type: 'text' }],
      };

      const result = normalizeFields(fields);

      expect(result).toEqual([{ id: '123', value: 'hello', type: 'text' }]);
    });

    it('handles mixed document and signer fields', () => {
      const fields = {
        document: [
          { id: 'doc1', value: 'Document Value' },
          { id: 'doc2', value: [['table data']], type: 'table' },
        ],
        signer: [{ id: 'signer1', value: 'Signer Value' }],
      };

      const result = normalizeFields(fields);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ id: 'doc1', value: 'Document Value', type: 'text' });
      expect(result).toContainEqual({ id: 'doc2', value: [['table data']], type: 'table' });
      expect(result).toContainEqual({ id: 'signer1', value: 'Signer Value', type: 'text' });
    });

    it('filters out consent fields', () => {
      const fields = {
        document: [
          { id: '123', value: 'keep me' },
          { id: 'consent_agreement', value: 'filter me' },
          { id: 'terms', value: 'filter me too' },
          { id: 'email', value: 'filter email' },
          { id: '406948812', value: 'filter this id' },
        ],
      };

      const result = normalizeFields(fields);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
    });

    it('filters out fields without id', () => {
      const fields = {
        document: [
          { id: '123', value: 'keep' },
          { value: 'no id' },
          { id: null, value: 'null id' },
          { id: '', value: 'empty id' },
        ],
      };

      const result = normalizeFields(fields);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
    });

    it('defaults null/undefined values to empty string', () => {
      const fields = {
        document: [
          { id: '1', value: null },
          { id: '2', value: undefined },
          { id: '3' },
        ],
      };

      const result = normalizeFields(fields);

      expect(result).toEqual([
        { id: '1', value: '', type: 'text' },
        { id: '2', value: '', type: 'text' },
        { id: '3', value: '', type: 'text' },
      ]);
    });

    describe('signature field handling', () => {
      const SIGNATURE_FIELD_ID = '789012';

      it('sets signature type for signature field in sign mode', () => {
        const fields = {
          signer: [{ id: SIGNATURE_FIELD_ID, value: 'data:image/png;base64,abc' }],
        };

        const result = normalizeFields(fields, 'sign');

        expect(result[0].type).toBe('signature');
        expect(result[0].options).toBeDefined();
        expect(result[0].options.bottomLabel).toBeDefined();
      });

      it('sets image type for signature field in annotate mode', () => {
        const fields = {
          signer: [{ id: SIGNATURE_FIELD_ID, value: 'data:image/png;base64,abc' }],
        };

        const result = normalizeFields(fields, 'annotate');

        expect(result[0].type).toBe('image');
        expect(result[0].options).toBeUndefined();
      });

      it('defaults to annotate mode when signatureMode not provided', () => {
        const fields = {
          signer: [{ id: SIGNATURE_FIELD_ID, value: 'data:image/png;base64,abc' }],
        };

        const result = normalizeFields(fields);

        expect(result[0].type).toBe('image');
      });
    });
  });

  describe('POST /v1/download', () => {
    it('returns 400 when document.url is missing', async () => {
      const response = await request(app)
        .post('/v1/download')
        .send({ fields: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });

    it('returns 400 when document is missing', async () => {
      const response = await request(app).post('/v1/download').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });

    it('returns 400 when body is empty', async () => {
      const response = await request(app)
        .post('/v1/download')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });
  });

  describe('POST /v1/sign', () => {
    it('returns 400 when document.url is missing', async () => {
      const response = await request(app)
        .post('/v1/sign')
        .send({ documentFields: [], signerFields: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });

    it('returns 400 when document is missing', async () => {
      const response = await request(app).post('/v1/sign').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });

    it('returns 400 when body is empty', async () => {
      const response = await request(app)
        .post('/v1/sign')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('document.url is required');
    });
  });
});

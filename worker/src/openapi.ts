import { themeOptions } from '../../src/lib/config/themes.ts'
import { SITE_LOCALES } from '../../src/lib/i18n/locales.ts'
import { formatCatalog, OUTPUT_TYPES, TIMEZONE } from './schema.ts'

const CURL_EXAMPLE = `curl -sS https://eva.dashen.wang/api/v1/covers/png \\
  -H "Authorization: Bearer $EVA_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  --data '{"title":"当一家公司薄到极致","subtitle":"结构、效率与生存","formatId":"article","themeId":"mono","locale":"zh-CN"}' \\
  --output cover.png`

const JS_EXAMPLE = `const token = process.env.EVA_API_TOKEN
const response = await fetch('https://eva.dashen.wang/api/v1/covers/webp', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({
    title: '当一家公司薄到极致',
    subtitle: '结构、效率与生存',
    formatId: 'article',
    themeId: 'mono',
    quality: 80,
    locale: 'zh-CN',
  }),
})
if (!response.ok) {
  throw new Error(JSON.stringify(await response.json()))
}
const bytes = new Uint8Array(await response.arrayBuffer())
await Bun.write('cover.webp', bytes)`

const PHP_EXAMPLE = `<?php
$ch = curl_init('https://eva.dashen.wang/api/v1/covers/png');
$payload = json_encode([
  'title' => '当一家公司薄到极致',
  'subtitle' => '结构、效率与生存',
  'formatId' => 'article',
  'themeId' => 'mono',
  'locale' => 'zh-CN',
], JSON_UNESCAPED_UNICODE);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('EVA_API_TOKEN'),
    'Content-Type: application/json',
    'Idempotency-Key: ' . bin2hex(random_bytes(16)),
  ],
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 60,
]);
$binary = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);
if ($status === 200 && str_starts_with($type, 'image/png')) {
  file_put_contents('cover.png', $binary);
} else {
  fwrite(STDERR, $binary);
  exit(1);
}

// WordPress:
// $response = wp_remote_post('https://eva.dashen.wang/api/v1/covers/webp', [
//   'timeout' => 60,
//   'headers' => [
//     'Authorization' => 'Bearer ' . getenv('EVA_API_TOKEN'),
//     'Content-Type' => 'application/json',
//     'Idempotency-Key' => wp_generate_uuid4(),
//   ],
//   'body' => wp_json_encode(['title' => '封面标题', 'formatId' => 'article', 'quality' => 80]),
// ]);
// $type = wp_remote_retrieve_header($response, 'content-type');
// $body = wp_remote_retrieve_body($response);
// if (wp_remote_retrieve_response_code($response) === 200 && is_string($type) && str_starts_with($type, 'image/')) {
//   file_put_contents(WP_CONTENT_DIR . '/uploads/eva-cover.webp', $body);
// }`

const COVER_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['title'],
  properties: {
    title: { type: 'string', description: 'Required single-line title.' },
    subtitle: { type: 'string', description: 'Optional single-line subtitle.' },
    series: { type: 'string' },
    issue: { type: 'string' },
    date: {
      description: 'Omit or null for Asia/Shanghai today as YYYY.MM.DD. Empty string hides the date. YYYY-MM-DD and YYYY.MM.DD are accepted.',
      oneOf: [{ type: 'string' }, { type: 'null' }],
    },
    author: { type: 'string' },
    handle: { type: 'string' },
    site: { type: 'string' },
    mark: { type: 'string', description: 'Optional mark. Empty draws nothing (no NERV default).' },
    content: {
      type: 'object',
      description: 'Optional nested content object. Top-level fields override nested keys.',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        series: { type: 'string' },
        issue: { type: 'string' },
        date: { type: 'string' },
        author: { type: 'string' },
        handle: { type: 'string' },
        site: { type: 'string' },
        mark: { type: 'string' },
      },
    },
    formatId: {
      type: 'string',
      enum: formatCatalog().map((format) => format.id),
      default: 'article',
    },
    themeId: {
      type: 'string',
      enum: themeOptions.map((theme) => theme.id),
      default: 'mono',
    },
    scale: { type: 'integer', enum: [1, 2], description: 'Defaults to the format defaultScale.' },
    output: { type: 'string', enum: [...OUTPUT_TYPES], default: 'png' },
    format: { type: 'string', enum: [...OUTPUT_TYPES], description: 'Alias of output.' },
    quality: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 80,
      description: 'WebP uses this value. PNG is lossless and ignores quality for pixels.',
    },
    locale: { type: 'string', enum: [...SITE_LOCALES], default: 'zh-CN', description: 'Error language only. JSON keys stay English.' },
    background: { type: 'string', description: 'Optional image data URL (png, jpeg, webp, gif).' },
    backgroundOpacity: { type: 'integer', minimum: 0, maximum: 100, default: 28 },
    idempotencyKey: { type: 'string', description: 'Same key concurrent/retry counts +1 total. Independent successes each +1.' },
    turnstileToken: { type: 'string', description: 'Required for POST /api/v1/exports.' },
  },
}

const ERROR_SCHEMA = {
  type: 'object',
  required: ['error', 'code', 'message'],
  properties: {
    error: { type: 'string', description: 'English slug.' },
    code: {
      type: 'string',
      enum: [
        'UNAUTHORIZED',
        'TURNSTILE_FAILED',
        'TURNSTILE_UNAVAILABLE',
        'VALIDATION_ERROR',
        'TEXT_DOES_NOT_FIT',
        'RATE_LIMITED',
        'NOT_FOUND',
        'METHOD_NOT_ALLOWED',
        'PAYLOAD_TOO_LARGE',
        'INVALID_JSON',
        'WEBP_UNAVAILABLE',
        'INTERNAL_ERROR',
      ],
    },
    message: { type: 'string', description: 'Localized message. Keys stay English.' },
  },
}

function coverPost(description: string, extras: Record<string, unknown> = {}) {
  return {
    post: {
      ...extras,
      description,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CoverRequest' } },
        },
      },
      responses: {
        '200': {
          description: 'Image bytes. Content-Type matches PNG or WebP magic.',
          content: {
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'image/webp': { schema: { type: 'string', format: 'binary' } },
          },
        },
        '400': { description: 'Validation or text overflow.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '401': { description: 'Missing or invalid Bearer token.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '403': { description: 'Turnstile failed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '413': { description: 'Payload too large.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '429': { description: 'Rate limited.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '500': { description: 'Internal error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        '501': { description: 'WebP unavailable.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  }
}

export function openApiDocument(version: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'eva.dashen.wang Cover API',
      version,
      description: [
        'Raster cover HTTP API for EVA-style title cards.',
        'Success responses are PNG or WebP bytes. Failures are JSON `{ error, code, message }`.',
        'Count only successful delivered images. Seed 13514 lives in Durable Object SQLite and is not publicly writable.',
        'Idempotency-Key header or JSON idempotencyKey: same key concurrent/retry +1 total; independent successes each +1.',
        'quality 1-100 applies to WebP. PNG is lossless.',
        '',
        'curl:',
        '```',
        CURL_EXAMPLE,
        '```',
        '',
        'JavaScript:',
        '```',
        JS_EXAMPLE,
        '```',
        '',
        'PHP / WordPress:',
        '```',
        PHP_EXAMPLE,
        '```',
      ].join('\n'),
    },
    servers: [
      { url: 'https://eva.dashen.wang', description: 'Production' },
      { url: 'http://localhost:8787', description: 'wrangler dev' },
    ],
    paths: {
      '/api/v1/covers': coverPost('Program clients. Authorization: Bearer $EVA_API_TOKEN.', {
        security: [{ bearerAuth: [] }],
        operationId: 'createCover',
      }),
      '/api/v1/covers/png': coverPost('Same as /covers with output forced to png.', {
        security: [{ bearerAuth: [] }],
        operationId: 'createCoverPng',
      }),
      '/api/v1/covers/webp': coverPost('Same as /covers with output forced to webp.', {
        security: [{ bearerAuth: [] }],
        operationId: 'createCoverWebp',
      }),
      '/api/v1/exports': coverPost('Public web export. JSON body must include turnstileToken.', {
        operationId: 'createExport',
      }),
      '/api/v1/stats': {
        get: {
          operationId: 'getStats',
          description: 'Public cumulative successful deliveries, including seed 13514. No secrets.',
          responses: {
            '200': {
              description: 'Count payload.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['count'],
                    properties: { count: { type: 'integer', example: 13514 } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/meta': {
        get: {
          operationId: 'getMeta',
          description: 'Version, locales, formats, timezone, today, and output types.',
          responses: {
            '200': {
              description: 'Metadata.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      version: { type: 'string' },
                      locales: { type: 'array', items: { type: 'string' } },
                      formats: { type: 'array', items: { type: 'object' } },
                      timezone: { type: 'string', example: TIMEZONE },
                      today: { type: 'string', example: '2026.10.07' },
                      output: { type: 'array', items: { type: 'string', enum: [...OUTPUT_TYPES] } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          operationId: 'getOpenApi',
          description: 'This document.',
          responses: {
            '200': { description: 'OpenAPI 3 JSON.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'EVA_API_TOKEN',
          description: 'Use the EVA_API_TOKEN environment variable. Do not paste real tokens into docs.',
        },
      },
      schemas: {
        CoverRequest: COVER_SCHEMA,
        Error: ERROR_SCHEMA,
      },
    },
  }
}

import { TextDoesNotFitError } from '../../src/lib/generator/measure-text.ts'
import { SITE_LOCALES } from '../../src/lib/i18n/locales.ts'
import { themeOptions } from '../../src/lib/config/themes.ts'
import {
  ERROR_STATUS,
  fieldLabel,
  localizeError,
  type ErrorBody,
  type ErrorCode,
} from './errors.ts'
import { CoverLedger } from './ledger.ts'
import { openApiDocument } from './openapi.ts'
import { renderCover, WebpUnavailableError } from './render.ts'
import {
  formatCatalog,
  hashIdempotencyKey,
  isPngMagic,
  isWebpMagic,
  MAX_BODY_BYTES,
  OUTPUT_TYPES,
  parseCoverRequest,
  resolveLocale,
  shanghaiToday,
  TIMEZONE,
  type CoverRequest,
  type OutputType,
} from './schema.ts'

export { CoverLedger }

const FONT_PATH = '/Eva-Ming-SC-v0.1.otf'
const ALLOWED_HEADERS = 'Authorization, Content-Type, Idempotency-Key, Accept, Accept-Language'
const ALLOWED_METHODS = 'GET, POST, OPTIONS'

const rateWindows = new Map<string, { reset: number; n: number }>()
let cachedFont: ArrayBuffer | null = null

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, message, ...data })
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}

function corsOrigin(origin: string | null): string | null {
  if (!origin) {
    return null
  }
  if (origin === 'https://eva.dashen.wang') {
    return origin
  }
  try {
    const host = new URL(origin).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')) {
      return origin
    }
  } catch {
    return null
  }
  return null
}

function withCors(request: Request, response: Response): Response {
  const origin = corsOrigin(request.headers.get('Origin'))
  if (!origin) {
    return response
  }
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  headers.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length')
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  })
}

function errorResponse(locale: ReturnType<typeof resolveLocale>, code: ErrorCode, extra?: string): Response {
  const body: ErrorBody = localizeError(locale, code, extra)
  const headers: HeadersInit = {}
  if (code === 'RATE_LIMITED') {
    headers['Retry-After'] = '60'
  }
  return json(body, ERROR_STATUS[code], headers)
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'local'
}

function allowRate(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const current = rateWindows.get(key)
  if (!current || now >= current.reset) {
    rateWindows.set(key, { reset: now + windowMs, n: 1 })
    if (rateWindows.size > 4000) {
      for (const [bucket, value] of rateWindows) {
        if (now >= value.reset) {
          rateWindows.delete(bucket)
        }
      }
    }
    return true
  }
  if (current.n >= limit) {
    return false
  }
  current.n += 1
  return true
}

function isLocalTestHost(url: URL): boolean {
  const host = url.hostname
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '[::1]'
    || host.endsWith('.localhost')
    || host.endsWith('.wrangler.dev')
}

async function timingSafeEqualString(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  return crypto.subtle.timingSafeEqual(new Uint8Array(leftHash), new Uint8Array(rightHash))
}

async function hasValidBearer(header: string | null, expected: string | undefined): Promise<boolean> {
  if (!expected) {
    return false
  }
  if (!header || !header.startsWith('Bearer ')) {
    return false
  }
  return timingSafeEqualString(header.slice(7).trim(), expected)
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (ip && ip !== 'local') {
    body.set('remoteip', ip)
  }
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    return false
  }
  const data = await response.json() as { success?: boolean }
  return data.success === true
}

async function loadFont(env: Env): Promise<ArrayBuffer> {
  if (cachedFont) {
    return cachedFont
  }
  const response = await env.ASSETS.fetch(new Request(`https://assets.local${FONT_PATH}`))
  if (!response.ok) {
    throw new Error(`font asset HTTP ${response.status}`)
  }
  cachedFont = await response.arrayBuffer()
  return cachedFont
}

function pathOutput(pathname: string): OutputType | null {
  if (pathname.endsWith('/png')) {
    return 'png'
  }
  if (pathname.endsWith('/webp')) {
    return 'webp'
  }
  return null
}

function ledger(env: Env) {
  return env.COVER_LEDGER.getByName('global')
}

async function readJson(request: Request, localeHint: ReturnType<typeof resolveLocale>): Promise<
  { ok: true; value: unknown } | { ok: false; response: Response }
> {
  const length = Number(request.headers.get('content-length') || '0')
  if (length > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(localeHint, 'PAYLOAD_TOO_LARGE') }
  }
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return { ok: false, response: errorResponse(localeHint, 'INVALID_JSON') }
  }
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(localeHint, 'PAYLOAD_TOO_LARGE') }
  }
  if (raw.trim() === '') {
    return { ok: true, value: {} }
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown }
  } catch {
    return { ok: false, response: errorResponse(localeHint, 'INVALID_JSON') }
  }
}

function parseFailureExtra(
  locale: ReturnType<typeof resolveLocale>,
  field?: string,
  detail?: string,
): string | undefined {
  if (!field && !detail) {
    return undefined
  }
  const label = field ? fieldLabel(locale, field) : ''
  if (detail === 'required') {
    return `${label}`.trim()
  }
  if (detail === 'must_be_one_line') {
    return label
  }
  return [label, detail].filter(Boolean).join(': ')
}

async function handleRender(
  request: Request,
  env: Env,
  parsed: CoverRequest,
  source: 'api' | 'web',
): Promise<Response> {
  try {
    const fontBytes = await loadFont(env)
    const rendered = await renderCover(parsed, fontBytes)
    const magicOk = rendered.contentType === 'image/png'
      ? isPngMagic(rendered.bytes)
      : isWebpMagic(rendered.bytes)
    if (!magicOk) {
      log('error', 'raster magic mismatch', { type: rendered.contentType })
      return errorResponse(parsed.locale, 'INTERNAL_ERROR')
    }
    const idempotencyHash = parsed.idempotencyKey ? await hashIdempotencyKey(parsed.idempotencyKey) : null
    await ledger(env).recordDelivery({
      source,
      output: parsed.output,
      locale: parsed.locale,
      formatId: parsed.formatId,
      idempotencyHash,
    })
    const filename = `eva-cover.${parsed.output}`
    return new Response(rendered.bytes, {
      status: 200,
      headers: {
        'content-type': rendered.contentType,
        'content-length': String(rendered.bytes.byteLength),
        'cache-control': 'no-store',
        'content-disposition': `inline; filename="${filename}"`,
        'x-eva-width': String(rendered.width),
        'x-eva-height': String(rendered.height),
      },
    })
  } catch (error) {
    if (error instanceof TextDoesNotFitError) {
      const field = error.field === '标题' ? 'title' : error.field === '副标题' ? 'subtitle' : error.field === '标志' ? 'mark' : error.field
      return errorResponse(parsed.locale, 'TEXT_DOES_NOT_FIT', fieldLabel(parsed.locale, field))
    }
    if (error instanceof WebpUnavailableError) {
      log('warn', 'webp unavailable', { error: error.message })
      return errorResponse(parsed.locale, 'WEBP_UNAVAILABLE')
    }
    log('error', 'render failed', { error: error instanceof Error ? error.message : String(error) })
    return errorResponse(parsed.locale, 'INTERNAL_ERROR')
  }
}

async function handleCoverPost(
  request: Request,
  env: Env,
  url: URL,
  pathname: string,
  source: 'api' | 'web',
): Promise<Response> {
  const localeHint = resolveLocale(url.searchParams.get('locale'))
  const ip = clientIp(request)
  const limit = source === 'web' ? 20 : 60
  if (!allowRate(`${source}:${ip}`, limit)) {
    return errorResponse(localeHint, 'RATE_LIMITED')
  }
  if (source === 'api') {
    const ok = await hasValidBearer(request.headers.get('Authorization'), env.EVA_API_TOKEN)
    if (!ok) {
      return errorResponse(localeHint, 'UNAUTHORIZED')
    }
  }
  const parsedJson = await readJson(request, localeHint)
  if (!parsedJson.ok) {
    return parsedJson.response
  }
  const parsed = parseCoverRequest(parsedJson.value, {
    outputFromPath: pathOutput(pathname),
    idempotencyHeader: request.headers.get('Idempotency-Key'),
  })
  if (!parsed.ok) {
    const locale = resolveLocale(
      parsedJson.value && typeof parsedJson.value === 'object' && parsedJson.value !== null
        && 'locale' in parsedJson.value
        ? (parsedJson.value as { locale?: unknown }).locale
        : localeHint,
    )
    return errorResponse(locale, parsed.code, parseFailureExtra(locale, parsed.field, parsed.detail))
  }
  if (source === 'web') {
    const secret = env.TURNSTILE_SECRET ?? ''
    if (!secret) {
      if (!isLocalTestHost(url)) {
        return errorResponse(parsed.value.locale, 'TURNSTILE_UNAVAILABLE')
      }
    } else {
      if (!parsed.value.turnstileToken) {
        return errorResponse(parsed.value.locale, 'TURNSTILE_FAILED')
      }
      const human = await verifyTurnstile(parsed.value.turnstileToken, secret, ip)
      if (!human) {
        return errorResponse(parsed.value.locale, 'TURNSTILE_FAILED')
      }
    }
  }
  return handleRender(request, env, parsed.value, source)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = normalizePath(url.pathname)
    const localeHint = resolveLocale(url.searchParams.get('locale'))
    try {
      if (request.method === 'OPTIONS') {
        return withCors(request, new Response(null, { status: 204 }))
      }
      if (pathname === '/api/v1/stats' && request.method === 'GET') {
        const count = await ledger(env).getCount()
        return withCors(request, json({ count }))
      }
      if (pathname === '/api/v1/meta' && request.method === 'GET') {
        return withCors(request, json({
          version: env.API_VERSION,
          locales: [...SITE_LOCALES],
          formats: formatCatalog(),
          themes: themeOptions.map((theme) => theme.id),
          timezone: TIMEZONE,
          today: shanghaiToday(),
          output: [...OUTPUT_TYPES],
        }))
      }
      if ((pathname === '/api/v1/openapi.json' || pathname === '/openapi.json') && request.method === 'GET') {
        return withCors(request, json(openApiDocument(env.API_VERSION)))
      }
      const coverPaths = new Set(['/api/v1/covers', '/api/v1/covers/png', '/api/v1/covers/webp'])
      const exportPaths = new Set(['/api/v1/exports', '/api/v1/exports/png', '/api/v1/exports/webp'])
      if (coverPaths.has(pathname) || exportPaths.has(pathname)) {
        if (request.method !== 'POST') {
          return withCors(request, errorResponse(localeHint, 'METHOD_NOT_ALLOWED'))
        }
        const source = coverPaths.has(pathname) ? 'api' : 'web'
        return withCors(request, await handleCoverPost(request, env, url, pathname, source))
      }
      if (request.method === 'GET' || request.method === 'HEAD') {
        return env.ASSETS.fetch(request)
      }
      return withCors(request, errorResponse(localeHint, 'NOT_FOUND'))
    } catch (error) {
      log('error', 'unhandled', { error: error instanceof Error ? error.message : String(error), path: pathname })
      return withCors(request, errorResponse(localeHint, 'INTERNAL_ERROR'))
    }
  },
} satisfies ExportedHandler<Env>

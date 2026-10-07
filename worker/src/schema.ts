import { formatMap, formatOptions, type FormatId } from '../../src/lib/config/formats.ts'
import { themeMap, type ThemeId } from '../../src/lib/config/themes.ts'
import { displayDate } from '../../src/lib/generator/measure-text.ts'
import { DEFAULT_LOCALE, SITE_LOCALES } from '../../src/lib/i18n/locales.ts'
import type { SiteLocale } from '../../src/lib/i18n/types.ts'
import type { ErrorCode } from './errors.ts'

export const COVER_SEED = 13514
export const MAX_BODY_BYTES = 4_000_000
export const MAX_TEXT_CHARS = 200
export const MAX_IDEMPOTENCY_CHARS = 256
export const DEFAULT_QUALITY = 80
export const DEFAULT_BACKGROUND_OPACITY = 28
export const OUTPUT_TYPES = ['png', 'webp'] as const
export const TIMEZONE = 'Asia/Shanghai'

export type OutputType = (typeof OUTPUT_TYPES)[number]

export interface CoverRequest {
  locale: SiteLocale
  title: string
  subtitle: string
  series: string
  issue: string
  date: string
  author: string
  handle: string
  site: string
  mark: string
  formatId: FormatId
  themeId: ThemeId
  scale: 1 | 2
  output: OutputType
  quality: number
  backgroundUrl: string | null
  backgroundOpacity: number
  idempotencyKey: string | null
  turnstileToken: string | null
}

export interface ParseOptions {
  outputFromPath?: OutputType | null
  idempotencyHeader?: string | null
  now?: Date
}

export interface ParseFailure {
  ok: false
  code: ErrorCode
  field?: string
  detail?: string
}

export interface ParseSuccess {
  ok: true
  value: CoverRequest
}

export type ParseResult = ParseSuccess | ParseFailure

const DATE_RE = /^(\d{4})[.-](\d{2})[.-](\d{2})$/
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/]+=*$/i
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pick(body: Record<string, unknown>, content: Record<string, unknown>, key: string): unknown {
  if (key in body) {
    return body[key]
  }
  return content[key]
}

function asOptionalString(value: unknown, field: string, allowNull = false): string | ParseFailure {
  if (value === undefined || (allowNull && value === null)) {
    return ''
  }
  if (typeof value !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', field, detail: 'must_be_string' }
  }
  if (CONTROL_RE.test(value)) {
    return { ok: false, code: 'VALIDATION_ERROR', field, detail: 'control_chars' }
  }
  if (value.length > MAX_TEXT_CHARS) {
    return { ok: false, code: 'VALIDATION_ERROR', field, detail: 'too_long' }
  }
  return value
}

function requireOneLine(value: string, field: string, required: boolean): string | ParseFailure {
  if (/[\r\n]/.test(value)) {
    return { ok: false, code: 'TEXT_DOES_NOT_FIT', field, detail: 'must_be_one_line' }
  }
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (required && trimmed === '') {
    return { ok: false, code: 'VALIDATION_ERROR', field, detail: 'required' }
  }
  return trimmed
}

export function isSiteLocale(value: unknown): value is SiteLocale {
  return typeof value === 'string' && (SITE_LOCALES as readonly string[]).includes(value)
}

export function resolveLocale(value: unknown): SiteLocale {
  return isSiteLocale(value) ? value : DEFAULT_LOCALE
}

export function qualityAffectsPixels(output: OutputType): boolean {
  return output === 'webp'
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let hex = ''
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, '0')
  }
  return hex
}

export function normalizeIdempotencyKey(value: unknown): { ok: true; key: string | null } | ParseFailure {
  if (value === undefined || value === null || value === '') {
    return { ok: true, key: null }
  }
  if (typeof value !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'idempotencyKey', detail: 'must_be_string' }
  }
  const key = value.trim()
  if (key === '') {
    return { ok: true, key: null }
  }
  if (key.length > MAX_IDEMPOTENCY_CHARS) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'idempotencyKey', detail: 'too_long' }
  }
  if (CONTROL_RE.test(key)) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'idempotencyKey', detail: 'control_chars' }
  }
  return { ok: true, key }
}

export async function hashIdempotencyKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return bytesToHex(digest)
}

export function shanghaiToday(now = new Date()): string {
  return displayDate(now)
}

export function resolveCoverDate(input: unknown, now = new Date()): { ok: true; date: string } | ParseFailure {
  if (input === undefined || input === null) {
    return { ok: true, date: shanghaiToday(now) }
  }
  if (typeof input !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'date', detail: 'must_be_string' }
  }
  if (input === '') {
    return { ok: true, date: '' }
  }
  const match = DATE_RE.exec(input.trim())
  if (!match) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'date', detail: 'invalid_format' }
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'date', detail: 'invalid_calendar' }
  }
  return { ok: true, date: `${match[1]}.${match[2]}.${match[3]}` }
}

function parseOutput(body: Record<string, unknown>, outputFromPath?: OutputType | null): OutputType | ParseFailure {
  if (outputFromPath === 'png' || outputFromPath === 'webp') {
    return outputFromPath
  }
  const raw = body.output ?? body.format ?? body.kind
  if (raw === undefined || raw === null || raw === '') {
    return 'png'
  }
  if (raw === 'png' || raw === 'webp') {
    return raw
  }
  return { ok: false, code: 'VALIDATION_ERROR', field: 'output', detail: 'unsupported' }
}

function parseBackground(value: unknown): string | null | ParseFailure {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (typeof value !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'background', detail: 'must_be_string' }
  }
  const trimmed = value.trim()
  if (!DATA_URL_RE.test(trimmed) || trimmed.length > MAX_BODY_BYTES) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'background', detail: 'data_url' }
  }
  return trimmed
}

export function parseCoverRequest(input: unknown, options: ParseOptions = {}): ParseResult {
  if (!isRecord(input)) {
    return { ok: false, code: 'VALIDATION_ERROR', detail: 'object_required' }
  }
  const content = isRecord(input.content) ? input.content : {}
  const localeRaw = input.locale
  if (localeRaw !== undefined && localeRaw !== null && localeRaw !== '' && !isSiteLocale(localeRaw)) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'locale', detail: 'unsupported' }
  }
  const locale = resolveLocale(localeRaw)

  const titleRaw = asOptionalString(pick(input, content, 'title'), 'title')
  if (typeof titleRaw !== 'string') {
    return titleRaw
  }
  const title = requireOneLine(titleRaw, 'title', true)
  if (typeof title !== 'string') {
    return title
  }

  const optionalFields = ['subtitle', 'series', 'issue', 'author', 'handle', 'site', 'mark'] as const
  const optional: Record<(typeof optionalFields)[number], string> = {
    subtitle: '',
    series: '',
    issue: '',
    author: '',
    handle: '',
    site: '',
    mark: '',
  }
  for (const field of optionalFields) {
    const raw = asOptionalString(pick(input, content, field), field, true)
    if (typeof raw !== 'string') {
      return raw
    }
    const oneLine = requireOneLine(raw, field, false)
    if (typeof oneLine !== 'string') {
      return oneLine
    }
    optional[field] = oneLine
  }

  const date = resolveCoverDate(pick(input, content, 'date'), options.now)
  if (!('date' in date)) {
    return date
  }

  const formatRaw = input.formatId ?? input.format_id
  const formatId = (formatRaw === undefined || formatRaw === null || formatRaw === ''
    ? 'article'
    : formatRaw) as string
  if (!(formatId in formatMap)) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'formatId', detail: 'unsupported' }
  }
  const format = formatMap[formatId as FormatId]

  const themeRaw = input.themeId ?? input.theme_id
  const themeId = (themeRaw === undefined || themeRaw === null || themeRaw === ''
    ? 'mono'
    : themeRaw) as string
  if (!(themeId in themeMap)) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'themeId', detail: 'unsupported' }
  }

  const scaleRaw = input.scale ?? input.exportScale
  let scale: 1 | 2 = format.defaultScale
  if (scaleRaw !== undefined && scaleRaw !== null && scaleRaw !== '') {
    const numeric = typeof scaleRaw === 'string' ? Number(scaleRaw) : scaleRaw
    if (numeric !== 1 && numeric !== 2) {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'scale', detail: 'unsupported' }
    }
    scale = numeric
  }

  const output = parseOutput(input, options.outputFromPath)
  if (typeof output !== 'string') {
    return output
  }

  const qualityRaw = input.quality ?? input.exportQuality
  let quality = DEFAULT_QUALITY
  if (qualityRaw !== undefined && qualityRaw !== null && qualityRaw !== '') {
    const numeric = typeof qualityRaw === 'string' ? Number(qualityRaw) : qualityRaw
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'quality', detail: 'must_be_number' }
    }
    const rounded = Math.round(numeric)
    if (rounded < 1 || rounded > 100) {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'quality', detail: 'out_of_range' }
    }
    quality = rounded
  }

  const backgroundUrl = parseBackground(input.background ?? input.backgroundUrl)
  if (backgroundUrl !== null && typeof backgroundUrl !== 'string') {
    return backgroundUrl
  }

  const opacityRaw = input.backgroundOpacity
  let backgroundOpacity = DEFAULT_BACKGROUND_OPACITY
  if (opacityRaw !== undefined && opacityRaw !== null && opacityRaw !== '') {
    const numeric = typeof opacityRaw === 'string' ? Number(opacityRaw) : opacityRaw
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'backgroundOpacity', detail: 'must_be_number' }
    }
    const rounded = Math.round(numeric)
    if (rounded < 0 || rounded > 100) {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'backgroundOpacity', detail: 'out_of_range' }
    }
    backgroundOpacity = rounded
  }

  const fromHeader = normalizeIdempotencyKey(options.idempotencyHeader)
  if (!('key' in fromHeader)) {
    return fromHeader
  }
  const fromBody = normalizeIdempotencyKey(input.idempotencyKey)
  if (!('key' in fromBody)) {
    return fromBody
  }
  if (fromHeader.key && fromBody.key && fromHeader.key !== fromBody.key) {
    return { ok: false, code: 'VALIDATION_ERROR', field: 'idempotencyKey', detail: 'header_body_mismatch' }
  }

  const turnstileRaw = input.turnstileToken
  let turnstileToken: string | null = null
  if (turnstileRaw !== undefined && turnstileRaw !== null && turnstileRaw !== '') {
    if (typeof turnstileRaw !== 'string') {
      return { ok: false, code: 'VALIDATION_ERROR', field: 'turnstileToken', detail: 'must_be_string' }
    }
    turnstileToken = turnstileRaw.trim() || null
  }

  return {
    ok: true,
    value: {
      locale,
      title,
      subtitle: optional.subtitle,
      series: optional.series,
      issue: optional.issue,
      date: date.date,
      author: optional.author,
      handle: optional.handle,
      site: optional.site,
      mark: optional.mark,
      formatId: format.id,
      themeId: themeId as ThemeId,
      scale,
      output,
      quality,
      backgroundUrl,
      backgroundOpacity,
      idempotencyKey: fromHeader.key ?? fromBody.key,
      turnstileToken,
    },
  }
}

export function formatCatalog() {
  return formatOptions.map((format) => ({
    id: format.id,
    width: format.width,
    height: format.height,
    ratio: format.ratio,
    defaultScale: format.defaultScale,
  }))
}

export function isPngMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
}

export function isWebpMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
}

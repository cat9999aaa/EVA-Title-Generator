import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ERROR_CODES, ERROR_STATUS, localizeError } from '../src/errors.ts'
import {
  COVER_SEED,
  bytesToHex,
  formatCatalog,
  hashIdempotencyKey,
  isPngMagic,
  isWebpMagic,
  normalizeIdempotencyKey,
  parseCoverRequest,
  qualityAffectsPixels,
  resolveCoverDate,
  resolveLocale,
  shanghaiToday,
} from '../src/schema.ts'

const NOW = new Date('2026-10-07T00:00:00+08:00')

function parse(body, options = {}) {
  return parseCoverRequest(body, { now: NOW, ...options })
}

test('seed is 13514', () => {
  assert.equal(COVER_SEED, 13514)
  const ledger = readFileSync(new URL('../src/ledger.ts', import.meta.url), 'utf8')
  assert.match(ledger, /INSERT OR IGNORE INTO meta \(key, value\) VALUES \('count', \$\{COVER_SEED\}\)/)
  assert.doesNotMatch(ledger, /UPDATE meta SET value = \? WHERE key = 'count'/)
})

test('locale defaults to zh-CN and accepts the five site locales', () => {
  assert.equal(resolveLocale(undefined), 'zh-CN')
  for (const locale of ['zh-CN', 'zh-TW', 'ja-JP', 'en-US', 'ko-KR']) {
    const result = parse({ title: '标题', locale })
    assert.equal(result.ok, true)
    assert.equal(result.value.locale, locale)
  }
  const bad = parse({ title: '标题', locale: 'fr-FR' })
  assert.equal(bad.ok, false)
  assert.equal(bad.code, 'VALIDATION_ERROR')
  assert.equal(bad.field, 'locale')
})

test('date omit and null become Asia/Shanghai today as YYYY.MM.DD', () => {
  assert.equal(shanghaiToday(NOW), '2026.10.07')
  assert.deepEqual(resolveCoverDate(undefined, NOW), { ok: true, date: '2026.10.07' })
  assert.deepEqual(resolveCoverDate(null, NOW), { ok: true, date: '2026.10.07' })
  assert.equal(parse({ title: '标题' }).value.date, '2026.10.07')
  assert.equal(parse({ title: '标题', date: null }).value.date, '2026.10.07')
})

test('empty date hides and dotted or dashed dates are accepted', () => {
  assert.deepEqual(resolveCoverDate('', NOW), { ok: true, date: '' })
  assert.equal(parse({ title: '标题', date: '' }).value.date, '')
  assert.equal(parse({ title: '标题', date: '2026-05-03' }).value.date, '2026.05.03')
  assert.equal(parse({ title: '标题', date: '2026.05.03' }).value.date, '2026.05.03')
  const invalid = resolveCoverDate('2026/05/03', NOW)
  assert.equal(invalid.ok, false)
  assert.equal(invalid.code, 'VALIDATION_ERROR')
  const calendar = resolveCoverDate('2026.02.30', NOW)
  assert.equal(calendar.ok, false)
})

test('title is required and must be one line', () => {
  const missing = parse({})
  assert.equal(missing.ok, false)
  assert.equal(missing.code, 'VALIDATION_ERROR')
  assert.equal(missing.field, 'title')
  const blank = parse({ title: '   ' })
  assert.equal(blank.ok, false)
  const multiline = parse({ title: '第一行\n第二行' })
  assert.equal(multiline.ok, false)
  assert.equal(multiline.code, 'TEXT_DOES_NOT_FIT')
  const nested = parse({ content: { title: ' nested  title ' } })
  assert.equal(nested.ok, true)
  assert.equal(nested.value.title, 'nested title')
})

test('subtitle and mark stay optional one-liners and empty mark is allowed', () => {
  const ok = parse({ title: '标题', subtitle: '', mark: '' })
  assert.equal(ok.ok, true)
  assert.equal(ok.value.subtitle, '')
  assert.equal(ok.value.mark, '')
  const sub = parse({ title: '标题', subtitle: 'a\nb' })
  assert.equal(sub.ok, false)
  assert.equal(sub.code, 'TEXT_DOES_NOT_FIT')
  assert.equal(sub.field, 'subtitle')
})

test('formatId includes article square promo and the original six', () => {
  const ids = formatCatalog().map((format) => format.id)
  assert.deepEqual(ids, ['article', 'square', 'promo', 'x52', 'f169', 'f219', 'f43', 'f11', 'wechat'])
  assert.equal(parse({ title: '标题' }).value.formatId, 'article')
  assert.equal(parse({ title: '标题' }).value.scale, 1)
  assert.equal(parse({ title: '标题', formatId: 'x52' }).value.scale, 2)
  assert.equal(parse({ title: '标题', formatId: 'x52', scale: 1 }).value.scale, 1)
  const bad = parse({ title: '标题', formatId: 'og' })
  assert.equal(bad.ok, false)
  assert.equal(bad.code, 'VALIDATION_ERROR')
})

test('quality is 1-100; WebP uses it and PNG ignores it for pixels', () => {
  assert.equal(qualityAffectsPixels('png'), false)
  assert.equal(qualityAffectsPixels('webp'), true)
  assert.equal(parse({ title: '标题' }).value.quality, 80)
  assert.equal(parse({ title: '标题', quality: 1 }).value.quality, 1)
  assert.equal(parse({ title: '标题', quality: 100, output: 'png' }).value.quality, 100)
  assert.equal(parse({ title: '标题', output: 'png', quality: 12 }).ok, true)
  const low = parse({ title: '标题', quality: 0 })
  assert.equal(low.ok, false)
  const high = parse({ title: '标题', quality: 101 })
  assert.equal(high.ok, false)
})

test('output aliases and path override', () => {
  assert.equal(parse({ title: '标题' }).value.output, 'png')
  assert.equal(parse({ title: '标题', output: 'webp' }).value.output, 'webp')
  assert.equal(parse({ title: '标题', format: 'webp' }).value.output, 'webp')
  assert.equal(parse({ title: '标题', output: 'webp' }, { outputFromPath: 'png' }).value.output, 'png')
  const bad = parse({ title: '标题', output: 'svg' })
  assert.equal(bad.ok, false)
})

test('idempotency key normalize and sha-256 hash helpers', async () => {
  assert.deepEqual(normalizeIdempotencyKey(undefined), { ok: true, key: null })
  assert.deepEqual(normalizeIdempotencyKey(''), { ok: true, key: null })
  assert.deepEqual(normalizeIdempotencyKey('  abc  '), { ok: true, key: 'abc' })
  const long = normalizeIdempotencyKey('x'.repeat(257))
  assert.equal(long.ok, false)
  assert.equal(long.code, 'VALIDATION_ERROR')
  const digest = await hashIdempotencyKey('abc')
  assert.equal(digest, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const bytes = new Uint8Array([0xba, 0x78])
  assert.equal(bytesToHex(bytes), 'ba78')
  const header = parse({ title: '标题' }, { idempotencyHeader: 'k1' })
  assert.equal(header.value.idempotencyKey, 'k1')
  const body = parse({ title: '标题', idempotencyKey: 'k2' })
  assert.equal(body.value.idempotencyKey, 'k2')
  const mismatch = parse({ title: '标题', idempotencyKey: 'k2' }, { idempotencyHeader: 'k1' })
  assert.equal(mismatch.ok, false)
  assert.equal(mismatch.code, 'VALIDATION_ERROR')
})

test('error codes have statuses and localized JSON shape', () => {
  assert.ok(ERROR_CODES.includes('UNAUTHORIZED'))
  assert.ok(ERROR_CODES.includes('TEXT_DOES_NOT_FIT'))
  assert.ok(ERROR_CODES.includes('TURNSTILE_UNAVAILABLE'))
  assert.ok(ERROR_CODES.includes('WEBP_UNAVAILABLE'))
  assert.equal(ERROR_STATUS.UNAUTHORIZED, 401)
  assert.equal(ERROR_STATUS.VALIDATION_ERROR, 400)
  assert.equal(ERROR_STATUS.RATE_LIMITED, 429)
  const zh = localizeError('zh-CN', 'UNAUTHORIZED')
  assert.deepEqual(Object.keys(zh).sort(), ['code', 'error', 'message'])
  assert.equal(zh.code, 'UNAUTHORIZED')
  assert.equal(zh.error, 'unauthorized')
  assert.match(zh.message, /Bearer/)
  const en = localizeError('en-US', 'VALIDATION_ERROR')
  assert.equal(en.message, 'The request is invalid.')
  const ja = localizeError('ja-JP', 'TEXT_DOES_NOT_FIT')
  assert.ok(ja.message.length > 0)
})

test('png and webp magic helpers', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
  assert.equal(isPngMagic(png), true)
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  assert.equal(isWebpMagic(webp), true)
  assert.equal(isPngMagic(webp), false)
})

test('Worker routes and OpenAPI examples stay secret-free', () => {
  const index = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
  assert.match(index, /\/api\/v1\/stats/)
  assert.match(index, /\/api\/v1\/meta/)
  assert.match(index, /\/api\/v1\/covers/)
  assert.match(index, /\/api\/v1\/exports/)
  assert.match(index, /\/api\/v1\/openapi\.json/)
  assert.match(index, /EVA_API_TOKEN/)
  assert.match(index, /TURNSTILE_SECRET/)
  assert.doesNotMatch(index, /cf-[a-z0-9]{20,}/i)
  const openapi = readFileSync(new URL('../src/openapi.ts', import.meta.url), 'utf8')
  assert.match(openapi, /EVA_API_TOKEN/)
  assert.match(openapi, /curl/)
  assert.match(openapi, /wp_json_encode|Authorization: Bearer/)
  assert.doesNotMatch(openapi, /sk-|cfat_|Bearer [A-Za-z0-9_-]{20,}/)
})

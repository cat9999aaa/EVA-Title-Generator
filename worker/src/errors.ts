import type { SiteLocale } from '../../src/lib/i18n/types.ts'

export const ERROR_CODES = [
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
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  TURNSTILE_FAILED: 403,
  TURNSTILE_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
  TEXT_DOES_NOT_FIT: 400,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_JSON: 400,
  WEBP_UNAVAILABLE: 501,
  INTERNAL_ERROR: 500,
}

const ERROR_SLUG: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'unauthorized',
  TURNSTILE_FAILED: 'turnstile_failed',
  TURNSTILE_UNAVAILABLE: 'turnstile_unavailable',
  VALIDATION_ERROR: 'validation_error',
  TEXT_DOES_NOT_FIT: 'text_does_not_fit',
  RATE_LIMITED: 'rate_limited',
  NOT_FOUND: 'not_found',
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  PAYLOAD_TOO_LARGE: 'payload_too_large',
  INVALID_JSON: 'invalid_json',
  WEBP_UNAVAILABLE: 'webp_unavailable',
  INTERNAL_ERROR: 'internal_error',
}

type Catalog = Record<ErrorCode, string>

const zhCN: Catalog = {
  UNAUTHORIZED: '缺少有效的 Bearer 令牌。',
  TURNSTILE_FAILED: '人机验证失败，请刷新后重试。',
  TURNSTILE_UNAVAILABLE: '公开导出未配置 Turnstile，已拒绝请求。',
  VALIDATION_ERROR: '请求参数无效。',
  TEXT_DOES_NOT_FIT: '文字过长，单行无法放入封面安全区。',
  RATE_LIMITED: '请求过于频繁，请稍后再试。',
  NOT_FOUND: '接口不存在。',
  METHOD_NOT_ALLOWED: 'HTTP 方法不被允许。',
  PAYLOAD_TOO_LARGE: '请求体过大。',
  INVALID_JSON: 'JSON 无法解析。',
  WEBP_UNAVAILABLE: '当前运行时无法编码 WebP，请改用 PNG。',
  INTERNAL_ERROR: '服务器内部错误。',
}

const zhTW: Catalog = {
  UNAUTHORIZED: '缺少有效的 Bearer 權杖。',
  TURNSTILE_FAILED: '人機驗證失敗，請重新整理後再試。',
  TURNSTILE_UNAVAILABLE: '公開匯出未設定 Turnstile，已拒絕請求。',
  VALIDATION_ERROR: '請求參數無效。',
  TEXT_DOES_NOT_FIT: '文字過長，單行無法放入封面安全區。',
  RATE_LIMITED: '請求過於頻繁，請稍後再試。',
  NOT_FOUND: '介面不存在。',
  METHOD_NOT_ALLOWED: '不允許此 HTTP 方法。',
  PAYLOAD_TOO_LARGE: '請求內容過大。',
  INVALID_JSON: 'JSON 無法解析。',
  WEBP_UNAVAILABLE: '目前執行環境無法編碼 WebP，請改用 PNG。',
  INTERNAL_ERROR: '伺服器內部錯誤。',
}

const jaJP: Catalog = {
  UNAUTHORIZED: '有効な Bearer トークンがありません。',
  TURNSTILE_FAILED: 'ボット検証に失敗しました。再読み込みして再試行してください。',
  TURNSTILE_UNAVAILABLE: '公開エクスポート用の Turnstile が未設定のため拒否しました。',
  VALIDATION_ERROR: 'リクエストパラメータが無効です。',
  TEXT_DOES_NOT_FIT: '文字が長すぎて、1行ではカバーの安全領域に収まりません。',
  RATE_LIMITED: 'リクエストが多すぎます。しばらくしてから再試行してください。',
  NOT_FOUND: 'エンドポイントが存在しません。',
  METHOD_NOT_ALLOWED: 'この HTTP メソッドは許可されていません。',
  PAYLOAD_TOO_LARGE: 'リクエスト本文が大きすぎます。',
  INVALID_JSON: 'JSON を解析できません。',
  WEBP_UNAVAILABLE: 'このランタイムでは WebP をエンコードできません。PNG を使ってください。',
  INTERNAL_ERROR: 'サーバー内部エラーです。',
}

const enUS: Catalog = {
  UNAUTHORIZED: 'A valid Bearer token is required.',
  TURNSTILE_FAILED: 'Human verification failed. Refresh and try again.',
  TURNSTILE_UNAVAILABLE: 'Public exports are disabled because Turnstile is not configured.',
  VALIDATION_ERROR: 'The request is invalid.',
  TEXT_DOES_NOT_FIT: 'The text is too long to fit on one line inside the cover safe area.',
  RATE_LIMITED: 'Too many requests. Please retry later.',
  NOT_FOUND: 'Endpoint not found.',
  METHOD_NOT_ALLOWED: 'HTTP method not allowed.',
  PAYLOAD_TOO_LARGE: 'The request body is too large.',
  INVALID_JSON: 'JSON could not be parsed.',
  WEBP_UNAVAILABLE: 'WebP encoding is unavailable in this runtime. Use PNG.',
  INTERNAL_ERROR: 'Internal server error.',
}

const koKR: Catalog = {
  UNAUTHORIZED: '유효한 Bearer 토큰이 필요합니다.',
  TURNSTILE_FAILED: '사람 확인에 실패했습니다. 새로고침 후 다시 시도하세요.',
  TURNSTILE_UNAVAILABLE: 'Turnstile이 설정되지 않아 공개보내기를 거부했습니다.',
  VALIDATION_ERROR: '요청 매개변수가 올바르지 않습니다.',
  TEXT_DOES_NOT_FIT: '텍스트가 너무 길어 표지 안전 영역에 한 줄로 넣을 수 없습니다.',
  RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  NOT_FOUND: '엔드포인트가 없습니다.',
  METHOD_NOT_ALLOWED: '허용되지 않는 HTTP 메서드입니다.',
  PAYLOAD_TOO_LARGE: '요청 본문이 너무 큽니다.',
  INVALID_JSON: 'JSON을 해석할 수 없습니다.',
  WEBP_UNAVAILABLE: '이 런타임에서는 WebP를 인코딩할 수 없습니다. PNG를 사용하세요.',
  INTERNAL_ERROR: '서버 내부 오류입니다.',
}

const CATALOG: Record<SiteLocale, Catalog> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': jaJP,
  'en-US': enUS,
  'ko-KR': koKR,
}

const FIELD_NAMES: Record<SiteLocale, Record<string, string>> = {
  'zh-CN': {
    title: '标题',
    subtitle: '副标题',
    mark: '标志',
    date: '日期',
    locale: '语言',
    formatId: '格式',
    themeId: '主题',
    scale: '倍率',
    output: '输出类型',
    quality: '质量',
    background: '背景',
    backgroundOpacity: '背景不透明度',
    idempotencyKey: '幂等键',
    turnstileToken: 'Turnstile',
    series: '系列',
    issue: '期号',
    author: '作者',
    handle: '账号',
    site: '网站',
  },
  'zh-TW': {
    title: '標題',
    subtitle: '副標題',
    mark: '標誌',
    date: '日期',
    locale: '語言',
    formatId: '格式',
    themeId: '主題',
    scale: '倍率',
    output: '輸出類型',
    quality: '品質',
    background: '背景',
    backgroundOpacity: '背景不透明度',
    idempotencyKey: '冪等鍵',
    turnstileToken: 'Turnstile',
    series: '系列',
    issue: '期號',
    author: '作者',
    handle: '帳號',
    site: '網站',
  },
  'ja-JP': {
    title: 'タイトル',
    subtitle: 'サブタイトル',
    mark: 'マーク',
    date: '日付',
    locale: '言語',
    formatId: 'フォーマット',
    themeId: 'テーマ',
    scale: 'スケール',
    output: '出力形式',
    quality: '品質',
    background: '背景',
    backgroundOpacity: '背景不透明度',
    idempotencyKey: '冪等キー',
    turnstileToken: 'Turnstile',
    series: 'シリーズ',
    issue: '号',
    author: '作者',
    handle: 'アカウント',
    site: 'サイト',
  },
  'en-US': {
    title: 'title',
    subtitle: 'subtitle',
    mark: 'mark',
    date: 'date',
    locale: 'locale',
    formatId: 'formatId',
    themeId: 'themeId',
    scale: 'scale',
    output: 'output',
    quality: 'quality',
    background: 'background',
    backgroundOpacity: 'backgroundOpacity',
    idempotencyKey: 'idempotencyKey',
    turnstileToken: 'turnstileToken',
    series: 'series',
    issue: 'issue',
    author: 'author',
    handle: 'handle',
    site: 'site',
  },
  'ko-KR': {
    title: '제목',
    subtitle: '부제',
    mark: '마크',
    date: '날짜',
    locale: '언어',
    formatId: '형식',
    themeId: '테마',
    scale: '배율',
    output: '출력',
    quality: '품질',
    background: '배경',
    backgroundOpacity: '배경 불투명도',
    idempotencyKey: '멱등 키',
    turnstileToken: 'Turnstile',
    series: '시리즈',
    issue: '호',
    author: '저자',
    handle: '계정',
    site: '사이트',
  },
}

export interface ErrorBody {
  error: string
  code: ErrorCode
  message: string
}

export function localizeError(
  locale: SiteLocale,
  code: ErrorCode,
  extra?: string,
): ErrorBody {
  const base = CATALOG[locale][code]
  return {
    error: ERROR_SLUG[code],
    code,
    message: extra ? `${base} ${extra}`.trim() : base,
  }
}

export function fieldLabel(locale: SiteLocale, field: string): string {
  return FIELD_NAMES[locale][field] ?? field
}

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value)
}

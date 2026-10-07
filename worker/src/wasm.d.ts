declare module '*.wasm' {
  const value: WebAssembly.Module
  export default value
}

declare module '@jsquash/webp/codec/enc/webp_enc.js' {
  const factory: (module?: Record<string, unknown>) => Promise<unknown>
  export default factory
}

declare module '@jsquash/webp/utils.js' {
  export function initEmscriptenModule(
    factory: unknown,
    wasm?: WebAssembly.Module,
    overrides?: Record<string, unknown>,
  ): Promise<unknown>
}

declare module '@jsquash/webp/meta.js' {
  export const defaultOptions: Record<string, unknown>
}

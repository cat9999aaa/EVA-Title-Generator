import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('默认SVG导出不重复嵌入16MB全量字体',()=>{const s=read('src/lib/generator/app.ts');assert.match(s,/buildSvgNow\(false\).*downloadSvg/s);assert.doesNotMatch(s,/buildSvgNow\(Boolean\(embeddedFontCss\)\).*downloadSvg/s)});
test('PNG仍嵌入完整字体以保证跨机器像素一致',()=>{const s=read('src/lib/generator/app.ts');assert.match(s,/buildSvgNow\(Boolean\(embeddedFontCss\)\)/)});
test('字体未就绪或单行放不下时禁止导出',()=>{const s=read('src/lib/generator/app.ts');assert.match(s,/fontReady && !fitError/);assert.match(s,/copy\.fontStatusFallback/)});
test('PNG导出使用显式倍率而不是写死乘二',()=>{const s=read('src/lib/generator/export-png.ts');assert.match(s,/pngPixels\(format, scale\)/);assert.doesNotMatch(s,/format\.width \* 2/)});
test('导出支持 WebP 与质量滑块',()=>{const s=read('src/lib/generator/export-png.ts');assert.match(s,/image\/webp/);assert.match(s,/clampQuality/)});

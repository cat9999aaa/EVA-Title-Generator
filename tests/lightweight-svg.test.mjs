import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('默认SVG导出不重复嵌入16MB全量字体',()=>{const s=read('src/lib/generator/app.ts');assert.match(s,/buildSvgNow\(false\).*downloadSvg/s);assert.doesNotMatch(s,/buildSvgNow\(Boolean\(embeddedFontCss\)\).*downloadSvg/s)});
test('PNG仍嵌入完整字体以保证跨机器像素一致',()=>{const s=read('src/lib/generator/app.ts');assert.match(s,/exportPng[\s\S]*buildSvgNow\(Boolean\(embeddedFontCss\)\)/)});

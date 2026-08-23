import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('SVG使用大神标题身份而非NERV旧品牌',()=>{const s=read('src/lib/generator/build-svg.ts');assert.match(s,/DASHEN TITLE/);assert.match(s,/研究.*判断.*构建/);assert.doesNotMatch(s,/NERV|nervLeafPath|EVA TITLE GENERATOR/)});
test('SVG使用多行标题并提供可访问标题描述',()=>{const s=read('src/lib/generator/build-svg.ts');assert.match(s,/splitTitle\(/);assert.match(s,/<title(?:\s|>)/);assert.match(s,/<desc(?:\s|>)/);assert.match(s,/<tspan/)});
test('大神默认主题使用正式五角色颜色',()=>{const s=read('src/lib/config/themes.ts');for(const x of ['#080806','#e9e4d8','#b9d82e','#d5472b'])assert.match(s,new RegExp(x))});

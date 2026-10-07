import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('标题单行居中，生产路径不再拆行或截断',()=>{
  const svg=read('src/lib/generator/build-svg.ts');
  assert.match(svg,/fitSingleLine/);
  assert.doesNotMatch(svg,/splitTitle\(/);
  assert.doesNotMatch(svg,/<tspan/);
  assert.match(svg,/class="title"/);
});

test('标志可填，默认不绘制 NERV 或 DASHEN TITLE',()=>{
  const svg=read('src/lib/generator/build-svg.ts');
  assert.match(svg,/content\.mark/);
  assert.doesNotMatch(svg,/DASHEN TITLE/);
  assert.doesNotMatch(svg,/nervLeafPath/);
  assert.doesNotMatch(svg,/ticker\(/);
});

test('主站尺寸与导出倍率进入格式表',()=>{
  const formats=read('src/lib/config/formats.ts');
  assert.match(formats,/id: 'article'[\s\S]*1200[\s\S]*675/);
  assert.match(formats,/id: 'square'[\s\S]*1200[\s\S]*1200/);
  assert.match(formats,/id: 'promo'[\s\S]*1280[\s\S]*320/);
  assert.match(formats,/defaultScale: 1/);
});

test('控件使用中文字段名并包含标志与日期说明',()=>{
  const panel=read('src/components/ControlPanel.astro');
  assert.match(panel,/dict\.generator\.fields\.title/);
  assert.match(panel,/dict\.generator\.fields\.mark/);
  assert.match(panel,/dict\.generator\.fields\.date/);
  assert.match(panel,/dict\.generator\.fields\.exportScale/);
  assert.match(panel,/dict\.generator\.fields\.exportKind/);
  assert.match(panel,/dict\.generator\.fields\.exportQuality/);
  assert.doesNotMatch(panel,/>SERIES</);
  assert.doesNotMatch(panel,/>TITLE</);
});

test('五语路径与计数文案占位存在',()=>{
  const locales=read('src/lib/i18n/locales.ts');
  assert.match(locales,/zh-TW/);
  assert.match(locales,/ja-JP/);
  assert.match(locales,/ko-KR/);
  assert.match(locales,/'\/zh-tw'/);
  assert.match(locales,/'\/ja'/);
  assert.match(locales,/'\/ko'/);
  const robots=read('public/robots.txt');
  assert.match(robots,/https:\/\/eva\.dashen\.wang/);
  assert.doesNotMatch(robots,/pages\.dev/);
});

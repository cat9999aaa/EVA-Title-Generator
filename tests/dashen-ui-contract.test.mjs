import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('EVA生成器使用大神UI唯一Token角色',()=>{
 const s=read('src/styles/tokens.css');
 for(const token of ['--void:#080806','--panel:#10100e','--bone:#e9e4d8','--muted:#8d8b83','--signal:#b9d82e','--alert:#d5472b','--cut:polygon','--font-display','--font-mono']) assert.match(s,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(s,/--theme-base|--theme-panel|--theme-text/);
});

test('所有页面Shell复用大神UI header site footer组件语义',()=>{
 for(const p of ['src/layouts/AppLayout.astro','src/layouts/BaseLayout.astro']){
  const s=read(p);assert.match(s,/class="dv-site/);assert.match(s,/DashenHeader/);assert.match(s,/SiteFooter/);
 }
 assert.match(read('src/components/DashenHeader.astro'),/class="dv-header"/);
 assert.match(read('src/components/SiteFooter.astro'),/class="dv-site-footer"/);
});

test('生成器控件复用大神UI field control command state tabs panel',()=>{
 const control=read('src/components/ControlPanel.astro');
 for(const c of ['dv-command','dv-field','dv-control','dv-action','dv-state'])assert.match(control,new RegExp(c));
 const preview=read('src/components/PreviewStage.astro');
 for(const c of ['dv-status-header','dv-panel','dv-tabs'])assert.match(preview,new RegExp(c));
});

test('信息页不再使用旧卡片系统',()=>{
 const all=['src/components/IntroSections.astro','src/components/FaqSection.astro','src/components/FontCredit.astro','src/components/SiteFooter.astro'].map(read).join('\n');
 for(const old of ['surface-panel','info-card','content-section'])assert.doesNotMatch(all,new RegExp(`class="[^"]*${old}`));
 assert.doesNotMatch(all,/class="site-footer(?:\s|")/);
 assert.match(all,/dv-/);
});

test('正式CSS不保留旧EVA平行UI Token和组件类',()=>{
 const s=['src/styles/tokens.css','src/styles/base.css','src/styles/generator.css','src/styles/eva-effects.css'].map(read).join('\n');
 assert.doesNotMatch(s,/--theme-|var\(--theme|\.surface-panel|\.info-card|\.app-topbar|\.control-panel|\.preview-stage|\.primary-button|\.secondary-button/);
});

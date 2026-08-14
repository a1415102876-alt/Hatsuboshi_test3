import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('style.css', root), 'utf8');
const app = await readFile(new URL('app.js', root), 'utf8');

test('初星圈营业卡提供信息流内的三个状态容器', () => {
  for (const id of [
    'phoneSnsBusinessCard',
    'phoneSnsBusinessComposer',
    'phoneSnsBusinessPublished',
    'phoneSnsBusinessResult',
    'phoneSnsBusinessProgress'
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), id);
});

test('发帖编辑状态支持两种内容模式与预设配图', () => {
  assert.match(html, /name=["']snsPostCompositionMode["'][^>]*value=["']ai_expand["']/);
  assert.match(html, /name=["']snsPostCompositionMode["'][^>]*value=["']manual["']/);
  for (const id of ['phoneSnsPostTopicInput', 'phoneSnsPostBodyInput', 'phoneSnsPresetImageList', 'phoneSnsBusinessPublishBtn']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  }
  assert.match(html, /data-sns-preset-image=["']practice["']/);
  assert.match(html, /data-sns-preset-image=["']meal["']/);
  assert.match(html, /data-sns-preset-image=["']school["']/);
});

test('评论互动与营业结算控件均有稳定 id', () => {
  for (const id of [
    'phoneSnsBusinessComments',
    'phoneSnsBusinessInteraction',
    'phoneSnsBusinessReplyBtn',
    'phoneSnsBusinessLikeBtn',
    'phoneSnsBusinessIgnoreBtn',
    'phoneSnsBusinessResultImage',
    'phoneSnsBusinessImageMatch',
    'phoneSnsBusinessBonusTier',
    'phoneSnsBusinessFanGain',
    'phoneSnsBusinessResultConfirmBtn'
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), id);
});

test('每条评论提供独立回复入口并显示评论作者', () => {
  assert.match(html, /phoneSnsBusinessInteractionPrompt/);
  assert.match(app, /data-sns-comment-reply/);
  assert.match(app, /data-sns-comment-id/);
  assert.match(app, /niaSnsSelectedCommentId/);
});

test('营业卡沿用初星圈信息流视觉并提供窄屏布局', () => {
  assert.match(css, /\.sns-business-card\s*\{/);
  assert.match(css, /\.sns-business-image-list\s*\{[\s\S]*grid-template-columns:\s*repeat\(3/);
  assert.match(css, /\.sns-business-actions button\s*\{[\s\S]*min-height:\s*40px/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
});

test('练习日常预设使用真实图片并贯穿帖子与结算预览', () => {
  assert.match(css, /\.sns-image-practice\s*\{[^}]*gakumas_00310_\.png/);
  assert.match(css, /\.sns-business-post-image\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/);
  assert.match(app, /sns-business-post-image/);
  assert.match(app, /phoneSnsBusinessResultImage[\s\S]*classList\.add/);
});

# 儿童专注训练版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有舒尔特网页游戏升级为适合 4 岁儿童自助完成的每日专注训练，并以本机保存的稳定表现控制关卡解锁。

**Architecture:** 将训练规则、进度迁移、每日任务和家长摘要抽离为可在 Node 中测试的纯逻辑模块；`index.html` 仍是单页应用，负责四个界面的渲染和触控交互。所有训练记录保存在一个版本化的 `localStorage` 对象中，旧版解锁进度只在首次读取时迁移。

**Tech Stack:** 静态 HTML、CSS、原生 ES module JavaScript、Node 内置测试运行器、GitHub Pages（仅在用户明确要求后发布）。

## Global Constraints

- 保留 3×3 到 10×10 的严格顺序、可回练、不可跳级和 iPad 触控支持。
- 儿童端不展示最快用时、排行榜、失败评分或目标数字所在位置的视觉提示。
- 6×6 到 10×10 只作为“超能挑战”，不能取代 3×3 到 5×5 的每日主训练。
- 不接入账号、网络、广告、推送或第三方分析；进度只保存到当前设备。
- 现有救援主题素材只作低干扰背景；数字格保持统一样式，当前目标不得有描边、变色或动画提示。
- 不删除或覆盖工作区中与本功能无关的未提交文件。

---

### Task 1: 建立可测试的训练规则与本机数据模型

**Files:**
- Create: `game-model.js`
- Create: `tests/game-model.test.mjs`

- [ ] **Step 1: 先写失败的纯逻辑测试**

覆盖以下规则：

```js
// tests/game-model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accuracyFor, qualifiesForUnlock, completeTraining,
  migrateProfile, selectDailyMission, availableModes, summarizeProgress,
} from '../game-model.js';

test('最近三次同关卡中两次准确率至少 90% 且错误不超过 2 次才解锁', () => {
  // 两次合格应解锁；一次合格或错误过多不应解锁。
});

test('只允许当前最高已解锁关卡推进一级，旧关回练不能越级', () => {
  // completeTraining 返回的新 profile 不得跳过中间关卡。
});

test('旧版解锁键会迁移到版本化档案，且不会降低已有进度', () => {
  // migrateProfile({ 'little-focus-unlocked': '6' })。
});

test('每日任务优先选择 3 到 5 的当前训练关，并且反向模式只在稳定通过 4×4 后可用', () => {
  // 未稳定时为顺序找；稳定后允许反向/停一停。
});

test('家长摘要仅聚合最近七天和最近三次记录', () => {
  // 验证次数、建议关卡、平均错误数与平均用时。
});
```

- [ ] **Step 2: 运行测试并确认其因模块缺失失败**

Run: `node --test tests/game-model.test.mjs`

Expected: FAIL，提示无法导入 `../game-model.js` 或缺少尚未实现的导出。

- [ ] **Step 3: 实现版本化档案与规则函数**

在 `game-model.js` 导出以下稳定接口：

```js
export const TRAINING_STORAGE_KEY = 'little-focus-training-v2';
export const MIN_LEVEL = 3;
export const MAX_LEVEL = 10;
export const DAILY_MAX_LEVEL = 5;

export function accuracyFor(total, wrongTaps) {}
export function qualifiesForUnlock(records, size) {}
export function migrateProfile(legacyStorage) {}
export function completeTraining(profile, record) {}
export function selectDailyMission(profile, today) {}
export function availableModes(profile, size) {}
export function summarizeProgress(profile, now) {}
```

实现要点：

- 档案格式为 `{ version: 2, unlockedLevel, voiceEnabled, trainingRecords, dailyMissionDate, dailyMissionCompleted }`，最多保留 60 条记录。
- `accuracyFor` 以完成数字数除以“完成数字数 + 错误点击数”计算，返回 0 到 1。
- 仅检查该关卡最近 3 条完成记录；其中至少 2 条须 `accuracy >= .9 && wrongTaps <= 2`。
- `completeTraining` 仅在完成“当前最高已解锁关”且满足规则时提升 1 关，最高 10；完成旧关仅留下回练记录。
- 迁移读取 `little-focus-unlocked`，合法值夹在 3 到 10；旧的最佳成绩键不再影响解锁，旧进度不能降低。
- 每日任务优先未稳定的 3 到 5 关；3×3 至少用顺序找，反向找只在 4×4 稳定后开放，“停一停”仅在可练关卡中提供。
- `summarizeProgress` 返回最近 7 天完成数、推荐训练关、最近 3 次平均错误/平均用时和可供页面显示的原始记录。

- [ ] **Step 4: 重新运行纯逻辑测试**

Run: `node --test tests/game-model.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交规则层**

```bash
git add game-model.js tests/game-model.test.mjs
git commit -m "Add child training progression model"
```

### Task 2: 为新训练界面补足静态结构与样式验收

**Files:**
- Modify: `index.html`
- Modify: `tests/static-site.test.mjs`

- [ ] **Step 1: 先扩展静态页面测试并确认失败**

在现有静态测试中加入以下断言：

```js
assert.match(html, /type="module"/);
assert.match(html, /今天的救援任务/);
assert.match(html, /给大人看/);
assert.match(html, /超能挑战/);
assert.match(html, /听一遍/);
assert.match(html, /data-screen="parent-dashboard"/);
assert.doesNotMatch(html, /最快用时|排行榜/);
```

Run: `node --test tests/static-site.test.mjs`

Expected: FAIL，缺少训练版结构或模块入口。

- [ ] **Step 2: 重构单页的四个视图骨架**

保留当前的救援主题色彩和既有素材路径，替换页面应用根节点为以下可渲染区域：

- `child-home`：标题“今天的救援任务”、一个大号开始按钮、可回练已解锁关卡、“超能挑战”、按住两秒的“给大人看”、在浏览器支持时才显示“听一遍/语音开关”。
- `game`：当前模式、目标数字、温和的引导文字、计时仅作为非儿童评分数据；网格容器尺寸随 3×3 至 10×10 变化。
- `mission-complete`：庆祝、今天的真实救援小任务、回到首页按钮；不出现排名或最快时间。
- `parent-dashboard`：近七天完成次数、推荐难度、最近三次准确率/错误/用时，以及“清除这台设备的训练记录”按钮。

将内联脚本改为 `type="module"`，从 `./game-model.js` 导入规则层。CSS 必须：

- 以 `clamp()` 和 CSS 网格保证 10×10 在竖屏 iPad 可整屏触控；数字使用相对圆润、宽度稳定的系统字体组合。
- 普通数字格完全相同，禁止根据当前目标增加 `active`、橙框、不同背景、抖动或缩放提示。
- 游戏进行时通过 `data-focus-mode="quiet"` 降低边缘角色图透明度，且不使用循环动画。
- 触控按钮的最小尺寸不小于 44px，禁用双击缩放干扰并支持安全区留白。

- [ ] **Step 3: 重新运行静态测试**

Run: `node --test tests/static-site.test.mjs`

Expected: PASS。

- [ ] **Step 4: 提交界面骨架与样式**

```bash
git add index.html tests/static-site.test.mjs
git commit -m "Add child training interface"
```

### Task 3: 实现每日任务、三种模式与温和反馈交互

**Files:**
- Modify: `index.html`
- Modify: `tests/static-site.test.mjs`

- [ ] **Step 1: 添加交互行为的静态保护测试并确认失败**

增加对模块函数/关键标识的断言，确保页面具备如下行为入口：

```js
assert.match(html, /function startTraining/);
assert.match(html, /function handleTileTap/);
assert.match(html, /paused/);
assert.match(html, /1200/);
assert.match(html, /先吸一口气，再找/);
assert.match(html, /speechSynthesis/);
assert.doesNotMatch(html, /wrong.*shake|shake.*wrong/i);
```

Run: `node --test tests/static-site.test.mjs`

Expected: FAIL。

- [ ] **Step 2: 实现训练状态机**

在模块脚本中维护一次训练的内存状态：`size`、`mode`、乱序数字、`target`、`correctCount`、`wrongTaps`、`startedAt`、`paused` 和 `isDailyMission`。

实现下列触控规则：

- 顺序找从 1 递增，反向找从 `size * size` 递减；只有规则层已允许的模式才可启动。
- 数字正确时仅更新下一个目标，不给下一格视觉提示；错误时不变更目标或计数进度，显示“先吸一口气，再找 X”。
- “停一停”模式每正确 3 个数暂停 1.2 秒，显示“救援队静一静，等一下再点。”；暂停中的点击既不推进也不计为错误。
- 全部完成时生成 `{ date, size, mode, durationMs, wrongTaps, accuracy }`，用 `completeTraining` 更新档案并立即写回本机。
- 每日任务完成后显示真实世界小任务并标记当天完成；回练完成后回到儿童首页。新解锁的下一关只在首页/任务刷新后出现，绝不允许越级直接开始。

实现长按入口：`pointerdown` 开始 2000ms 定时器，`pointerup`、`pointercancel`、`pointerleave` 取消；定时成功后进入家长页。实现浏览器支持检测后才显示语音操作，语音只朗读当前任务文本，不自动播放。

- [ ] **Step 3: 运行自动测试**

Run: `node --test`

Expected: PASS。

- [ ] **Step 4: 手动验证核心流程**

启动本地静态服务器后，在浏览器分别验证：

1. 新设备默认只能从 3×3 开始，无法点击后续关。
2. 完成 3×3 后显示真实救援任务，页面没有最快用时或排名。
3. 错误点击只给温和文字，没有目标格高亮和惩罚动画。
4. 人为完成足够合格记录后才出现下一关；旧关可以回练。
5. 反向与停一停模式的暂停不计为错误；刷新页面后记录和解锁仍在。
6. 长按两秒才进入家长页，重置需要浏览器确认。

- [ ] **Step 5: 提交交互实现**

```bash
git add index.html tests/static-site.test.mjs
git commit -m "Implement daily child focus training"
```

### Task 4: 进行发布前质量检查（不发布）

**Files:**
- Review: `index.html`
- Review: `game-model.js`
- Review: `tests/*.test.mjs`

- [ ] **Step 1: 运行全部自动测试**

Run: `node --test`

Expected: 全部通过，覆盖规则层和页面静态约束。

- [ ] **Step 2: 检查版本控制范围**

Run: `git status --short && git log --oneline -3`

Expected: 仅本功能源文件、测试和计划文档被提交；不纳入既有 QA 图片或其他无关文件。

- [ ] **Step 3: 进行 iPad 版面视觉检查**

用浏览器以约 768×1024 视口检查儿童首页、5×5 和 10×10 游戏、完成页与家长页：不应横向溢出、文字不可被背景遮挡、每个数字可触控，且游戏页角色背景明显降低干扰。

- [ ] **Step 4: 等待用户明确授权再发布**

不得在本任务中自动推送或更新公开网页。测试通过后，向用户报告本地完成情况并询问是否发布到原公开链接。

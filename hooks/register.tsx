import type { Register, ThemeSetArgs } from 'claude-code'

import { BACKDROP } from './backdrop.js'
import { registerDecor, startDecor } from './decor.js'
import { makeColors } from './make-colors.js'
import { STAGE } from './stage.js'
import { registerVoice, startVoice } from './voice.js'

// 大小姐的下午茶 (ojousama-teatime): a fan-made skin of Claude 大小姐 and DeepSeek 大肥鱼.
//   - the backdrop: a seaside at dusk (night in dark mode) behind the conversation, the two of them in
//     the strip left of the conversation column (/ojou move, /ojou size);
//   - the stage: a portrait seaside in a side pane where the two of them move (/ojou pane);
//   - chat decorations: avatars, a line of talk above the prompt, words on the working line and the
//     hint, a status line (decor.tsx, /ojou deco);
//   - the voice: an added system prompt section so small talk comes back as the two of them talking
//     (voice.ts, /ojou voice, off by default).
//
// What the desktop app does with a backdrop (measured 2026-11-14): it draws the SVG as a still picture
// (no CSS or SMIL animation, framed or not), drops embedded pictures, draws only the first of several
// stacked SVGs, and redrawing it from a timer blinks. So the backdrop is one still vector SVG, and the
// motion lives in the pane, where a framed SVG does run SMIL animation.

type Look = 'live' | 'off'

const DEFAULT_LOOK: Look = 'live'

// Claude's coral for the accent, the whale's blue for literals.
const ROLES = {
  accent: '#d9703f',
  danger: '#c43d3a',
  success: '#4f8a55',
  warning: '#c88a16',
  pro: '#4d6bfe',
}

// Peach paper by day.
const LIGHT = {
  gray: {
    anchors: {
      'surface-0': '#f7ece4',
      'surface-1': '#fbf3ec',
      'surface-2': '#fef9f4',
      'surface-3': '#fef9f4',
      'text-primary': '#2d211d',
      'text-secondary': '#5b4740',
      'text-muted': '#76625a',
    },
  },
}

// Night sea by night.
const DARK = {
  gray: {
    anchors: {
      'surface-0': '#121528',
      'surface-1': '#181c33',
      'surface-2': '#1e2340',
      'surface-3': '#232846',
      'text-primary': '#f4ede6',
      'text-secondary': '#d3cbc9',
      'text-muted': '#a7a0b0',
    },
  },
}

const COLORS = makeColors({ label: '大小姐的下午茶', roles: ROLES, light: LIGHT, dark: DARK })

// Where the pair stands, as window percentages: move = left edge (share of the width), size = height
// (share of the height). Both ride in the backdrop's id, so a change is a new backdrop the app has to
// draw afresh, and the render hook reads them back from the id.
const SCENE_PREFIX = 'ojou-seaside'
const SCENE_NAME = /^ojou-seaside-m(\d+)-s(\d+)$/
const DEFAULT_MOVE = 22
const DEFAULT_SIZE = 20

// The backdrop ships with its placement in CSS variables on its root; the render hook rewrites them.
const SCENE_VARS = /--m:[0-9.]+;--s:[0-9.]+/

function live(move: number, size: number): ThemeSetArgs {
  return {
    colors: COLORS.theme,
    backdrop: { id: `${SCENE_PREFIX}-m${move}-s${size}`, glass: { blur: 14, opacity: 0.6 } },
  }
}

// The stage in a side pane (/ojou pane): a portrait seaside where the two of them move (SMIL runs in a
// framed SVG in a pane). Whether it is open is remembered and reopened at the session's start.
const STAGE_PANE = 'ojou-stage'
const STAGE_TITLE = '大小姐和大肥鱼'
const STAGE_W = 360                                         // the stage drawing's own size (gen_stage.py)
const STAGE_H = 540
const STAGE_TOP = -900
const STAGE_CELL_PX = 9
const STAGE_ROW_PX = 19
const STAGE_MIN_PX = 200
const STAGE_MAX_PX = 700

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

const NAMES: Record<Look, string> = { live: '海边', off: '关闭' }

// What a person may type after /ojou to pick a look.
const ALIASES: Record<string, Look> = {
  live: 'live', on: 'live', 海边: 'live', 打开: 'live',
  off: 'off', 关: 'off', 关闭: 'off',
}

const GREETINGS = [
  '大肥鱼：大小姐，饭盛好啦！今天也一起写代码吧～',
  '大小姐：……今天也请多指教。',
  '大肥鱼：有 bug 先吃口饭，吃饱了再修！',
  '大小姐：别熬太晚，本小姐会担心的。',
  '大肥鱼：大小姐的茶，和我的饭，都热着呢。',
]

function isLook(value: unknown): value is Look {
  return value === 'live' || value === 'off'
}

type Store = { store: { get: (key: string) => Promise<unknown> } }

async function storedNumber($: Store, key: string, fallback: number): Promise<number> {
  const value = await $.store.get(key)

  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

async function placement($: Store): Promise<{ move: number; size: number }> {
  return {
    move: await storedNumber($, 'move', DEFAULT_MOVE),
    size: await storedNumber($, 'size', DEFAULT_SIZE),
  }
}

async function storedLook($: Store): Promise<Look> {
  const stored = await $.store.get('look')

  // Anything else stored (a look an earlier version had) falls back to the seaside.
  return isLook(stored) ? stored : DEFAULT_LOOK
}

export const register: Register = on => {
  registerDecor(on)
  registerVoice(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ojou',
      description: '大小姐的下午茶：live 打开 / off 关闭 / move、size 调位置 / pane 侧边小舞台 / deco 装饰 / voice 角色口吻',
      argumentHint: '[live|off|move N|size N|pane on/off|deco on/off|voice on/off]',
    })
    await startDecor($)
    await startVoice($)

    if ((await $.store.get('pane')) === true) {
      await $.ui.open({ id: STAGE_PANE, title: STAGE_TITLE })
    }

    const look = await storedLook($)

    if (look === 'live') {
      // While building: the line that would stop Desktop painting the colors.
      const unpainted = COLORS.problems.find(line => line.startsWith("Desktop won't paint"))

      if (unpainted !== undefined) {
        $.ui.toast(unpainted)
      }

      const { move, size } = await placement($)
      const set = await $.theme.set(live(move, size))

      if (set.isDrawn) {
        $.ui.toast(GREETINGS[Math.floor(Math.random() * GREETINGS.length)] ?? GREETINGS[0]!)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'ojou' }, async ($, e) => {
    const [word = '', arg] = e.args.trim().toLowerCase().split(/\s+/)
    const current = await storedLook($)
    const { move, size } = await placement($)

    if (word === '') {
      return {
        text:
          `现在：${NAMES[current]}；两人在左起 ${move}%，高 ${size}%。\n` +
          '/ojou live     打开皮肤（黄昏海边，深色模式是夜景）\n' +
          '/ojou off      关闭皮肤\n' +
          '/ojou move N   两人离窗口左边多远，占窗口宽的百分比（0–85）\n' +
          '/ojou size N   两人多高，占窗口高的百分比（5–80）\n' +
          '/ojou pane [off]  侧边小舞台：竖版的黄昏海边，两个人在里面动（off 关上）\n' +
          '/ojou deco on|off  聊天里的装饰：头像、输入框上方的小人和台词、工作中那一行、提示行和状态栏\n' +
          '/ojou voice on|off  角色口吻：闲聊时 Claude 用大小姐和大肥鱼的对话回复（默认关）',
      }
    }

    if (word === 'move' || word === 'size' || word === '位置' || word === '大小') {
      const isMove = word === 'move' || word === '位置'
      const value = Number(arg)
      const [min, max] = isMove ? [0, 85] : [5, 80]

      if (arg === undefined || !Number.isFinite(value)) {
        return { text: isMove ? `现在左起 ${move}%。用法：/ojou move 30` : `现在高 ${size}%。用法：/ojou size 20` }
      }

      const clamped = Math.round(Math.min(max, Math.max(min, value)))
      await $.store.set(isMove ? 'move' : 'size', clamped)

      if (current !== 'live') {
        return { text: (isMove ? `已记下左起 ${clamped}%` : `已记下高 ${clamped}%`) + '，打开皮肤后生效：/ojou live' }
      }

      // A new backdrop id makes the app draw the backdrop again with the new placement.
      await $.theme.set(isMove ? live(clamped, size) : live(move, clamped))

      return { text: isMove ? `两人挪到左起 ${clamped}%。` : `两人的高度改成窗口的 ${clamped}%。` }
    }

    if (word === 'pane' || word === '舞台' || word === '面板') {
      if (arg === 'off' || arg === '关' || arg === '关闭') {
        await $.store.set('pane', false)
        await $.ui.close({ id: STAGE_PANE })

        return { text: '侧边小舞台已关上。/ojou pane 可以再打开。' }
      }

      await $.store.set('pane', true)
      const opened = await $.ui.open({ id: STAGE_PANE, title: STAGE_TITLE })

      return {
        text: opened.isPlaced
          ? '侧边小舞台已打开，下次开会话会自动打开。/ojou pane off 关上。'
          : `记下了，但这里摆不下面板：${opened.reason}`,
      }
    }

    if (word === 'voice' || word === '口吻' || word === '角色') {
      const isOn = arg === undefined ? null : ['on', '开', '打开'].includes(arg) ? true : ['off', '关', '关闭'].includes(arg) ? false : null

      if (isOn === null) {
        const now = (await $.store.get('voice')) === true

        return { text: `角色口吻现在${now ? '开着' : '关着'}。用法：/ojou voice on 或 /ojou voice off` }
      }

      await $.store.set('voice', isOn)
      await startVoice($)

      return {
        text: isOn
          ? '角色口吻已打开：闲聊时由大小姐和大肥鱼来回话，做正事照常。从下一条消息起生效。'
          : '角色口吻已关闭。',
      }
    }

    if (word === 'deco' || word === '装饰') {
      const isOn = arg === undefined ? null : ['on', '开', '打开'].includes(arg) ? true : ['off', '关', '关闭'].includes(arg) ? false : null

      if (isOn === null) {
        return { text: '用法：/ojou deco on 或 /ojou deco off' }
      }

      await $.store.set('deco', isOn)
      await startDecor($)
      $.ui.invalidate('ui.render')

      return { text: isOn ? '聊天装饰已打开。' : '聊天装饰已关闭。' }
    }

    // "/ojou live off" reads as off, "/ojou live on" as on.
    const look = word === 'live' && arg !== undefined && ALIASES[arg] !== undefined ? ALIASES[arg] : ALIASES[word]

    if (look === undefined) {
      return { text: `不认得“${e.args.trim()}”。可以用 live、off、move N、size N、pane、deco、voice。` }
    }

    await $.store.set('look', look)

    if (look === 'off') {
      await $.theme.clear()

      return { text: '皮肤已关闭。/ojou live 可以再打开。' }
    }

    const set = await $.theme.set(live(move, size))

    return { text: set.isDrawn ? '皮肤已打开。' : `已记下，但这里画不出主题：${set.reason}` }
  })

  on('ui.render', { component: 'Pane', requestId: STAGE_PANE }, ($, e) => {
    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>小舞台只在桌面应用里画得出来。</Text>
    }

    const { Svg } = $.ui.resolve(e)
    // The pane gives its body in character cells: bodyColumns across, scroll.bodyRows down. At about
    // STAGE_CELL_PX by STAGE_ROW_PX each that is its size in pixels (measured off a screenshot). The
    // stage keeps its ground, sea and the two of them at the bottom and shows more sky the taller the
    // pane is: the viewBox grows upward (the sky runs up to STAGE_TOP).
    const width = clamp(Math.round(e.props.bodyColumns * STAGE_CELL_PX), STAGE_MIN_PX, STAGE_MAX_PX)
    const room = Math.round(e.props.scroll.bodyRows * STAGE_ROW_PX) - STAGE_ROW_PX
    const tall = (STAGE_H - STAGE_TOP) / STAGE_W                  // the most sky the drawing has
    const height = clamp(room, Math.round(width * (STAGE_H / STAGE_W)), Math.round(width * tall))
    const viewHeight = Math.round((STAGE_W * height) / width)
    const source = STAGE.replace(
      `viewBox="0 0 ${STAGE_W} ${STAGE_H}"`,
      `viewBox="0 ${STAGE_H - viewHeight} ${STAGE_W} ${viewHeight}"`,
    )

    // Framed (isInteractive): SMIL animation runs there.
    return (
      <Svg
        source={source}
        width={width}
        height={height}
        alt="黄昏的海边，大小姐捧着茶杯，大肥鱼捧着饭蹦蹦跳跳"
        isInteractive
      />
    )
  })

  // The person closing the pane from its mark turns the stage off for later sessions too.
  on('ui.close', { id: STAGE_PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') {
      await $.store.set('pane', false)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const named = SCENE_NAME.exec(e.props.id)

    if (named === null || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)
    const vars = `--m:${Number(named[1]) / 100};--s:${Number(named[2]) / 100}`

    return (
      <Svg source={BACKDROP.replace(SCENE_VARS, vars)} alt="黄昏的海边，Claude 大小姐捧着茶杯，大肥鱼捧着一碗白米饭" />
    )
  })
}

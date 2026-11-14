import type { On } from 'claude-code'

import { FEIYU_AVATAR, OJOU_AVATAR } from './mini.js'

// The chat decorations: avatars beside messages, who is busy on the working line, the two heads with
// a line of talk above the prompt, a word after the hint line, and a status line. /ojou deco turns them
// on and off together.

const LINES = [
  '大肥鱼：大小姐，饭盛好啦！',
  '大小姐：……再改完这一处就去吃。',
  '大肥鱼：这个 bug 交给我！',
  '大小姐：测试跑过了，才算做完。',
  '大肥鱼：今天也要吃饱饱再写代码～',
  '大小姐：别忘了提交。',
  '大肥鱼：大小姐，你的茶要凉啦。',
  '大小姐：想清楚再动手，不急。',
]

const WORKING_LINE = '大肥鱼：在跑了在跑了……'

// What the working line says beside the engine's own words, by what the turn is doing.
const SPIN_WORDS: Record<string, string> = {
  thinking: '大小姐思考中',
  responding: '大小姐在回话',
  requesting: '大肥鱼去问问',
  'tool-use': '大肥鱼在干活',
  'tool-input': '大肥鱼在干活',
}

const HINT_WORDS = { working: '大肥鱼跑腿中', draft: '大小姐在听', idle: '大小姐在喝茶' }

const AVATAR = 28
const PERSON_ORIGINS = ['composer', 'sdk', 'bridge']
const HEAD = 20
const BLANK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'

export const decor = { isOn: true, turns: 0, line: 0 }

function statusText(): string {
  return `大小姐 × 大肥鱼 · 这次陪你 ${decor.turns} 轮`
}

/** Called from session.start and from /ojou deco: reads the switch and sets the status line. */
export async function startDecor($: {
  store: { get: (key: string) => Promise<unknown> }
  ui: { status: (text: string | undefined) => void }
}): Promise<void> {
  decor.isOn = (await $.store.get('deco')) !== false
  $.ui.status(decor.isOn ? statusText() : undefined)
}

export function registerDecor(on: On): void {
  on('turn.complete', ($, e, next) => {
    decor.turns += 1
    decor.line = (decor.line + 1) % LINES.length

    if (decor.isOn) {
      $.ui.status(statusText())
    }

    return next(e)
  })

  // 大小姐 beside Claude's replies (first block of each), a spacer keeps later blocks aligned.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!decor.isOn || e.surface === 'terminal') {
      return next(e)
    }

    const { Box, Svg } = $.ui.resolve(e)
    const body = await next(e)

    return (
      <Box flexDirection="row" alignItems="flex-start" gap={1}>
        {e.props.isFirstOfReply ? (
          <Svg source={OJOU_AVATAR} width={AVATAR} height={AVATAR} alt="大小姐" />
        ) : (
          <Svg source={BLANK} width={AVATAR} height={1} alt=" " />
        )}
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {body}
        </Box>
      </Box>
    )
  })

  // 大肥鱼 beside what the person sends. The desktop app hands the person's prompts over as the SDK
  // host (`sdk`), the terminal as `composer`, a phone as `bridge`; rows stored before origins were
  // stamped read `unclassified`. Notifications and other sessions' or agents' messages get none.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const kind: string = e.props.origin.kind
    const isPersons =
      PERSON_ORIGINS.includes(kind) || (kind === 'unclassified' && e.props.from === undefined)

    if (!decor.isOn || e.surface === 'terminal' || !isPersons) {
      return next(e)
    }

    const { Box, Svg } = $.ui.resolve(e)
    const body = await next(e)

    return (
      <Box flexDirection="row" alignItems="flex-start" justifyContent="flex-end" gap={1}>
        <Box flexDirection="column" flexShrink={1}>
          {body}
        </Box>
        <Svg source={FEIYU_AVATAR} width={AVATAR} height={AVATAR} alt="大肥鱼" />
      </Box>
    )
  })

  // The working line: a word says who is busy.
  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    if (!decor.isOn) {
      return next(e)
    }

    const label = SPIN_WORDS[e.props.mode]

    if (label === undefined) {
      return next(e)
    }

    // The desktop's line says what the step is doing (`word`); keep it after our word. The terminal's
    // word is only a gerund (`Sauteing`), so the message replaces it there.
    if (e.surface === 'terminal') {
      return next({ ...e, props: { ...e.props, message: label } })
    }

    return next({ ...e, props: { ...e.props, word: `${label} · ${e.props.word}` } })
  })

  // A word after the hint under the prompt. The desktop draws a rewritten hint in the line's place,
  // so the engine's text stays in front; the terminal keeps its line and draws `tail` after it.
  on('ui.render', { component: 'PromptHint' }, ($, e, next) => {
    if (!decor.isOn) {
      return next(e)
    }

    const word = e.props.isWorking ? HINT_WORDS.working : e.props.isDraft ? HINT_WORDS.draft : HINT_WORDS.idle

    if (e.surface === 'terminal') {
      return next({ ...e, props: { ...e.props, tail: ` · ${word}` } })
    }

    const hint = e.props.hint.trim() === '' ? word : `${e.props.hint} · ${word}`

    return next({ ...e, props: { ...e.props, hint } })
  })

  // The band above the prompt: the two heads and a line of talk that changes every turn.
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (!decor.isOn || e.plugin !== $.plugin.name || e.props.hasSurvey) {
      return next(e)
    }

    const line = e.props.isWorking ? WORKING_LINE : (LINES[decor.line % LINES.length] ?? LINES[0]!)

    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>{line}</Text>
    }

    const { Box, Svg, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg source={FEIYU_AVATAR} width={HEAD} height={HEAD} alt="大肥鱼" />
        <Svg source={OJOU_AVATAR} width={HEAD} height={HEAD} alt="大小姐" />
        <Text dimColor>{line}</Text>
      </Box>
    )
  })
}

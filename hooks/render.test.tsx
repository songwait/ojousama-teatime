import { expect, test } from 'claude-code/testing'

// Each drawing the skin makes on the desktop, mounted through the engine's own surface table, so a
// renamed prop or a tree the surface refuses fails here instead of silently drawing nothing; and a
// theme Claude Code refuses, which has to come back as a reason rather than a skipped hook.

const PLUGIN = 'ojousama-teatime'
const SCROLL = { offset: 0, bodyRows: 30 }
const RUN = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }

test('the backdrop draws the seaside, placed by its scene', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'ojou-seaside-m30-s25', plugin: PLUGIN, glass: { blur: 14, opacity: 0.6 } },
  })
  const drawn = await ui.drawn()

  expect(drawn).toMatchObject({ type: 'Svg' })
  expect(JSON.stringify(drawn)).toContain('--m:0.3;--s:0.25')
})

test("another plugin's backdrop is left to it", async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'lagoon', plugin: 'someone-else', glass: false },
  })

  expect(await ui.drawn()).toMatchObject({ type: 'engine' })
})

test('the band above the prompt draws the two heads and a line', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false,
      isCollapsed: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 80,
      scroll: SCROLL,
      view: {},
    },
  })
  const drawn = JSON.stringify(await ui.drawn())

  expect(drawn).toContain('"type":"Box"')
  expect(drawn).toContain('大肥鱼')
  expect(drawn).toContain('大小姐')
})

test('the band yields to a survey', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'AbovePrompt',
    props: {
      hasSurvey: true,
      isCollapsed: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 80,
      scroll: SCROLL,
      view: {},
    },
  })

  expect(await ui.drawn()).toMatchObject({ type: 'engine' })
})

test('the stage pane draws the animated seaside', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'Pane',
    requestId: 'ojou-stage',
    props: {
      title: '大小姐和大肥鱼',
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: SCROLL,
      view: {},
    },
  })

  expect(await ui.drawn()).toMatchObject({ type: 'Svg', props: { isInteractive: true } })
})

test('a theme Claude Code refuses comes back as a reason, not a skipped hook', async ($, on) => {
  // A placement stored by hand that makes no valid scene name: theme.set refuses it at the host check.
  const store = new Map<string, unknown>([['move', 1e100]])

  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })

  const answer = await $.command.run({ ...RUN, command: 'ojou', args: 'live' })

  expect(answer.text).toContain('皮肤没能打开')
})

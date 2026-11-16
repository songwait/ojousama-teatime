import { expect, test } from 'claude-code/testing'

// Each drawing the skin makes on the desktop, mounted through the engine's own surface table, so a
// renamed prop or a tree the surface refuses fails here instead of silently drawing nothing.

const PLUGIN = 'ojousama-teatime'
const SCROLL = { offset: 0, bodyRows: 30 }

test('the backdrop draws the seaside, placed by its id', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'desktop',
    component: 'Backdrop',
    props: { id: 'ojou-seaside-m30-s25', plugin: PLUGIN, glass: { blur: 14, opacity: 0.6 } },
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
    props: { id: 'lagoon', plugin: 'someone-else', glass: false },
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

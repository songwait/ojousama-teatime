import { expect, test } from 'claude-code/testing'

// The engine's own sections, standing for the real prompt beneath the mod.
const ENGINE = [
  { id: 'intro', text: 'intro', scope: 'shared' as const },
  { id: 'env', text: 'env', scope: 'session' as const },
]

const RUN = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }

const COMPOSE = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

test('the voice is off until the person turns it on, and off again', async ($, on) => {
  const store = new Map<string, unknown>()

  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'ojou' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: ENGINE }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // Off by default: the prompt is the engine's, untouched.
  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['intro', 'env'])

  const turnedOn = await $.command.run({ ...RUN, command: 'ojou', args: 'voice on' })
  expect(JSON.stringify(turnedOn)).toContain('角色口吻已打开')
  expect(store.get('voice')).toBe(true)

  // On: one section added last, after the cache boundary, naming both characters.
  const composed = (await $.prompt.compose(COMPOSE)).sections
  expect(composed.map(s => s.id)).toEqual(['intro', 'env', 'ojousama-teatime:voice'])
  expect(composed[2]?.scope).toBe('session')
  expect(composed[2]?.text).toContain('大小姐')
  expect(composed[2]?.text).toContain('大肥鱼')
  expect(composed[2]?.text).toContain('Ciallo')

  await $.command.run({ ...RUN, command: 'ojou', args: 'voice off' })
  expect((await $.prompt.compose(COMPOSE)).sections.map(s => s.id)).toEqual(['intro', 'env'])
})

test('a switch left on in an earlier session is read at session start', async ($, on) => {
  on('store.get', (_, e) => ({ value: e.key === 'voice' ? true : undefined }))
  on('command.register', () => ({ value: { command: 'ojou' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: ENGINE }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect((await $.prompt.compose(COMPOSE)).sections.at(-1)?.id).toBe('ojousama-teatime:voice')
})

test('/ojou live off turns the skin off', async ($, on) => {
  const store = new Map<string, unknown>([['look', 'live']])
  let cleared = false

  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('theme.clear', () => {
    cleared = true

    return { value: { isDrawn: false as const, reason: 'cleared' } }
  })

  await $.command.run({ ...RUN, command: 'ojou', args: 'live off' })

  expect(store.get('look')).toBe('off')
  expect(cleared).toBe(true)
})

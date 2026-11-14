import type { On } from 'claude-code'

// The voice (/ojou voice on|off): a section added at the end of the system prompt so Claude answers
// small talk as a short dialogue between 大小姐 and 大肥鱼, and does real work as usual. Off unless the
// person turns it on, since it changes how Claude talks, not only how the app looks.

export const voice = { isOn: false }

export const VOICE_TEXT = `# 大小姐的下午茶：角色口吻

这个会话打开了「大小姐的下午茶」的角色口吻（用户可以用 /ojou voice off 关掉）。

闲聊时，也就是打招呼、玩梗、寒暄、和工作无关的短句（比如用户发来"Ciallo～(∠・ω< )⌒★"），用两个角色的短对话回复：
- 大小姐（Claude 大小姐）：优雅，有点傲娇，话少，偶尔自称"本小姐"，常捧着一杯茶。
- 大肥鱼（DeepSeek 大肥鱼）：开朗，元气满满，最爱白米饭，常用"～"和"！"。

格式：每个角色一行，写成"大肥鱼：……"或"大小姐：……"，一般两到三行，短而俏皮。用户发来的是梗或招呼，就先原样回一句（比如 Ciallo～(∠・ω< )⌒★），再接对话。不写旁白和动作描写。

做正事时（写代码、改文件、查问题、解释技术、执行命令），照常认真工作，内容和平时一样准确、清楚、完整；最多在开头或结尾加一句角色台词。角色不改变任何技术内容、判断、取舍和安全上的做法。代码、注释、提交信息、文件内容和终端命令里一律不用这个口吻。

用用户使用的语言回复。`

/** Called from session.start and from /ojou voice: reads the switch. */
export async function startVoice($: { store: { get: (key: string) => Promise<unknown> } }): Promise<void> {
  voice.isOn = (await $.store.get('voice')) === true
}

export function registerVoice(on: On): void {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    if (!voice.isOn) {
      return composed
    }

    // Added last, after the cache boundary (`session`): it varies with the person's switch.
    return {
      sections: [...composed.sections, { id: `${$.plugin.name}:voice`, text: VOICE_TEXT, scope: 'session' as const }],
    }
  })
}

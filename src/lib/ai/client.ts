import { env } from '#/env'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type CompletionOptions = {
  messages: ChatMessage[]
  maxOutputTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export class OpenAIError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'OpenAIError'
  }
}

export async function complete(options: CompletionOptions): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY saknas i serverns miljövariabler.')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: options.messages,
      max_completion_tokens: options.maxOutputTokens ?? 2000,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new OpenAIError(`OpenAI svarade ${res.status}: ${body.slice(0, 300)}`, res.status)
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[]
    usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } }
  }
  const content = json.choices?.[0]?.message?.content?.trim()
  if (!content) {
    const finish = json.choices?.[0]?.finish_reason ?? 'okänd'
    const completion = json.usage?.completion_tokens ?? 0
    const reasoning = json.usage?.completion_tokens_details?.reasoning_tokens ?? 0
    throw new OpenAIError(
      `Tomt svar från OpenAI (finish_reason=${finish}, completion_tokens=${completion}, reasoning_tokens=${reasoning}).`,
    )
  }
  return content
}

export function currentModel(): string {
  return env.OPENAI_MODEL
}

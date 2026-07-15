import axios from 'axios'

import { moduleLogger } from 'src/lib/logger'

const logger = moduleLogger('chat')

type Message = {
  role: string
  content: string
  tool_calls?: OllamaToolCall[]
  tool_call_id?: string
}

export interface OllamaToolCall {
  id: string
  function: { name: string; arguments: Record<string, unknown> }
}

export interface OllamaMessage {
  content: string
  tool_calls?: OllamaToolCall[]
}

async function callOllama(
  messages: Message[],
  tools?: object[]
): Promise<OllamaMessage> {
  try {
    const body: Record<string, unknown> = {
      // qwen2.5:7b is the validated default — best balance of speed/accuracy
      // for an 8GB-class GPU (reference hardware: RTX 2070). Llama 3.2
      // didn't follow tool-calling/prompt instructions closely enough;
      // Gemma and Qwen 3 don't fit in 8GB VRAM at a usable quantization.
      // See SETUP.md's "Choosing an LLM" section before changing this.
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
      messages,
      stream: false,
    }
    if (tools?.length) body.tools = tools

    const response = await axios.post<{ message: OllamaMessage }>(
      process.env.OLLAMA_URL ?? 'http://ollama:11434/api/chat',
      body
    )
    const msg = response.data.message
    if (msg.content) msg.content = msg.content.trim()
    return msg
  } catch (err) {
    logger.error(
      {
        err,
        code: axios.isAxiosError(err) ? err.code : undefined,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        ollamaError: axios.isAxiosError(err) ? err.response?.data : undefined,
      },
      'Ollama request failed'
    )
    throw err
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const base = (
    process.env.OLLAMA_URL ?? 'http://ollama:11434/api/chat'
  ).replace('/api/chat', '')
  const response = await axios.post<{ embeddings: number[][] }>(
    `${base}/api/embed`,
    { model: 'nomic-embed-text', input: text }
  )
  return response.data.embeddings[0]
}

export async function ollamaChat(messages: Message[]): Promise<string> {
  const msg = await callOllama(messages)
  return msg.content
}

export async function ollamaChatWithTools(
  messages: Message[],
  tools: object[]
): Promise<OllamaMessage> {
  return callOllama(messages, tools)
}

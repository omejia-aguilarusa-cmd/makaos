// On-device AI engine for the Maka OS copilot.
//
// Runs a small quantized LLM fully in the browser via WebLLM (MLC) on WebGPU —
// no server, no API key. The model is fetched once (from the MLC CDN) and cached
// by the browser, so it works offline afterwards. @mlc-ai/web-llm is imported
// lazily (dynamic import) so it is code-split out of the main bundle and only
// downloaded when the user actually turns the engine on.

// A ~1B instruction model: small download, quick to load, good enough for a
// copilot that is grounded with the workspace data in its system prompt.
export const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
export const MODEL_LABEL = 'Llama 3.2 1B'
export const MODEL_APPROX_SIZE = '~0.9 GB'

let engine = null
let enginePromise = null

export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && !!navigator.gpu
}

// Load (or return the already-loaded) engine. `onProgress` receives WebLLM's
// init-progress reports: { progress: 0..1, text: string }.
export async function loadEngine(onProgress) {
  if (engine) return engine
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import('@mlc-ai/web-llm')
      const eng = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          try { onProgress && onProgress(report) } catch (e) {}
        },
      })
      engine = eng
      return eng
    })().catch((err) => {
      // Reset so a later attempt can retry from scratch.
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

export function isEngineReady() {
  return !!engine
}

// Stream a chat completion. `messages` is an OpenAI-style array
// ([{role:'system'|'user'|'assistant', content}]). `onToken` is called with the
// cumulative text so far. Resolves with the final full text.
export async function streamChat(messages, onToken, opts = {}) {
  const eng = await loadEngine()
  const stream = await eng.chat.completions.create({
    messages,
    stream: true,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 512,
  })
  let full = ''
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || ''
    if (delta) {
      full += delta
      try { onToken && onToken(full) } catch (e) {}
    }
  }
  return full
}

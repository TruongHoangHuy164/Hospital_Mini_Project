const fetch = global.fetch || require('node-fetch');

// Cấu hình OpenRouter
const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const APP_TITLE = process.env.OPENROUTER_TITLE || 'Hospital Mini Project';

// Đảm bảo có API key cấu hình
function ensureApiKey(){
  if(!API_KEY){
    const err = new Error('OPENROUTER_API_KEY is not set');
    err.statusCode = 500;
    throw err;
  }
}

// Gọi API chat completions
async function chatComplete({ messages, model, temperature = 0.2, max_tokens } = {}){
  ensureApiKey();
  const url = `${BASE_URL}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://example.com',
      'X-Title': APP_TITLE,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      temperature,
      ...(max_tokens ? { max_tokens } : {}),
    })
  });
  if(!res.ok){
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return { raw: data, content };
}

module.exports = { chatComplete };

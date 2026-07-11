import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const HF_TOKEN = Deno.env.get('HF_TOKEN')
    if (!HF_TOKEN) {
      return new Response(JSON.stringify({ error: 'HF_TOKEN no configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const body = await req.json()
    const { messages, model, max_tokens, temperature } = body

    const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        model: model || 'Qwen/Qwen2.5-7B-Instruct',
        messages,
        max_tokens: max_tokens || 2000,
        temperature: temperature || 0.7,
      }),
    })

    const data = await hfRes.json()

    return new Response(JSON.stringify(data), {
      status: hfRes.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})

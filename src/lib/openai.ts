// Cloudflare Workers 환경에서 OpenAI 호환 API(fetch 기반) 호출 헬퍼
export async function callOpenAIChat(
  apiKey: string,
  baseUrl: string,
  params: {
    messages: { role: string; content: any }[]
    jsonMode?: boolean
    model?: string
  }
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || 'gpt-5-mini',
      messages: params.messages,
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${text}`)
  }

  const data: any = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// 이미지 포함 비전 분석용 호출
export async function callOpenAIVision(
  apiKey: string,
  baseUrl: string,
  imageUrl: string,
  prompt: string,
  model = 'gpt-5-mini'
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI Vision API error (${res.status}): ${text}`)
  }

  const data: any = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

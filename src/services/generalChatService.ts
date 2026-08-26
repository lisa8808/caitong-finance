function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadGeneralChatAnswer(prompt: string, skill: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/general-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, skill }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '通用模型调用失败');
  if (typeof payload.data?.content !== 'string' || !payload.data.content.trim()) {
    throw new Error('通用模型未返回有效内容');
  }
  return payload.data.content.trim();
}

export interface ValueInvestingCommitteeReport {
  company: string;
  symbol: string;
  market: string;
  report: string;
  result?: Record<string, any>;
  outputDir?: string;
  execution?: {
    searchEnabled: boolean;
    searchFallback: boolean;
  };
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadValueInvestingCommitteeReport(prompt: string): Promise<ValueInvestingCommitteeReport> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const response = await fetch(`${apiBaseUrl}/api/value-investing-committee`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorPayload?.error || `价值分析请求失败（HTTP ${response.status}）`);
  }

  const payload = await response.json() as { data?: ValueInvestingCommitteeReport };
  if (!payload.data?.report) {
    throw new Error('value investing committee returned an empty report');
  }

  return payload.data;
}

/**
 * Parses RFC 7807 Problem Details JSON bodies returned by the Ezkey Integration API.
 */
export interface ParsedProblemDetails {
  title: string;
  detail: string;
  status?: number;
  type?: string;
}

export function parseProblemDetailsJson(body: string): ParsedProblemDetails | null {
  const trimmed = body?.trim();
  if (!trimmed || trimmed[0] !== '{') {
    return null;
  }
  try {
    const o = JSON.parse(trimmed) as Record<string, unknown>;
    const detailRaw = o.detail;
    const titleRaw = o.title;
    const detail = typeof detailRaw === 'string' ? detailRaw.trim() : '';
    const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
    if (!detail && !title) {
      return null;
    }
    const status = typeof o.status === 'number' ? o.status : undefined;
    const type = typeof o.type === 'string' ? o.type : undefined;
    return {
      title: title || 'Error',
      detail: detail || title,
      status,
      type,
    };
  } catch {
    return null;
  }
}

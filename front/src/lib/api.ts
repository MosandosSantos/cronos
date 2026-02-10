const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export const getApiUrl = () => API_URL;

const getApiCandidates = () => {
  const urls = [API_URL];
  if (API_URL.includes('localhost')) {
    urls.push(API_URL.replace('localhost', '127.0.0.1'));
  } else if (API_URL.includes('127.0.0.1')) {
    urls.push(API_URL.replace('127.0.0.1', 'localhost'));
  }

  // If the frontend is opened via LAN/IP (or another host), also try that host on API port.
  // This avoids browser-side "Failed to fetch" when localhost points to a different machine.
  if (typeof window !== 'undefined') {
    try {
      const currentHost = window.location.hostname;
      if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        const base = new URL(API_URL);
        const lanCandidate = new URL(API_URL);
        lanCandidate.hostname = currentHost;
        lanCandidate.port = base.port || '3001';
        urls.push(lanCandidate.origin);
      }
    } catch {
      // Ignore invalid API_URL formats and keep default candidates.
    }
  }

  return [...new Set(urls)];
};

export const apiFetch = async <T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> => {
  const headers = new Headers(options.headers);
  const hasBody = options.body != null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vencimentos_token') : null;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const apiCandidates = getApiCandidates();
  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  for (const baseUrl of apiCandidates) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
      break;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (!response) {
    const details = lastNetworkError instanceof Error ? lastNetworkError.message : 'Falha de rede desconhecida.';
    throw new Error(
      `Nao foi possivel conectar com a API. Verifique se o backend esta rodando em ${apiCandidates.join(' ou ')}. Detalhe: ${details}`
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Erro ao comunicar com a API (${response.status}).`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
};

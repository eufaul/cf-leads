/**
 * safeFetch: Utilitário seguro para requisições HTTP externas.
 * Bloqueia SSRF (endereços privados, loopback, link-local, redes Docker),
 * impõe timeout rígido e limite de tamanho de resposta.
 */

const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // RFC1918 Classe A (e redes Docker comuns)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC1918 Classe B
  /^192\.168\./, // RFC1918 Classe C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 Unique Local
  /^fe80:/, // IPv6 Link-local
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "::1",
  "internal",
  "docker",
  "metadata.google.internal",
  "169.254.169.254", // AWS/Cloud metadata
];

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxSizeBytes?: number;
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, maxSizeBytes = 5 * 1024 * 1024, ...fetchOptions } = options;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`URL inválida: ${url}`);
  }

  // Permitir somente HTTP e HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Protocolo não permitido: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Bloquear hostnames proibidos
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Acesso ao host ${hostname} foi bloqueado por segurança (SSRF).`);
  }

  // Bloquear padrões de IP privado
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`Acesso ao IP ${hostname} foi bloqueado por segurança (IP privado).`);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsed.toString(), {
      ...fetchOptions,
      signal: controller.signal,
      redirect: "follow",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new Error(`Resposta excede o limite máximo permitido de ${maxSizeBytes} bytes.`);
    }

    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(`Tempo limite de requisição excedido (${timeoutMs}ms).`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

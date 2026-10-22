import { describe, it, expect } from "vitest";
import { safeFetch } from "@/lib/safe-fetch";

describe("Segurança: safeFetch (Proteção contra SSRF)", () => {
  it("deve bloquear tentativas de acesso a localhost", async () => {
    await expect(safeFetch("http://localhost:3000")).rejects.toThrow(/bloqueado por segurança/);
  });

  it("deve bloquear tentativas de acesso a 127.0.0.1", async () => {
    await expect(safeFetch("http://127.0.0.1:8080")).rejects.toThrow(/bloqueado por segurança/);
  });

  it("deve bloquear rede local privada (ex: 192.168.1.1)", async () => {
    await expect(safeFetch("http://192.168.1.1/api")).rejects.toThrow(/bloqueado por segurança/);
  });

  it("deve bloquear serviço de metadados de nuvem (169.254.169.254)", async () => {
    await expect(safeFetch("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/bloqueado por segurança/);
  });

  it("deve rejeitar protocolos não suportados como file:// ou ftp://", async () => {
    await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(/Protocolo não permitido/);
    await expect(safeFetch("ftp://ftp.example.com")).rejects.toThrow(/Protocolo não permitido/);
  });
});

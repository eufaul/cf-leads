import { describe, it, expect } from "vitest";
import { calculateDedupHash, extractDomain } from "@/lib/dedup";

describe("Segurança M5: Deduplicação e Hashing de Busca", () => {
  it("deve extrair domínios limpos corretamente para comparação", () => {
    expect(extractDomain("https://www.marmorariamodelo.com.br/contato")).toBe("marmorariamodelo.com.br");
    expect(extractDomain("http://odontoclinic.com")).toBe("odontoclinic.com");
    expect(extractDomain("clinica.med.br")).toBe("clinica.med.br");
  });

  it("deve gerar hashes HMAC-SHA256 consistentes com pepper secreto", () => {
    const pepper = "test-secret-pepper-123";
    const hash1 = calculateDedupHash("+5519999999999", pepper);
    const hash2 = calculateDedupHash("+5519999999999", pepper);
    const hashDifferent = calculateDedupHash("+5519888888888", pepper);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
    expect(hash1.length).toBe(64); // SHA256 hex
  });
});

import { describe, expect, it, beforeEach } from "bun:test";
import {
  QrTokenManager,
  InMemoryQrStorageAdapter,
} from "./qr-token-manager";

describe("QrTokenManager — Deep Token Domain Module", () => {
  let inMemoryStorage: InMemoryQrStorageAdapter;
  let tokenManager: QrTokenManager;

  const sessionId = "session-test-456";
  const secret = "institutional-super-secret-key-charusat";

  beforeEach(() => {
    inMemoryStorage = new InMemoryQrStorageAdapter();
    tokenManager = new QrTokenManager(inMemoryStorage);
  });

  describe("formatPayloadString", () => {
    it("formats the canonical signing string", () => {
      const payload = QrTokenManager.formatPayloadString("s1", "n1", 1700000000);
      expect(payload).toBe("s1:n1:1700000000");
    });
  });

  describe("Cryptographic Signature Calculation & Verification", () => {
    it("computes and verifies HMAC-SHA256 signature with string secret", () => {
      const nonce = "test-nonce-123";
      const expiresAt = Date.now() + 45000;
      const signature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);

      expect(typeof signature).toBe("string");
      expect(signature.length).toBe(64); // SHA-256 hex is 64 characters

      const isValid = QrTokenManager.verifySignature(sessionId, nonce, expiresAt, signature, secret);
      expect(isValid).toBe(true);
    });

    it("computes and verifies signature with Uint8Array secret (Prisma Bytes)", () => {
      const byteSecret = new TextEncoder().encode("byte-secret-from-db-12345");
      const nonce = "test-nonce-bytes";
      const expiresAt = Date.now() + 45000;
      const signature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, byteSecret);

      const isValid = QrTokenManager.verifySignature(sessionId, nonce, expiresAt, signature, byteSecret);
      expect(isValid).toBe(true);
    });

    it("rejects when signature is tampered", () => {
      const nonce = "test-nonce-123";
      const expiresAt = Date.now() + 45000;
      const validSignature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);
      const tampered = validSignature.slice(0, -2) + (validSignature.endsWith("0") ? "1" : "0");

      const isValid = QrTokenManager.verifySignature(sessionId, nonce, expiresAt, tampered, secret);
      expect(isValid).toBe(false);
    });

    it("rejects when nonce or expiresAt is altered", () => {
      const nonce = "test-nonce-123";
      const expiresAt = Date.now() + 45000;
      const signature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);

      expect(QrTokenManager.verifySignature(sessionId, "different-nonce", expiresAt, signature, secret)).toBe(false);
      expect(QrTokenManager.verifySignature(sessionId, nonce, expiresAt + 1000, signature, secret)).toBe(false);
    });

    it("rejects when verified against wrong secret", () => {
      const nonce = "test-nonce-123";
      const expiresAt = Date.now() + 45000;
      const signature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);

      expect(QrTokenManager.verifySignature(sessionId, nonce, expiresAt, signature, "wrong-secret-key")).toBe(false);
    });
  });

  describe("issueBatch", () => {
    it("issues a default batch of 5 sequential rotating tokens", async () => {
      const beforeTime = Date.now();
      const tokens = await tokenManager.issueBatch(sessionId, secret);
      const afterTime = Date.now();

      expect(tokens).toHaveLength(5);

      // Verify unique nonces
      const nonces = new Set(tokens.map((t) => t.nonce));
      expect(nonces.size).toBe(5);

      // Verify sequential activeAfter intervals
      tokens.forEach((token, i) => {
        expect(token.activeAfter).toBeGreaterThanOrEqual(beforeTime + i * 10000);
        expect(token.activeAfter).toBeLessThanOrEqual(afterTime + i * 10000);

        expect(token.expiresAt).toBeGreaterThan(token.activeAfter);
        expect(token.expiresAt - token.activeAfter).toBe(45000);

        // Verify that signature is cryptographically valid for each token
        const isValid = QrTokenManager.verifySignature(
          sessionId,
          token.nonce,
          token.expiresAt,
          token.signature,
          secret,
        );
        expect(isValid).toBe(true);
      });
    });

    it("respects custom batch count, interval, and validity", async () => {
      const tokens = await tokenManager.issueBatch(sessionId, secret, {
        count: 3,
        intervalMs: 5000,
        validityMs: 30000,
      });

      expect(tokens).toHaveLength(3);
      expect(tokens[1]!.activeAfter - tokens[0]!.activeAfter).toBe(5000);
      expect(tokens[0]!.expiresAt - tokens[0]!.activeAfter).toBe(30000);
    });
  });

  describe("lookupNonce across storage seam", () => {
    it("successfully looks up newly issued nonces", async () => {
      const tokens = await tokenManager.issueBatch(sessionId, secret);
      const firstToken = tokens[0]!;

      const lookup = await tokenManager.lookupNonce(sessionId, firstToken.nonce);
      expect(lookup.found).toBe(true);
      expect(lookup.source).toBe("memory");
      expect(lookup.isExpired).toBe(false);
    });

    it("returns found: false for unknown nonces", async () => {
      const lookup = await tokenManager.lookupNonce(sessionId, "nonexistent-nonce-999");
      expect(lookup.found).toBe(false);
    });

    it("detects expired tokens for live scans", async () => {
      const expiredNonce = "expired-nonce-001";
      const pastDate = new Date(Date.now() - 5000); // expired 5 seconds ago
      await inMemoryStorage.storeToken(sessionId, expiredNonce, pastDate);

      const liveLookup = await tokenManager.lookupNonce(sessionId, expiredNonce, false);
      expect(liveLookup.found).toBe(true);
      expect(liveLookup.isExpired).toBe(true);
    });
  });
});

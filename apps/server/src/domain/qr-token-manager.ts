import crypto from "node:crypto";

export interface QrTokenBatchItem {
  nonce: string;
  expiresAt: number;
  signature: string;
  activeAfter: number;
}

export interface IssueBatchOptions {
  count?: number;
  intervalMs?: number;
  validityMs?: number;
}

export interface QrTokenLookupResult {
  found: boolean;
  source?: "redis" | "db" | "memory";
  isExpired?: boolean;
  expiresAt?: Date;
}

export interface QrStorageAdapter {
  storeToken(sessionId: string, nonce: string, expiresAt: Date, ttlSeconds: number): Promise<void>;
  persistBatch(
    sessionId: string,
    tokens: Array<{ nonce: string; expiresAt: Date; issuedAt: Date }>,
  ): Promise<void>;
  lookupToken(sessionId: string, nonce: string): Promise<QrTokenLookupResult>;
}

export class InMemoryQrStorageAdapter implements QrStorageAdapter {
  private tokens = new Map<string, { expiresAt: Date; issuedAt: Date }>();

  async storeToken(sessionId: string, nonce: string, expiresAt: Date): Promise<void> {
    this.tokens.set(`${sessionId}:${nonce}`, { expiresAt, issuedAt: new Date() });
  }

  async persistBatch(
    sessionId: string,
    batch: Array<{ nonce: string; expiresAt: Date; issuedAt: Date }>,
  ): Promise<void> {
    for (const item of batch) {
      this.tokens.set(`${sessionId}:${item.nonce}`, {
        expiresAt: item.expiresAt,
        issuedAt: item.issuedAt,
      });
    }
  }

  async lookupToken(sessionId: string, nonce: string): Promise<QrTokenLookupResult> {
    const item = this.tokens.get(`${sessionId}:${nonce}`);
    if (!item) {
      return { found: false };
    }
    const isExpired = Date.now() > item.expiresAt.getTime();
    return {
      found: true,
      source: "memory",
      isExpired,
      expiresAt: item.expiresAt,
    };
  }

  clear() {
    this.tokens.clear();
  }
}

export class RedisPrismaQrStorageAdapter implements QrStorageAdapter {
  async storeToken(sessionId: string, nonce: string, _expiresAt: Date, ttlSeconds: number): Promise<void> {
    try {
      const { attendanceRedis } = await import("../lib/redis");
      await attendanceRedis.setex(`qr:${sessionId}:${nonce}`, ttlSeconds, "1");
    } catch {}
  }

  async persistBatch(
    sessionId: string,
    batch: Array<{ nonce: string; expiresAt: Date; issuedAt: Date }>,
  ): Promise<void> {
    try {
      const { default: prisma } = await import("@secured_attendance/db");
      await prisma.qrToken.createMany({
        data: batch.map((item) => ({
          sessionId,
          nonce: item.nonce,
          issuedAt: item.issuedAt,
          expiresAt: item.expiresAt,
        })),
        skipDuplicates: true,
      });
    } catch {
      try {
        const { default: prisma } = await import("@secured_attendance/db");
        for (const item of batch) {
          try {
            await prisma.qrToken.create({
              data: {
                sessionId,
                nonce: item.nonce,
                issuedAt: item.issuedAt,
                expiresAt: item.expiresAt,
              },
            });
          } catch {}
        }
      } catch {}
    }
  }

  async lookupToken(sessionId: string, nonce: string): Promise<QrTokenLookupResult> {
    try {
      const { attendanceRedis } = await import("../lib/redis");
      const inRedis = await attendanceRedis.get(`qr:${sessionId}:${nonce}`);
      if (inRedis) {
        return {
          found: true,
          source: "redis",
          isExpired: false,
        };
      }
    } catch {}

    try {
      const { default: prisma } = await import("@secured_attendance/db");
      const dbToken = await prisma.qrToken.findUnique({
        where: {
          sessionId_nonce: {
            sessionId,
            nonce,
          },
        },
      });

      if (dbToken) {
        const isExpired = new Date() > dbToken.expiresAt;
        return {
          found: true,
          source: "db",
          isExpired,
          expiresAt: dbToken.expiresAt,
        };
      }
    } catch {}

    return { found: false };
  }
}

export class QrTokenManager {
  constructor(private storage: QrStorageAdapter) {}

  static formatPayloadString(sessionId: string, nonce: string, expiresAt: number): string {
    return `${sessionId}:${nonce}:${expiresAt}`;
  }

  static computeSignature(
    sessionId: string,
    nonce: string,
    expiresAt: number,
    secret: string | Uint8Array,
  ): string {
    const payload = QrTokenManager.formatPayloadString(sessionId, nonce, expiresAt);
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  static verifySignature(
    sessionId: string,
    nonce: string,
    expiresAt: number,
    signature: string,
    secret: string | Uint8Array,
  ): boolean {
    const expected = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);
    if (signature.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  }

  async issueBatch(
    sessionId: string,
    secret: string | Uint8Array,
    options: IssueBatchOptions = {},
  ): Promise<QrTokenBatchItem[]> {
    const count = options.count ?? 5;
    const intervalMs = options.intervalMs ?? 10000;
    const validityMs = options.validityMs ?? 45000;
    const now = Date.now();

    const tokens: QrTokenBatchItem[] = [];
    const dbRecords: Array<{ nonce: string; expiresAt: Date; issuedAt: Date }> = [];

    for (let i = 0; i < count; i++) {
      const nonce = crypto.randomBytes(16).toString("base64url");
      const activeAfter = now + i * intervalMs;
      const expiresAt = now + validityMs + i * intervalMs;
      const expiresAtDate = new Date(expiresAt);
      const signature = QrTokenManager.computeSignature(sessionId, nonce, expiresAt, secret);

      tokens.push({
        nonce,
        expiresAt,
        signature,
        activeAfter,
      });

      dbRecords.push({
        nonce,
        expiresAt: expiresAtDate,
        issuedAt: new Date(now),
      });

      const ttlSeconds = Math.ceil((validityMs + i * intervalMs) / 1000) + 15;
      void this.storage.storeToken(sessionId, nonce, expiresAtDate, ttlSeconds);
    }

    await this.storage.persistBatch(sessionId, dbRecords);
    return tokens;
  }

  async lookupNonce(
    sessionId: string,
    nonce: string,
    isOfflineSync?: boolean,
  ): Promise<QrTokenLookupResult> {
    const result = await this.storage.lookupToken(sessionId, nonce);
    if (!result.found) {
      return result;
    }

    if (!isOfflineSync && result.isExpired) {
      return {
        ...result,
        isExpired: true,
      };
    }

    return result;
  }
}

export const defaultQrTokenManager = new QrTokenManager(new RedisPrismaQrStorageAdapter());

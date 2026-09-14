/**
 * Cryptographic operations and QR Token management.
 * Exports the authoritative QrTokenManager and default production instance.
 */
export {
  QrTokenManager,
  defaultQrTokenManager,
  type QrTokenBatchItem,
  type IssueBatchOptions,
  type QrTokenLookupResult,
  type QrStorageAdapter,
} from "../domain/qr-token-manager";

import { auditQueue } from "./queue";

export interface AuditLogPayload {
  eventType: string;
  actor?: string;
  actorRole?: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Queue an audit log to be processed asynchronously by BullMQ.
 * @param payload The audit log payload
 */
export async function queueAuditLog(payload: AuditLogPayload) {
  try {
    await auditQueue.add("log", payload, {
      removeOnComplete: true,
      removeOnFail: false,
    });
  } catch (error) {
    console.error("Failed to queue audit log:", error);
  }
}

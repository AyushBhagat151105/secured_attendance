import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient, SERVER_URL } from "@/lib/auth-client";
import { profileKeys } from "@/hooks/api/use-profile";
import { getCachedProfile, saveCachedProfile } from "@/lib/session-cache";

interface StudentRealtimeOptions {
  enabled?: boolean;
  onDeviceUnbound?: () => void;
}

export function useStudentRealtime(
  studentUserId?: string | null,
  options: StudentRealtimeOptions = {},
) {
  const { enabled = true, onDeviceUnbound } = options;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!enabled || !studentUserId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let reconnectDelay = 1000;

    async function connect() {
      if (isUnmountedRef.current) return;

      try {
        const cookieClient = authClient as unknown as {
          getCookie?: () => Promise<string | undefined>;
        };
        const cookieString = await cookieClient.getCookie?.();

        const wsBase = SERVER_URL.replace(/^http/, "ws");
        const queryParam = cookieString ? `?cookie=${encodeURIComponent(cookieString)}` : "";
        const wsUrl = `${wsBase}/ws/student${queryParam}`;

        console.log(`🔌 [Realtime] Connecting to WebSocket: ${wsBase}/ws/student`);

        // React Native WebSocket supports custom headers in options object (3rd parameter)
        const wsOptions = cookieString ? { headers: { cookie: cookieString } } : undefined;
        const WSConstructor = WebSocket as unknown as new (
          url: string | URL,
          protocols?: string | string[],
          options?: { headers?: Record<string, string> },
        ) => WebSocket;
        const ws = new WSConstructor(wsUrl, undefined, wsOptions);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("⚡ [Realtime] Connected to student WebSocket gateway");
          reconnectDelay = 1000;

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "PING" }));
              } catch {}
            }
          }, 25000);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📥 [Realtime] Message received:", data);

            if (data.type === "DEVICE_UNBOUND") {
              console.log(
                "🚨 [Realtime] DEVICE_UNBOUND received! Resetting local device binding state",
              );

              // 1. Immediately update React Query profile cache
              queryClient.setQueryData(profileKeys.student(), (old: any) => {
                if (!old) return old;
                return {
                  ...old,
                  deviceBound: false,
                  deviceId: null,
                };
              });

              // 2. Immediately update SecureStore cached profile
              const cached = await getCachedProfile();
              if (cached) {
                await saveCachedProfile({
                  ...cached,
                  deviceBound: false,
                  deviceId: undefined,
                });
              }

              // 3. Trigger callback if supplied
              onDeviceUnbound?.();

              // 4. Invalidate profile queries to trigger fresh background sync
              queryClient.invalidateQueries({ queryKey: profileKeys.student() });
            } else if (data.type === "REBIND_STATUS_CHANGED") {
              console.log("🔄 [Realtime] REBIND_STATUS_CHANGED received", data);
              queryClient.invalidateQueries({ queryKey: profileKeys.student() });
              queryClient.invalidateQueries({ queryKey: ["student", "rebind-request-status"] });
            }
          } catch (err) {
            console.error("❌ [Realtime] Error processing WebSocket message:", err);
          }
        };

        ws.onerror = (error) => {
          console.log("⚠️ [Realtime] WebSocket error:", (error as any)?.message || error);
        };

        ws.onclose = () => {
          console.log("🔌 [Realtime] WebSocket closed");
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          if (!isUnmountedRef.current && enabled && studentUserId) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
              connect();
            }, reconnectDelay);
          }
        };
      } catch (err) {
        console.error("❌ [Realtime] Failed to initiate WebSocket connection:", err);
        if (!isUnmountedRef.current && enabled && studentUserId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
            connect();
          }, reconnectDelay);
        }
      }
    }

    connect();

    return () => {
      isUnmountedRef.current = true;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [studentUserId, enabled, queryClient, onDeviceUnbound]);
}

import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IconSquareRoundedX, IconUsers, IconWifiOff } from "@tabler/icons-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { env } from "@secured_attendance/env/web";
import { teacherApi } from "@/api/teacher";
import { useTodaySchedule, useCloseSession } from "@/hooks/use-teacher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/session/$sessionId")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
  component: SessionComponent,
});

interface QrToken {
  nonce: string;
  expiresAt: number;
  signature: string;
  activeAfter: number;
}

function SessionComponent() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [currentToken, setCurrentToken] = useState<QrToken | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch session details (we reuse the dashboard query to get the active session info)
  const { data: dashboardData } = useTodaySchedule();

  const activeSession = dashboardData?.activeSession;

  // End Session Mutation
  const closeSessionMutation = useCloseSession();

  useEffect(() => {
    if (!activeSession) return; // Wait for active session info (optional, but good for validation)

    // Connect to WebSocket using Eden Treaty
    const ws = teacherApi.subscribeToSession(sessionId);
    
    // @ts-ignore - store the reference for cleanup
    wsRef.current = ws;

    ws.on("open", () => {
      setWsStatus("connected");
    });

    ws.on("message", (event) => {
      const message = event.data;
      if (typeof message !== "object" || !message) return;
      
      if (message.type === "QR_TOKENS_BATCH") {
        // Merge new tokens, keeping only those that haven't expired
        setTokens(prev => {
          const now = Date.now();
          const validOld = prev.filter(t => t.expiresAt > now);
          const newTokens = message.tokens;
          
          // Deduplicate based on nonce
          const merged = [...validOld];
          for (const nt of newTokens) {
            if (!merged.find(t => t.nonce === nt.nonce)) {
              merged.push(nt);
            }
          }
          return merged.sort((a, b) => a.activeAfter - b.activeAfter);
        });
      } else if (message.type === "ATTENDANCE_COUNT") {
        setAttendanceCount(message.count);
      } else if (message.type === "ERROR") {
        toast.error(message.message);
      }
    });

    ws.on("close", () => {
      setWsStatus("disconnected");
    });

    return () => {
      ws.close();
    };
  }, [sessionId, activeSession]);

  // Rotation Interval: Update current token every 1 second based on activeAfter
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => {
        const now = Date.now();
        // Remove expired tokens
        const valid = prev.filter(t => t.expiresAt > now);

        // Find the token that should be active right now
        // It's the one with the largest activeAfter that is <= now
        const active = [...valid].reverse().find(t => t.activeAfter <= now);

        if (active) {
          setCurrentToken(active);
        } else if (valid.length > 0) {
          // Fallback to the first available if none are strictly "active" yet (e.g. slight time sync issue)
          setCurrentToken(valid[0]);
        }

        return valid;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!dashboardData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If there is no active session matching this ID, they shouldn't be here
  if (activeSession?.id !== sessionId) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Session not found or already closed</h2>
        <Button onClick={() => navigate({ to: "/dashboard" })}>Return to Dashboard</Button>
      </div>
    );
  }

  // Generate the payload for the QR code
  const qrPayload = currentToken ? JSON.stringify({
    s: sessionId,
    n: currentToken.nonce,
    e: currentToken.expiresAt,
    sig: currentToken.signature
  }) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* 70% Left Side - QR Code Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-border bg-muted/10 relative">
        {wsStatus === "disconnected" && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full text-sm font-medium">
            <IconWifiOff className="h-4 w-4" />
            Offline - Using Buffered QR Codes
          </div>
        )}

        <div className="max-w-2xl w-full text-center mb-8">
          <p className="text-xl text-muted-foreground">
            Open the Secured Attendance app on your phone and point it at the screen.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-border/50 transition-all">
          {currentToken ? (
            <QRCodeSVG
              value={qrPayload}
              size={400}
              level="H"
              includeMargin={true}
              className="w-full h-auto max-w-100 lg:max-w-125"
            />
          ) : (
            <div className="w-100 h-100 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-2xl">
              <p className="text-muted-foreground">Waiting for QR Code...</p>
            </div>
          )}
        </div>
      </div>

      {/* 30% Right Side - Details & Controls */}
      <div className="w-full lg:w-100 xl:w-125 p-6 lg:p-8 flex flex-col h-full shrink-0">
        <div className="mb-auto">
          <h2 className="text-2xl font-bold mb-6">Session Details</h2>

          <Card className="shadow-sm mb-6 border-border">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Subject</p>
                <p className="font-semibold text-lg">{activeSession.subject.name}</p>
                <p className="text-sm text-muted-foreground">{activeSession.subject.code}</p>
              </div>

              <div className="h-px w-full bg-border" />

              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Room</p>
                  <p className="font-semibold">{activeSession.room.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Divisions</p>
                  <p className="font-semibold">
                    {activeSession.sessionDivisions.map((d: any) => d.division.name).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <IconUsers className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm text-emerald-600/80 font-semibold uppercase tracking-wider mb-2">Live Count</p>
              <h3 className="text-6xl font-bold text-emerald-600 tracking-tighter">
                {attendanceCount}
              </h3>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg font-bold"
            onClick={() => {
              if (confirm("Are you sure you want to end this session? No more students will be able to scan.")) {
                closeSessionMutation.mutate(sessionId, {
                  onSuccess: () => navigate({ to: "/dashboard" })
                });
              }
            }}
            disabled={closeSessionMutation.isPending}
          >
            <IconSquareRoundedX className="h-6 w-6 mr-2" />
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
}

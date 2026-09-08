import { useState, useEffect, useCallback } from "react";
import * as Network from "expo-network";
import { AppState, type AppStateStatus } from "react-native";
import { syncPendingAttendance } from "@/lib/offline-sync";

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean;
  networkType?: Network.NetworkStateType;
  checkNetwork: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<Network.NetworkStateType | undefined>(undefined);

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = !!state.isConnected;
      const reachable = state.isInternetReachable ?? connected;
      const online = connected && reachable;

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setNetworkType(state.type);

      return online;
    } catch {
      setIsConnected(false);
      setIsInternetReachable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let wasOffline = false;

    async function evaluate() {
      const isOnline = await checkNetwork();
      if (!isOnline) {
        wasOffline = true;
      } else if (wasOffline) {
        // Transitioned from offline to online: trigger auto-sync
        wasOffline = false;
        try {
          await syncPendingAttendance();
        } catch {
          // ignore
        }
      }
    }

    // Check immediately
    evaluate();

    // Poll every 4 seconds to catch signal changes
    const interval = setInterval(evaluate, 4000);

    // Check on app returning to active foreground
    const subscription = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") {
        evaluate();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkNetwork]);

  const isOnline = isConnected && isInternetReachable;

  return {
    isOnline,
    isConnected,
    isInternetReachable,
    networkType,
    checkNetwork,
  };
}

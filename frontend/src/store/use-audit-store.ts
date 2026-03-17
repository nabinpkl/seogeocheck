"use client";

import { create } from "zustand";
import type { AuditStreamEvent, AuditUiStatus } from "@/lib/audit";

type ConnectionStatus = "idle" | "connecting" | "open" | "closed";

type PrimeAuditPayload = {
  jobId: string;
  targetUrl: string;
  streamUrl: string;
  reportUrl: string;
  status: AuditUiStatus;
};

type AuditStore = {
  jobId: string | null;
  targetUrl: string;
  streamUrl: string | null;
  reportUrl: string | null;
  status: AuditUiStatus;
  connectionStatus: ConnectionStatus;
  events: AuditStreamEvent[];
  findings: AuditStreamEvent[];
  seenEventIds: Record<string, true>;
  error: string | null;
  lastEventAt: string | null;
  primeAudit: (payload: PrimeAuditPayload) => void;
  connectToStream: () => void;
  markVerified: () => void;
  reset: () => void;
};

const initialState = {
  jobId: null,
  targetUrl: "",
  streamUrl: null,
  reportUrl: null,
  status: "IDLE" as AuditUiStatus,
  connectionStatus: "idle" as ConnectionStatus,
  events: [] as AuditStreamEvent[],
  findings: [] as AuditStreamEvent[],
  seenEventIds: {} as Record<string, true>,
  error: null as string | null,
  lastEventAt: null as string | null,
};

let activeEventSource: EventSource | null = null;

function disconnectActiveStream() {
  if (activeEventSource) {
    activeEventSource.close();
    activeEventSource = null;
  }
}

export const useAuditStore = create<AuditStore>((set, get) => {
  const ingestEvent = (event: AuditStreamEvent) => {
    const nextEventId =
      typeof event.eventId === "string" ? event.eventId : String(event.eventId ?? "");

    if (nextEventId && get().seenEventIds[nextEventId]) {
      return;
    }

    set((state) => ({
      ...state,
      status:
        typeof event.status === "string" ? (event.status as AuditUiStatus) : state.status,
      events: [...state.events, event],
      findings: event.type === "finding" ? [...state.findings, event] : state.findings,
      seenEventIds: nextEventId
        ? { ...state.seenEventIds, [nextEventId]: true }
        : state.seenEventIds,
      lastEventAt:
        typeof event.timestamp === "string" ? event.timestamp : state.lastEventAt,
      connectionStatus:
        event.type === "complete" || event.type === "error"
          ? "closed"
          : state.connectionStatus,
      error:
        event.type === "error" && typeof event.message === "string"
          ? event.message
          : state.error,
    }));

    if (event.type === "complete" || event.type === "error") {
      disconnectActiveStream();
    }
  };

  return {
    ...initialState,
    primeAudit: (payload) => {
      disconnectActiveStream();
      set({
        ...initialState,
        jobId: payload.jobId,
        targetUrl: payload.targetUrl,
        streamUrl: payload.streamUrl,
        reportUrl: payload.reportUrl,
        status: payload.status,
      });
    },
    connectToStream: () => {
      const { jobId, streamUrl } = get();
      if (!jobId || !streamUrl) {
        return;
      }

      disconnectActiveStream();
      set({ connectionStatus: "connecting", error: null });

      const eventSource = new EventSource(streamUrl);
      activeEventSource = eventSource;

      eventSource.onopen = () => {
        if (get().jobId === jobId) {
          set({ connectionStatus: "open" });
        }
      };

      eventSource.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as AuditStreamEvent;
          ingestEvent(event);
        } catch {
          set({
            connectionStatus: "closed",
            error: "The live audit pulse could not be decoded.",
          });
          disconnectActiveStream();
        }
      };

      eventSource.onerror = () => {
        const currentStatus = get().status;
        if (currentStatus === "COMPLETE" || currentStatus === "VERIFIED") {
          return;
        }

        set({
          connectionStatus: "closed",
          error: "The live audit pulse disconnected before completion.",
        });
        disconnectActiveStream();
      };
    },
    markVerified: () => {
      disconnectActiveStream();
      set((state) => ({
        ...state,
        status: "VERIFIED",
        streamUrl: null,
        connectionStatus: "closed",
        events: [],
        findings: [],
        seenEventIds: {},
      }));
    },
    reset: () => {
      disconnectActiveStream();
      set(initialState);
    },
  };
});

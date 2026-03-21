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
  seenEventIds: {} as Record<string, true>,
  error: null as string | null,
  lastEventAt: null as string | null,
};

export const useAuditStore = create<AuditStore>((set, get) => {
  const eventSourcesByJobId = new Map<string, EventSource>();

  const closeStream = (jobId: string | null | undefined) => {
    if (!jobId) {
      return;
    }

    const eventSource = eventSourcesByJobId.get(jobId);
    if (!eventSource) {
      return;
    }

    eventSource.close();
    eventSourcesByJobId.delete(jobId);
  };

  const closeAllStreams = () => {
    for (const eventSource of eventSourcesByJobId.values()) {
      eventSource.close();
    }
    eventSourcesByJobId.clear();
  };

  const ingestEvent = (event: AuditStreamEvent, streamJobId: string) => {
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
      closeStream(streamJobId);
    }
  };

  return {
    ...initialState,
    primeAudit: (payload) => {
      closeStream(get().jobId);
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

      closeStream(jobId);
      set({ connectionStatus: "connecting", error: null });

      const eventSource = new EventSource(streamUrl);
      eventSourcesByJobId.set(jobId, eventSource);

      eventSource.onopen = () => {
        if (eventSourcesByJobId.get(jobId) !== eventSource) {
          return;
        }

        if (get().jobId === jobId) {
          set({ connectionStatus: "open" });
        }
      };

      eventSource.onmessage = (message) => {
        if (eventSourcesByJobId.get(jobId) !== eventSource) {
          return;
        }

        try {
          const event = JSON.parse(message.data) as AuditStreamEvent;

          if (typeof event.jobId === "string" && event.jobId !== jobId) {
            return;
          }

          if (get().jobId !== jobId) {
            return;
          }

          ingestEvent(event, jobId);
        } catch {
          if (get().jobId !== jobId) {
            closeStream(jobId);
            return;
          }

          set({
            connectionStatus: "closed",
            error: "We couldn't read one of the live audit updates.",
          });
          closeStream(jobId);
        }
      };

      eventSource.onerror = () => {
        if (eventSourcesByJobId.get(jobId) !== eventSource) {
          return;
        }

        if (get().jobId !== jobId) {
          closeStream(jobId);
          return;
        }

        const currentStatus = get().status;
        if (
          currentStatus === "COMPLETE" ||
          currentStatus === "VERIFIED" ||
          currentStatus === "FAILED"
        ) {
          return;
        }

        set({
          connectionStatus: "closed",
          error: "We lost the live connection before your audit finished.",
        });
        closeStream(jobId);
      };
    },
    markVerified: () => {
      closeStream(get().jobId);
      set((state) => ({
        ...state,
        status: "VERIFIED",
        streamUrl: null,
        connectionStatus: "closed",
        events: [],
        seenEventIds: {},
      }));
    },
    reset: () => {
      closeAllStreams();
      set(initialState);
    },
  };
});

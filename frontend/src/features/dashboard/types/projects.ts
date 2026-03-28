export interface Site {
  id: string;
  name: string;
  url: string;
  lastScore?: number;
  lastAuditAt?: string;
  status: "idle" | "auditing" | "completed" | "failed";
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sites: Site[];
  createdAt: string;
}

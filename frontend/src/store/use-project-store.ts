import { create } from "zustand";
import type { Project } from "@/features/dashboard/types/projects";

const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Personal Portfolio",
    description: "Main portfolio and showcase site for the year 2025.",
    createdAt: "2025-01-10T10:00:00Z",
    sites: [
      {
        id: "s1",
        name: "Main Site",
        url: "nabinpokhrel.com",
        lastScore: 84,
        lastAuditAt: "2025-03-25T14:30:00Z",
        status: "completed",
      },
      {
        id: "s2",
        name: "Tech Blog",
        url: "blog.nabinpokhrel.com",
        lastScore: 72,
        lastAuditAt: "2025-03-24T09:15:00Z",
        status: "completed",
      },
    ],
  },
  {
    id: "p2",
    name: "SaaS Launch - seogeo",
    description: "Marketing and landing pages for the new search engine optimization tool.",
    createdAt: "2025-02-15T12:00:00Z",
    sites: [
      {
        id: "s3",
        name: "Home Page",
        url: "seogeo.com",
        lastScore: 91,
        lastAuditAt: "2025-03-27T23:55:00Z",
        status: "completed",
      },
      {
        id: "s4",
        name: "Documentation",
        url: "docs.seogeo.com",
        lastScore: 68,
        lastAuditAt: "2025-03-26T11:45:00Z",
        status: "completed",
      },
    ],
  },
];

type ProjectStore = {
  projects: Project[];
  selectedProjectId: string;
  highlightedUrl: string | null;
  setSelectedProjectId: (id: string) => void;
  setHighlightedUrl: (url: string | null) => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: MOCK_PROJECTS,
  selectedProjectId: MOCK_PROJECTS[0]?.id || "",
  highlightedUrl: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setHighlightedUrl: (url) => set({ highlightedUrl: url }),
}));

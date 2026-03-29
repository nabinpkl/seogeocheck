"use client";

import * as React from "react";
import type {
  AuditCategoryScoreModel,
  AuditCheckRowModel,
  AuditFamilyChecklistGroupModel,
  AuditHeaderModel,
  AuditStreamRowModel,
} from "./models";

export type AuditSectionActions = {
  onReAudit: (event?: React.MouseEvent) => void;
  onReset: () => void;
};

export type AuditResultsSectionProps = {
  reportScore: number;
  reportScoreConfidence: number | null;
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  categoryScores: AuditCategoryScoreModel[];
  topRecommendationHeroRow: AuditCheckRowModel | null;
  topRecommendationRows: AuditCheckRowModel[];
  familyGroups: AuditFamilyChecklistGroupModel[];
  onScrollToIssues: () => void;
  onScrollToFamilies: () => void;
  claimPanel: {
    message: string;
    signUpHref: string | null;
    signInHref: string | null;
  } | null;
} & AuditSectionActions;

export type AuditSectionViewProps = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  resultPanelRef: React.RefObject<HTMLDivElement | null>;
  visibility: {
    showResultPanel: boolean;
    showLiveStream: boolean;
    showProgressSidebar: boolean;
  };
  inputPanel: {
    action: (formData: FormData) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    url: string;
    clientError: string | null;
    notice: string | null;
    projectSlug: string | null;
    isPending: boolean;
    isAuditActive: boolean;
    isTyping: boolean;
    onUrlChange: (value: string) => void;
    onExampleAudit: () => void;
  };
  statusHeader: {
    model: AuditHeaderModel;
    showCompactActions: boolean;
  };
  liveStream: {
    rows: AuditStreamRowModel[];
  };
  progressSidebar: {
    connectionLabel: string;
    hasAuditFailed: boolean;
    targetUrlLabel: string;
    gapsCount: number;
    signalsCount: number;
    progressValue: number;
    progressLabel: string;
    progressBarClassName: string;
    currentStepMessage: string;
    operationState: "failed" | "pending" | "ready" | "active";
  };
  results: AuditResultsSectionProps | null;
  actions: AuditSectionActions;
};

/**
 * This file is generated from JSON Schema.
 * Do not edit it by hand.
 */

export interface AuditStreamEvent {
  jobId: string;
  eventId: string;
  timestamp: string;
  type: 'status' | 'check' | 'error' | 'complete';
  status: 'QUEUED' | 'STREAMING' | 'COMPLETE' | 'FAILED' | 'VERIFIED';
  message: string;
  stage?: string;
  progress?: number;
  ruleId?: string;
  checkStatus?: 'issue' | 'passed' | 'not_applicable' | 'system_error';
  severity?: 'high' | 'medium' | 'low';
  instruction?: string;
  detail?: string;
  selector?: string;
  metric?: string;
  producer?: string;
  sourceEventId?: string;
}

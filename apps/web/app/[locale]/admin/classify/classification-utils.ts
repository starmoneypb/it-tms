export type ClassificationTicket = {
  id: string;
  code: number;
  title: string;
  description: string;
  initialType: string;
  resolvedType?: string | null;
  status: string;
  priority: string;
  impactScore: number;
  urgencyScore: number;
  finalScore: number;
  redFlag: boolean;
  effortData?: any;
  effortScore?: number;
  createdBy?: string;
  latestComment?: string;
  createdAt: string;
  updatedAt: string;
};

const ISSUE_REPORT_TYPE = "ISSUE_REPORT";

const hasResolvedClassification = (resolvedType?: string | null) => {
  if (!resolvedType) {
    return false;
  }

  return resolvedType.trim().length > 0;
};

export const isClassifiableIssueReport = (ticket: ClassificationTicket): boolean => {
  return ticket.initialType === ISSUE_REPORT_TYPE && !hasResolvedClassification(ticket.resolvedType);
};

export const filterClassifiableIssueReports = (
  tickets: ClassificationTicket[],
): ClassificationTicket[] => tickets.filter(isClassifiableIssueReport);

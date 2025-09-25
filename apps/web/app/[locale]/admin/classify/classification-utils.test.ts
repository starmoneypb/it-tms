import { describe, expect, it } from 'vitest';
import {
  filterClassifiableIssueReports,
  isClassifiableIssueReport,
  type ClassificationTicket,
} from './classification-utils';

type PartialTicket = Partial<ClassificationTicket> & Pick<ClassificationTicket, 'id' | 'code'>;

const buildTicket = (overrides: PartialTicket): ClassificationTicket => ({
  id: overrides.id,
  code: overrides.code,
  title: overrides.title ?? 'Sample',
  description: overrides.description ?? 'Sample description',
  initialType: overrides.initialType ?? 'ISSUE_REPORT',
  resolvedType: overrides.resolvedType ?? null,
  status: overrides.status ?? 'PENDING',
  priority: overrides.priority ?? 'P1',
  impactScore: overrides.impactScore ?? 0,
  urgencyScore: overrides.urgencyScore ?? 0,
  finalScore: overrides.finalScore ?? 0,
  redFlag: overrides.redFlag ?? false,
  effortData: overrides.effortData,
  effortScore: overrides.effortScore ?? 0,
  createdBy: overrides.createdBy,
  latestComment: overrides.latestComment,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
});

describe('classification utils', () => {
  it('marks issue reports without classification as classifiable regardless of status', () => {
    const pending = buildTicket({ id: '1', code: 1, status: 'PENDING' });
    const resolved = buildTicket({ id: '2', code: 2, status: 'RESOLVED' });

    expect(isClassifiableIssueReport(pending)).toBe(true);
    expect(isClassifiableIssueReport(resolved)).toBe(true);
  });

  it('excludes tickets that already have a resolved classification', () => {
    const dataCorrection = buildTicket({ id: '3', code: 3, resolvedType: 'DATA_CORRECTION' });
    const emergencyChange = buildTicket({ id: '4', code: 4, resolvedType: 'EMERGENCY_CHANGE' });

    expect(isClassifiableIssueReport(dataCorrection)).toBe(false);
    expect(isClassifiableIssueReport(emergencyChange)).toBe(false);
  });

  it('treats empty resolved type strings as unclassified', () => {
    const emptyResolved = buildTicket({ id: '5', code: 5, resolvedType: '' });

    expect(isClassifiableIssueReport(emptyResolved)).toBe(true);
  });

  it('filters only classifiable issue reports from a list', () => {
    const tickets = [
      buildTicket({ id: '6', code: 6 }),
      buildTicket({ id: '7', code: 7, resolvedType: 'DATA_CORRECTION' }),
      buildTicket({ id: '8', code: 8, initialType: 'SERVICE_REQUEST' }),
      buildTicket({ id: '9', code: 9, resolvedType: null, status: 'IN_PROGRESS' }),
    ];

    const filtered = filterClassifiableIssueReports(tickets);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((ticket) => ticket.id)).toEqual(['6', '9']);
  });
});

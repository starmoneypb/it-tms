"use client";
import { useEffect, useState, useCallback } from "react";
import { Input, Select, SelectItem, Pagination, Card, CardBody, CardHeader, Switch } from "@heroui/react";
import { Search, Clock, Inbox, AlertCircle, Play, CheckCircle, XCircle, Plus } from "lucide-react";
import UserSearchSelect from "@/components/UserSearchSelect";
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from "@/lib/auth";
import { MarkdownRenderer } from '@/lib/markdown-renderer';
import { convertContentToMarkdown } from '@/lib/html-to-markdown';

// Use current hostname with port 8000 for production-like environment
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

type AssigneeSummary = {
  id: string;
  name: string;
  profilePicture?: string | null;
};

type Ticket = {
  id: string; 
  code: number; 
  title: string; 
  status: string; 
  priority: string; 
  initialType: string; 
  createdAt: string;
  assigneeId?: string | null;    // Deprecated: for backward compatibility
  assigneeName?: string | null;  // Deprecated: for backward compatibility
  assignees?: AssigneeSummary[]; // New: detailed assignee info
  updatedAt: string;
  latestComment?: string | null;
};

const statusColors = {
  pending: "warning",
  in_progress: "primary", 
  completed: "success",
  canceled: "danger"
} as const;

const priorityColors = {
  P0: "danger",
  P1: "warning", 
  P2: "primary",
  P3: "default"
} as const;

// Utility function to format time since
function formatTimeSince(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
}

// Priority color mapping
function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'p0':
    case 'critical':
      return 'text-red-400 bg-red-400/10';
    case 'p1':
    case 'high':
      return 'text-orange-400 bg-orange-400/10';
    case 'p2':
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'p3':
    case 'low':
      return 'text-green-400 bg-green-400/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
}

// Status indicator component
function StatusIndicator({ status }: { status: string }) {
  const t = useTranslations('tickets');
  
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400 bg-yellow-400/10',
          label: t('status.pending')
        };
      case 'in_progress':
        return {
          icon: Play,
          color: 'text-blue-400 bg-blue-400/10',
          label: t('status.in_progress')
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-400 bg-green-400/10',
          label: t('status.completed')
        };
      case 'canceled':
        return {
          icon: XCircle,
          color: 'text-red-400 bg-red-400/10',
          label: t('status.canceled')
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400 bg-gray-400/10',
          label: status
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <IconComponent size={12} />
      {config.label}
    </span>
  );
}

export default function TicketsPage() {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const tTypeOptions = useTranslations('typeOptions');
  const locale = useLocale();
  const { user, isLoading: authLoading } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [ticketType, setTicketType] = useState<string>("");
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<{ data: Ticket[]; total: number; totalPages: number; } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (ticketType) params.set("ticketType", ticketType);
    if (includeCanceled) params.set("includeCanceled", "true");
    // For now, we'll use the first assignee ID for backward compatibility with the API
    if (assigneeIds.length > 0) params.set("assigneeId", assigneeIds[0]);
    fetch(`${API}/api/v1/tickets?` + params.toString(), { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, pageSize, q, status, priority, ticketType, includeCanceled, assigneeIds.join(',')]);

  // Debounced search for text input - resets to page 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [q]);

  // Immediate search for status, priority, and assignee changes - resets to page 1
  useEffect(() => {
    setPage(1);
  }, [status, priority, ticketType, includeCanceled, assigneeIds.join(',')]);

  // Set default assignee to current user when auth loads
  useEffect(() => {
    if (!authLoading && user && assigneeIds.length === 0) {
      // Only set default if no assignee is already selected
      setAssigneeIds([user.id]);
    }
  }, [authLoading, user, assigneeIds.length]);

  // Load data when any parameter changes
  useEffect(() => { 
    load(); 
  }, [load]);

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
        <p className="text-white/70">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        <Card className="glass p-2">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search size={18} className="text-primary-400" />
              {t('searchAndFilter')}
            </h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <Input
              label={tCommon('search')}
              placeholder={t('searchPlaceholder')}
              value={q}
              onValueChange={setQ}
              variant="bordered"
              className="md:col-span-2 lg:col-span-2 xl:col-span-3"
            />
            <Select
              label={t('statusLabel')}
              placeholder={t('anyStatus')}
              selectedKeys={status ? [status] : []}
              onChange={(e)=>setStatus(e.target.value)}
              variant="bordered"
            >
              <SelectItem key="">{t('any')}</SelectItem>
              <SelectItem key="pending">{t('status.pending')}</SelectItem>
              <SelectItem key="in_progress">{t('status.in_progress')}</SelectItem>
              <SelectItem key="completed">{t('status.completed')}</SelectItem>
            </Select>
            <Select
              label={t('priorityLabel')}
              placeholder={t('anyPriority')}
              selectedKeys={priority ? [priority] : []}
              onChange={(e)=>setPriority(e.target.value)}
              variant="bordered"
            >
              {["", "P0", "P1", "P2", "P3"].map(s => (
                <SelectItem key={s}>{s || t('any')}</SelectItem>
              ))}
            </Select>
            <Select
              label={t('typeLabel')}
              placeholder={t('anyType')}
              selectedKeys={ticketType ? [ticketType] : []}
              onChange={(e)=>setTicketType(e.target.value)}
              variant="bordered"
              className="md:col-span-2 lg:col-span-1 xl:col-span-1"
            >
              <SelectItem key="">{t('any')}</SelectItem>
              <SelectItem key="ISSUE_REPORT">{tTypeOptions('ISSUE_REPORT')}</SelectItem>
              <SelectItem key="CHANGE_REQUEST_NORMAL">{tTypeOptions('CHANGE_REQUEST_NORMAL')}</SelectItem>
              <SelectItem key="SERVICE_REQUEST_DATA_CORRECTION">{tTypeOptions('SERVICE_REQUEST_DATA_CORRECTION')}</SelectItem>
              <SelectItem key="SERVICE_REQUEST_DATA_EXTRACTION">{tTypeOptions('SERVICE_REQUEST_DATA_EXTRACTION')}</SelectItem>
              <SelectItem key="SERVICE_REQUEST_ADVISORY">{tTypeOptions('SERVICE_REQUEST_ADVISORY')}</SelectItem>
              <SelectItem key="SERVICE_REQUEST_GENERAL">{tTypeOptions('SERVICE_REQUEST_GENERAL')}</SelectItem>
            </Select>
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
              <UserSearchSelect
                selectedUserIds={assigneeIds}
                onSelectionChange={setAssigneeIds}
                placeholder={t('anyAssignee')}
                label={t('assignee')}
                variant="bordered"
                isMultiple={false}
                allowClear={true}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1 xl:col-span-1">
              {/* กล่องฟิลด์ให้สูงเท่าคอมโพเนนต์อื่น */}
              <label
                htmlFor="include-canceled"
                className="m-0 flex h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 shadow-sm backdrop-blur-md"
              >
                {/* ข้อความสองบรรทัด แต่ไม่ทำให้กล่องสูงเกิน เพราะเราคุมความสูงที่ container แล้ว */}
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-wider text-white/60">
                    {t('status.canceled')}
                  </span>
                  <span className="truncate text-sm font-semibold text-white">
                    {t('showCanceled')}
                  </span>
                </span>

                {/* ตัวสวิตช์จริง — ไม่ใส่ label ข้างในเพื่อกันการขยายตัว */}
                <Switch
                  id="include-canceled"
                  isSelected={includeCanceled}
                  onValueChange={setIncludeCanceled}
                  size="sm"
                  color="danger" // ให้โทนแเดงเมื่อเปิด
                  aria-label={t('showCanceled')}
                  classNames={{
                    // ไม่ให้ base เพิ่มระยะขอบ/ความสูงเอง
                    base: "m-0",
                    // track: ปิด = เทาโปร่ง, เปิด = แดงชัดเจน
                    wrapper: "h-5 w-10 rounded-full bg-white/20 data-[selected=true]:bg-danger-500",
                    // ปุ่มกลม
                    thumb: "h-4 w-4 bg-white shadow-md",
                  }}
                  startContent={<XCircle className="h-3.5 w-3.5 text-white" />}
                  endContent={<CheckCircle className="h-3.5 w-3.5 text-white" />}
                />
              </label>
            </div>

          </CardBody>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white/70">{t('loadingTickets')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data?.data?.map((ticket) => (
            <div 
              key={ticket.id} 
              className="glass rounded-lg p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group relative border border-white/5 flex flex-col h-[280px]"
              onClick={() => window.location.href = `/${locale}/tickets/${ticket.id}`}
            >
              {/* Header with Title and Priority */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold group-hover:text-primary-400 transition-colors line-clamp-2 flex-1 mr-2">
                  #{ticket.code} — {ticket.title}
                </h3>
                <div className="flex flex-col gap-2 items-end">
                  <StatusIndicator status={ticket.status} />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>

              {/* Time in Progress */}
              <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
                <Clock size={14} className="text-blue-400" />
                <span>{tCommon('updated')} {formatTimeSince(ticket.updatedAt || ticket.createdAt)}</span>
              </div>

              {/* Latest Comment */}
              <div className="flex-1 min-h-0 mb-4">
                {ticket.latestComment ? (
                  <>
                        <div className="text-xs text-white/50 mb-1">{tCommon('latestComment')}</div>
                    <div className="h-[80px] bg-white/5 rounded-lg p-3 overflow-hidden relative">
                      <div className="text-sm text-white/80 leading-5 h-full overflow-hidden">
                        <MarkdownRenderer 
                          content={convertContentToMarkdown(ticket.latestComment)}
                          className="text-sm text-white/80"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[80px] flex items-center justify-center text-white/40 text-sm">
                    {tCommon('noRecentActivity')}
                  </div>
                )}
              </div>

              {/* Assignees */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  {ticket.assignees && ticket.assignees.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1 overflow-hidden">
                        {ticket.assignees.slice(0, 4).map((assignee: any, index: number) => (
                          <div
                            key={assignee.id}
                            className="relative w-6 h-6 rounded-full border-2 border-gray-800 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden"
                            style={{ zIndex: 10 - index }}
                            title={assignee.name}
                          >
                            {assignee.profilePicture ? (
                              <img
                                src={`${API}/api/v1${assignee.profilePicture}`}
                                alt={assignee.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              assignee.name.charAt(0).toUpperCase()
                            )}
                          </div>
                        ))}
                        {ticket.assignees.length > 4 && (
                          <div className="relative w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
                            +{ticket.assignees.length - 4}
                          </div>
                        )}
                      </div>
                          <div className="text-sm text-white/70 ml-1">
                            {ticket.assignees.length === 1 
                              ? ticket.assignees[0].name 
                              : `${ticket.assignees.length} ${tCommon('assignees')}`
                            }
                          </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
                        ?
                      </div>
                      <div className="text-sm text-white/70">{tCommon('unassigned')}</div>
                    </>
                  )}
                </div>
                <div className="text-sm text-primary-400 font-medium group-hover:text-primary-300 transition-colors">
                  {tCommon('view')} →
                </div>
              </div>
            </div>
          ))}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex justify-center pt-6">
            <Pagination 
              total={data.totalPages} 
              page={page} 
              onChange={setPage}
              color="primary"
              classNames={{
                item: "bg-white/10 text-white hover:bg-white/20",
                cursor: "bg-primary-500"
              }}
            />
          </div>
        )}

        {data && data.data.length === 0 && (
          <Card className="glass">
            <CardBody className="text-center py-20">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
                  <Inbox size={32} className="text-primary-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 gradient-text">{t('noTicketsFound')}</h3>
                  <p className="text-white/70 text-lg max-w-md mx-auto leading-relaxed">
                    {q || status || priority || ticketType || includeCanceled || assigneeIds.length > 0
                    ? tCommon('tryAdjusting')
                    : tCommon('getStartedFirst')
                  }
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <a 
                  href={`/${locale}/tickets/new`}
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25 border border-primary-400/20 min-w-[200px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Plus size={20} className="mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="relative z-10">{tCommon('createTicket')}</span>
                </a>
                
                {(q || status || priority || ticketType || includeCanceled || assigneeIds.length > 0) && (
                  <button
                    onClick={() => {
                      setQ("");
                      setStatus("");
                      setPriority("");
                      setTicketType("");
                      setIncludeCanceled(false);
                      setAssigneeIds([]);
                    }}
                    className="inline-flex items-center justify-center px-8 py-4 text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-all duration-300 hover:bg-white/5 min-w-[200px] font-semibold"
                  >
                    {tCommon('clearFilters')}
                  </button>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
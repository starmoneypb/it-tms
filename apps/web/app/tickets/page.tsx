"use client";
import { useEffect, useState, useCallback } from "react";
import { Input, Select, SelectItem, Pagination, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Search, Clock, Inbox } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

export default function TicketsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
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
    fetch(`${API}/api/v1/tickets?` + params.toString(), { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, pageSize, q, status, priority]);

  // Debounced search for text input - resets to page 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [q]);

  // Immediate search for status and priority changes - resets to page 1
  useEffect(() => {
    setPage(1);
  }, [status, priority]);

  // Load data when any parameter changes
  useEffect(() => { 
    load(); 
  }, [load]);

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Tickets</h1>
        <p className="text-white/70">Manage and track your support tickets</p>
      </div>

      <div className="space-y-6">
        <Card className="glass p-2">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search size={18} className="text-primary-400" />
              Search & Filter
            </h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              label="Search tickets" 
              placeholder="Search by title..."
              value={q} 
              onValueChange={setQ} 
              variant="bordered"
            />
            <Select 
              label="Status" 
              placeholder="Any status"
              selectedKeys={status ? [status] : []} 
              onChange={(e)=>setStatus(e.target.value)}
              variant="bordered"
            >
              <SelectItem key="">Any</SelectItem>
              <SelectItem key="pending">Pending</SelectItem>
              <SelectItem key="in_progress">In Progress</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="canceled">Canceled</SelectItem>
            </Select>
            <Select 
              label="Priority" 
              placeholder="Any priority"
              selectedKeys={priority ? [priority] : []} 
              onChange={(e)=>setPriority(e.target.value)}
              variant="bordered"
            >
              {["", "P0", "P1", "P2", "P3"].map(s => (
                <SelectItem key={s}>{s || "Any"}</SelectItem>
              ))}
            </Select>
          </CardBody>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white/70">Loading tickets...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data?.data?.map((ticket) => (
            <div 
              key={ticket.id} 
              className="glass rounded-lg p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group relative border border-white/5 flex flex-col h-[240px]"
              onClick={() => window.location.href = `/tickets/${ticket.id}`}
            >
              {/* Header with Title and Priority */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold group-hover:text-primary-400 transition-colors line-clamp-2 flex-1 mr-2">
                  #{ticket.code} — {ticket.title}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>

              {/* Time in Progress */}
              <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
                <Clock size={14} className="text-blue-400" />
                <span>Updated {formatTimeSince(ticket.updatedAt || ticket.createdAt)}</span>
              </div>

              {/* Latest Comment */}
              <div className="flex-1 min-h-0 mb-3">
                {ticket.latestComment ? (
                  <>
                    <div className="text-xs text-white/50 mb-1">Latest comment:</div>
                    <div className="h-[60px] bg-white/5 rounded-lg p-3 overflow-hidden relative">
                      <div className="text-sm text-white/80 leading-5 h-full overflow-hidden">
                        {(() => {
                          const cleanText = ticket.latestComment
                            .replace(/<br\s*\/?>/gi, ' ')
                            .replace(/<\/p>\s*<p>/gi, ' ')
                            .replace(/<[^>]*>/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                          
                          // Manually truncate to fit in 3 lines (approximately 120 characters)
                          return cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[60px] flex items-center justify-center text-white/40 text-sm">
                    No recent activity
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
                                src={`${API}${assignee.profilePicture}`}
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
                          : `${ticket.assignees.length} assignees`
                        }
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
                        ?
                      </div>
                      <div className="text-sm text-white/70">Unassigned</div>
                    </>
                  )}
                </div>
                <div className="text-sm text-primary-400 font-medium group-hover:text-primary-300 transition-colors">
                  View →
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
            <CardBody className="text-center py-16">
              <div className="text-lg mb-4 text-gray-400 font-semibold flex items-center justify-center gap-2">
                <Inbox size={20} />
                No Results
              </div>
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-white/70 mb-4">
                {q || status || priority 
                  ? "Try adjusting your search criteria" 
                  : "Get started by creating your first ticket"
                }
              </p>
              <a 
                href="/tickets/new"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create Ticket
              </a>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
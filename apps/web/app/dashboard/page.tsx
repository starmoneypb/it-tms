"use client";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import DOMPurify from "isomorphic-dompurify";
import dynamic from "next/dynamic";
import { AlertTriangle, Clipboard, PartyPopper, Clock, BarChart3, FolderOpen, Zap } from "lucide-react";

// Import the Chart.js pie chart component with SSR disabled
const ChartJsPieChart = dynamic(() => import("../../components/ChartJsPieChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
        <p className="text-white/50 text-sm">Loading chart...</p>
      </div>
    </div>
  )
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type AssigneeSummary = {
  id: string;
  name: string;
  profilePicture?: string | null;
};

type TicketSummary = {
  id: string;
  title: string;
  priority: string;
  assigneeId?: string | null;    // Deprecated: for backward compatibility
  assigneeName?: string | null;  // Deprecated: for backward compatibility
  assignees?: AssigneeSummary[]; // New: detailed assignee info
  updatedAt: string;
  latestComment?: string | null;
};

type Summary = {
  inProgressToday: TicketSummary[];
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
};


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

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching metrics from:', `${API}/api/v1/metrics/summary`);
        const response = await fetch(`${API}/api/v1/metrics/summary`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        // Handle both direct data and wrapped data formats
        const metricsData = result.data || result;
        console.log('Processed metrics data:', metricsData);
        
        setData(metricsData);
        setError(null);
      } catch (e) {
        console.error('Error fetching metrics:', e);
        setError(String(e));
        
        // Set fallback demo data for development/testing
        const fallbackData: Summary = {
          inProgressToday: [],
          statusCounts: { 'pending': 5, 'in_progress': 3, 'completed': 12, 'canceled': 1 },
          categoryCounts: { 'ISSUE_REPORT': 8, 'SERVICE_REQUEST_GENERAL': 6, 'CHANGE_REQUEST_NORMAL': 4, 'SERVICE_REQUEST_DATA_CORRECTION': 3 },
          priorityCounts: { 'P0': 2, 'P1': 4, 'P2': 8, 'P3': 7 }
        };
        
        console.log('Using fallback data:', fallbackData);
        setData(fallbackData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (error) return (
    <div className="container">
      <Card className="glass border-red-500/20">
        <CardBody className="text-center py-8">
          <div className="text-red-400 text-lg mb-2 flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            Error Loading Dashboard
          </div>
          <p className="text-white/70">{error}</p>
        </CardBody>
      </Card>
    </div>
  );
  
  if (!mounted || loading || !data) return (
    <div className="container">
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading dashboard...</p>
          {error && (
            <p className="text-orange-400 text-sm mt-2">
              API connection failed - using demo data
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const toPie = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, value]) => ({ 
      name, 
      value: Number(value) || 0 // Ensure it's a number, default to 0 if invalid
    })).filter(item => item.value > 0); // Only include items with positive values

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
        <p className="text-white/70">Monitor your IT support operations and ticket metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 glass p-2">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clipboard size={20} className="text-primary-400" />
              Active Tickets Today
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex overflow-x-auto gap-4 pb-2 overflow-y-visible">
              {data.inProgressToday.length === 0 && (
                <div className="w-full text-center py-8">
                  <div className="text-lg mb-2 text-green-400 font-semibold flex items-center justify-center gap-2">
                    <PartyPopper size={20} />
                    Great!
                  </div>
                  <p className="text-white/70">No tickets in progress today!</p>
                </div>
              )}
              {data.inProgressToday.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="w-[320px] h-[240px] flex-shrink-0 glass rounded-lg p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group relative border border-white/5 flex flex-col"
                  onClick={() => window.location.href = `/tickets/${ticket.id}`}
                >
                  {/* Header with Title and Priority */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold group-hover:text-primary-400 transition-colors line-clamp-2 flex-1 mr-2">
                      {ticket.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>

                  {/* Time in Progress */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
                    <Clock size={14} className="text-blue-400" />
                    <span>In progress for {formatTimeSince(ticket.updatedAt)}</span>
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
          </CardBody>
        </Card>

        <ChartCard title="Status Distribution" data={toPie(data.statusCounts)} icon={<BarChart3 size={18} className="text-primary-400" />} />
        <ChartCard title="Category Breakdown" data={toPie(data.categoryCounts)} icon={<FolderOpen size={18} className="text-primary-400" />} />
        <ChartCard title="Priority Levels" data={toPie(data.priorityCounts)} icon={<Zap size={18} className="text-primary-400" />} />
      </div>
    </div>
  );
}

function ChartCard({ title, data, icon }: { title: string; data: { name: string; value: number }[]; icon: React.ReactNode }) {
  return (
    <Card className="glass p-2">
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </CardHeader>
      <CardBody className="p-6">
        <ChartJsPieChart data={data} title={title} />
      </CardBody>
    </Card>
  );
}
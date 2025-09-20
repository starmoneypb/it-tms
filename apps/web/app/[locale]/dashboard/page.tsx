"use client";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Avatar, Select, SelectItem, Button } from "@heroui/react";
import DOMPurify from "isomorphic-dompurify";
import dynamic from "next/dynamic";
import { AlertTriangle, Clipboard, PartyPopper, Clock, BarChart3, FolderOpen, Zap, Trophy, Star, Award, Calendar, Filter } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';

// Import the Chart.js pie chart component with SSR disabled
const ChartJsPieChart = dynamic(() => import("@/components/ChartJsPieChart"), {
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

// Use relative URLs for production-like environment behind reverse proxy
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

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

type UserRanking = {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string | null;
  totalPoints: number;
  ticketsCompleted: number;
  rank: number;
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
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [data, setData] = useState<Summary | null>(null);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Date filtering state
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isAllTime, setIsAllTime] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    // Set current month and year as default
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1); // getMonth() returns 0-11, we need 1-12
    setSelectedYear(now.getFullYear());
    setIsAllTime(false); // Start with current month, not all time
  }, []);

  const fetchData = async () => {
    try {
      // Build query string for date filtering
      const queryParams = new URLSearchParams();
      if (!isAllTime && selectedMonth !== null && selectedYear !== null) {
        queryParams.append('month', selectedMonth.toString());
        queryParams.append('year', selectedYear.toString());
      }
      const queryString = queryParams.toString();
      const metricsUrl = `${API}/api/v1/metrics/summary${queryString ? `?${queryString}` : ''}`;
      
      const rankingsUrl = `${API}/api/v1/rankings${queryString ? `?${queryString}` : ''}`;
      
      const [metricsResponse, rankingsResponse] = await Promise.all([
        fetch(metricsUrl, {
          credentials: "include",
        }),
        fetch(rankingsUrl, {
          credentials: "include",
        })
      ]);
        
        if (!metricsResponse.ok) {
          throw new Error(`HTTP ${metricsResponse.status}: ${metricsResponse.statusText}`);
        }
        
        const metricsResult = await metricsResponse.json();
        
        // Handle both direct data and wrapped data formats
        const metricsData = metricsResult.data || metricsResult;
        
        setData(metricsData);
        
        // Fetch rankings if available
        if (rankingsResponse.ok) {
          const rankingsResult = await rankingsResponse.json();
          const rankingsData = rankingsResult.data || rankingsResult;
          setRankings(Array.isArray(rankingsData) ? rankingsData : []);
        }
        
        setError(null);
      } catch (e) {
        setError(String(e));
        
        // Set fallback demo data for development/testing
        const fallbackData: Summary = {
          inProgressToday: [],
          statusCounts: { 'pending': 5, 'in_progress': 3, 'completed': 12, 'canceled': 1 },
          categoryCounts: { 'ISSUE_REPORT': 8, 'SERVICE_REQUEST_GENERAL': 6, 'CHANGE_REQUEST_NORMAL': 4, 'SERVICE_REQUEST_DATA_CORRECTION': 3 },
          priorityCounts: { 'P0': 2, 'P1': 4, 'P2': 8, 'P3': 7 }
        };
        
        const fallbackRankings: UserRanking[] = [
          { id: '1', name: 'John Doe', email: 'john@example.com', role: 'User', totalPoints: 125.5, ticketsCompleted: 15, rank: 1 },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Supervisor', totalPoints: 98.0, ticketsCompleted: 12, rank: 2 },
          { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', totalPoints: 87.5, ticketsCompleted: 10, rank: 3 }
        ];
        
        setData(fallbackData);
        setRankings(fallbackRankings);
      } finally {
        setLoading(false);
      }
    };

  // Effect to fetch data when date filters change
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, isAllTime, selectedMonth, selectedYear]);

  if (error) return (
    <div className="container">
      <Card className="glass border-red-500/20">
        <CardBody className="text-center py-8">
          <div className="text-red-400 text-lg mb-2 flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            {t('errorLoadingDashboard')}
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
          <p className="text-white/70">{t('loadingDashboard')}</p>
          {error && (
            <p className="text-orange-400 text-sm mt-2">
              {t('apiConnectionFailed')}
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

  const monthNames = [
    t('january'), t('february'), t('march'), t('april'),
    t('may'), t('june'), t('july'), t('august'),
    t('september'), t('october'), t('november'), t('december')
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleFilterChange = (filterType: 'allTime' | 'currentMonth' | 'custom') => {
    if (filterType === 'allTime') {
      setIsAllTime(true);
      setSelectedMonth(null);
      setSelectedYear(null);
    } else if (filterType === 'currentMonth') {
      const now = new Date();
      setIsAllTime(false);
      setSelectedMonth(now.getMonth() + 1);
      setSelectedYear(now.getFullYear());
    }
  };

  return (
    <div className="container">
      <div className="mb-8">
        <div className="flex flex-col gap-6 mb-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
              <p className="text-white/70">{t('subtitle')}</p>
            </div>
            
            {/* Modern Date Filter Controls */}
            <div className="flex flex-col gap-4 lg:max-w-md lg:min-w-[400px]">
              {/* Filter Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white/90 font-medium">
                  <div className="p-2 rounded-lg bg-primary-500/20 border border-primary-500/30">
                    <Filter size={16} className="text-primary-400" />
                  </div>
                  <span className="text-sm font-semibold tracking-wide uppercase">{t('filterBy')}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
              </div>
              
              {/* Quick Filter Buttons */}
              <div className="flex gap-2">
                <Button
                  size="md"
                  variant={isAllTime ? "solid" : "ghost"}
                  color={isAllTime ? "primary" : "default"}
                  onClick={() => handleFilterChange('allTime')}
                  className={`flex-1 transition-all duration-300 ${
                    isAllTime 
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 scale-105" 
                      : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white"
                  }`}
                  startContent={
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isAllTime ? "bg-white/90" : "bg-white/40"
                    }`} />
                  }
                >
                  {t('allTime')}
                </Button>
                
                <Button
                  size="md"
                  variant={!isAllTime && selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() ? "solid" : "ghost"}
                  color={!isAllTime && selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() ? "primary" : "default"}
                  onClick={() => handleFilterChange('currentMonth')}
                  className={`flex-1 transition-all duration-300 ${
                    !isAllTime && selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 scale-105" 
                      : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white"
                  }`}
                  startContent={
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      !isAllTime && selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() ? "bg-white/90" : "bg-white/40"
                    }`} />
                  }
                >
                  {t('currentMonth')}
                </Button>
              </div>
              
              {/* Custom Date Selection */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    size="md"
                    placeholder={t('selectMonth')}
                    selectedKeys={selectedMonth !== null ? [selectedMonth.toString()] : []}
                    onSelectionChange={(keys) => {
                      const month = Array.from(keys)[0] as string;
                      if (month) {
                        setSelectedMonth(parseInt(month));
                        setIsAllTime(false);
                      }
                    }}
                    classNames={{
                      base: "transition-all duration-300",
                      trigger: "bg-white/8 border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 backdrop-blur-sm",
                      value: "text-white font-medium",
                      popoverContent: "bg-gray-900/95 border-white/20 backdrop-blur-xl shadow-2xl",
                      listbox: "p-1",
                      listboxWrapper: "max-h-64"
                    }}
                    startContent={
                      <Calendar size={16} className="text-white/60" />
                    }
                  >
                    {monthNames.map((month, index) => (
                      <SelectItem 
                        key={(index + 1).toString()}
                        classNames={{
                          base: "rounded-lg hover:bg-white/10 transition-colors duration-200",
                          title: "text-white/90"
                        }}
                      >
                        {month}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                
                <div className="w-24">
                  <Select
                    size="md"
                    placeholder={t('selectYear')}
                    selectedKeys={selectedYear !== null ? [selectedYear.toString()] : []}
                    onSelectionChange={(keys) => {
                      const year = Array.from(keys)[0] as string;
                      if (year) {
                        setSelectedYear(parseInt(year));
                        setIsAllTime(false);
                      }
                    }}
                    classNames={{
                      base: "transition-all duration-300",
                      trigger: "bg-white/8 border-white/20 hover:bg-white/12 hover:border-white/30 transition-all duration-300 backdrop-blur-sm",
                      value: "text-white font-medium",
                      popoverContent: "bg-gray-900/95 border-white/20 backdrop-blur-xl shadow-2xl",
                      listbox: "p-1",
                      listboxWrapper: "max-h-64"
                    }}
                  >
                    {years.map((year) => (
                      <SelectItem 
                        key={year.toString()}
                        classNames={{
                          base: "rounded-lg hover:bg-white/10 transition-colors duration-200",
                          title: "text-white/90"
                        }}
                      >
                        {year.toString()}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              
              {/* Filter Status Indicator */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isAllTime ? "bg-blue-400" : "bg-green-400"
                }`} />
                <span className="text-white/60">
                  {isAllTime 
                    ? t('allTime').toLowerCase() 
                    : selectedMonth && selectedYear 
                      ? `${monthNames[selectedMonth - 1]} ${selectedYear}`
                      : t('currentMonth').toLowerCase()
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 glass p-2">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clipboard size={20} className="text-primary-400" />
              {t('activeTicketsToday')}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex overflow-x-auto gap-4 pb-2 overflow-y-visible">
              {data.inProgressToday.length === 0 && (
                <div className="w-full text-center py-8">
                  <div className="text-lg mb-2 text-green-400 font-semibold flex items-center justify-center gap-2">
                    <PartyPopper size={20} />
                    {t('great')}
                  </div>
                  <p className="text-white/70">{t('noTicketsInProgress')}</p>
                </div>
              )}
              {data.inProgressToday.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="w-[320px] h-[280px] flex-shrink-0 glass rounded-lg p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group relative border border-white/5 flex flex-col"
                  onClick={() => window.location.href = `/${locale}/tickets/${ticket.id}`}
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
                    <span>{t('inProgressFor')} {formatTimeSince(ticket.updatedAt)}</span>
                  </div>

                  {/* Latest Comment */}
                  <div className="flex-1 min-h-0 mb-4">
                    {ticket.latestComment ? (
                      <>
                        <div className="text-xs text-white/50 mb-1">{tCommon('latestComment')}</div>
                        <div className="h-[80px] bg-white/5 rounded-lg p-3 overflow-hidden relative">
                          <div className="text-sm text-white/80 leading-5 h-full overflow-hidden">
                            {(() => {
                              const cleanText = ticket.latestComment
                                .replace(/<br\s*\/?>/gi, ' ')
                                .replace(/<\/p>\s*<p>/gi, ' ')
                                .replace(/<[^>]*>/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                              
                              // Manually truncate to fit in 4 lines (approximately 160 characters)
                              return cleanText.length > 160 ? cleanText.substring(0, 160) + '...' : cleanText;
                            })()}
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
          </CardBody>
        </Card>

        <ChartCard title={t('statusDistribution')} data={toPie(data.statusCounts)} icon={<BarChart3 size={18} className="text-primary-400" />} />
        <ChartCard title={t('categoryBreakdown')} data={toPie(data.categoryCounts)} icon={<FolderOpen size={18} className="text-primary-400" />} />
        <ChartCard title={t('priorityLevels')} data={toPie(data.priorityCounts)} icon={<Zap size={18} className="text-primary-400" />} />

        {/* User Rankings Section */}
        <Card className="lg:col-span-3 glass p-2">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              {t('topPerformers')}
            </h2>
          </CardHeader>
          <CardBody>
            {rankings.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-white/50">{t('noRankings')}</p>
                <p className="text-white/30 text-sm mt-2">{t('completeTickets')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankings.slice(0, 10).map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-200 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30' 
                        : index === 1 
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
                        : index === 2
                        ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="relative">
                        <Avatar
                          src={user.profilePicture || undefined}
                          name={user.name}
                          size="md"
                          className="w-10 h-10"
                          classNames={{
                            base: "bg-gradient-to-br from-primary-400 to-primary-600",
                            name: "text-white font-medium"
                          }}
                        />
                        {/* Rank badge overlay */}
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-blue-500 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {user.rank}
                        </div>
                      </div>
                      {index === 0 && <Trophy size={20} className="text-yellow-400" />}
                      {index === 1 && <Award size={20} className="text-blue-400" />}
                      {index === 2 && <Star size={20} className="text-amber-600" />}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate text-base">{user.name}</p>
                          <p className="text-sm text-white/60 truncate">{user.role}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={`font-bold text-lg leading-tight ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-blue-400' :
                            index === 2 ? 'text-amber-500' :
                            'text-green-400'
                          }`}>
                            {user.totalPoints.toFixed(1)}
                          </p>
                          <p className="text-xs text-white/50 mt-1">{user.ticketsCompleted} {t('tickets')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
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
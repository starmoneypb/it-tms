"use client";
import { useEffect, useState, useCallback } from "react";
import { Input, Select, SelectItem, Pagination, Card, CardBody, CardHeader, Chip } from "@heroui/react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Ticket = {
  id: string; code: number; title: string; status: string; priority: string; initialType: string; createdAt: string;
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

  // Debounced search for text input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        load();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [q, load]);

  // Immediate search for status and priority changes
  useEffect(() => {
    if (page === 1) {
      load();
    } else {
      setPage(1);
    }
  }, [status, priority, load]);

  // Load data when page or pageSize changes
  useEffect(() => { load(); }, [page, pageSize]);

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Tickets</h1>
        <p className="text-white/70">Manage and track your support tickets</p>
      </div>

      <div className="space-y-6">
        <Card className="glass">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🔍 Search & Filter
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
              {["", "pending", "in_progress", "completed", "canceled"].map(s => (
                <SelectItem key={s}>{s || "Any"}</SelectItem>
              ))}
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

        <div className="space-y-3">
          {data?.data?.map((t) => (
            <Card 
              key={t.id} 
              className="glass hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
              isPressable
              onPress={() => window.location.href = `/tickets/${t.id}`}
            >
              <CardBody className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-primary-500 transition-colors mb-2">
                      #{t.code} — {t.title}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Chip 
                        size="sm" 
                        color={statusColors[t.status as keyof typeof statusColors] || "default"}
                        variant="flat"
                      >
                        {t.status.replace('_', ' ')}
                      </Chip>
                      <Chip 
                        size="sm" 
                        color={priorityColors[t.priority as keyof typeof priorityColors] || "default"}
                        variant="flat"
                      >
                        {t.priority}
                      </Chip>
                      <Chip size="sm" variant="flat" className="bg-white/10">
                        {t.initialType.replace(/_/g, ' ')}
                      </Chip>
                    </div>
                  </div>
                  <div className="text-sm text-white/60 ml-4">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-primary-400 font-medium group-hover:text-primary-300 transition-colors">
                  Click to view details →
                </div>
              </CardBody>
            </Card>
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
              <div className="text-4xl mb-4">📭</div>
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
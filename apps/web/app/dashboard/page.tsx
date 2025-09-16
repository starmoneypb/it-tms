"use client";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Summary = {
  inProgressToday: { id: string; title: string; assigneeId?: string | null }[];
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
};

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${API}/api/v1/metrics/summary`)
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return (
    <div className="container">
      <Card className="glass border-red-500/20">
        <CardBody className="text-center py-8">
          <div className="text-red-400 text-lg mb-2">⚠️ Error Loading Dashboard</div>
          <p className="text-white/70">{error}</p>
        </CardBody>
      </Card>
    </div>
  );
  
  if (!data) return (
    <div className="container">
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );

  const toPie = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, value]) => ({ name, value }));

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
        <p className="text-white/70">Monitor your IT support operations and ticket metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 glass">
          <CardHeader className="pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📋 Active Tickets Today
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex overflow-x-auto gap-4 pb-2">
              {data.inProgressToday.length === 0 && (
                <div className="w-full text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-white/70">No tickets in progress today!</p>
                </div>
              )}
              {data.inProgressToday.map((t) => (
                <div 
                  key={t.id} 
                  className="min-w-[280px] glass rounded-lg p-4 hover:scale-105 transition-transform cursor-pointer group"
                  onClick={() => window.location.href = `/tickets/${t.id}`}
                >
                  <div className="text-sm font-semibold mb-2 group-hover:text-primary-500 transition-colors">
                    {t.title}
                  </div>
                  <div className="text-xs text-white/60 mb-2">
                    Assignee: {t.assigneeId ?? "Unassigned"}
                  </div>
                  <div className="text-xs text-primary-400 font-medium">Click to view →</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <ChartCard title="Status Distribution" data={toPie(data.statusCounts)} icon="📊" />
        <ChartCard title="Category Breakdown" data={toPie(data.categoryCounts)} icon="📁" />
        <ChartCard title="Priority Levels" data={toPie(data.priorityCounts)} icon="⚡" />
      </div>
    </div>
  );
}

function ChartCard({ title, data, icon }: { title: string; data: { name: string; value: number }[]; icon: string }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon} {title}
        </h3>
      </CardHeader>
      <CardBody style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value"
              isAnimationActive={true}
              data={data}
              outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Count']}
              contentStyle={{
                backgroundColor: 'rgba(15, 22, 41, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
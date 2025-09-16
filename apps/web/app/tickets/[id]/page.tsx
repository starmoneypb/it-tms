"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Textarea, Input, Chip, Divider, Select, SelectItem } from "@heroui/react";
import { WysiwygEditor } from "@/lib/wysiwyg-editor";
import { useAuth } from "@/lib/auth";
import DOMPurify from "isomorphic-dompurify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

export default function TicketDetails() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, canEditTicket, canCancelTicket, canAssignTicket } = useAuth();
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  function load() {
    setLoading(true);
    fetch(`${API}/api/v1/tickets/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setData(j.data);
        setStatus(j.data.ticket.status);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function postComment() {
    if (!comment.trim()) return;
    await fetch(`${API}/api/v1/tickets/${id}/comments`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    setComment(""); load();
  }

  async function changeStatus() {
    if (!status.trim()) return;
    
    setStatusLoading(true);
    setStatusError("");
    
    try {
      const response = await fetch(`${API}/api/v1/tickets/${id}/status`, {
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update status");
      }
      
      // Success - reload data and clear status
      setStatus("");
      load();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white/70">Loading ticket details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container">
        <Card className="glass border-red-500/20">
          <CardBody className="text-center py-8">
            <div className="text-red-400 text-lg mb-2">⚠️ Error Loading Ticket</div>
            <p className="text-white/70">Unable to load ticket details</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const t = data.ticket;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Ticket #{t.code}</h1>
        <p className="text-white/70">{t.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold">Details</h2>
              <div className="flex items-center gap-2">
                <Chip 
                  color={statusColors[t.status as keyof typeof statusColors] || "default"}
                  variant="flat"
                >
                  {t.status.replace('_', ' ')}
                </Chip>
                <Chip 
                  color={priorityColors[t.priority as keyof typeof priorityColors] || "default"}
                  variant="flat"
                >
                  {t.priority}
                </Chip>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <div 
                className="text-white/80 leading-relaxed prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(t.description) 
                }}
              />
            </div>

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">Ticket Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-white/60 text-sm">Type:</span>
                  <div className="font-medium">{t.initialType.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Impact Score:</span>
                  <div className="font-medium">{t.impactScore}</div>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Urgency Score:</span>
                  <div className="font-medium">{t.urgencyScore}</div>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Final Score:</span>
                  <div className="font-medium">{t.finalScore}</div>
                </div>
                {t.redFlag && (
                  <div className="md:col-span-2">
                    <Chip color="danger" variant="flat" size="sm">
                      🚨 Red Flag
                    </Chip>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">Attachments</h3>
              {data.attachments && data.attachments.length > 0 ? (
                <div className="space-y-2">
                  {data.attachments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <span className="text-sm">📎</span>
                      <span className="text-sm">{a.filename}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">No attachments</p>
              )}
            </div>

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">Activity Timeline</h3>
              {data.comments && data.comments.length > 0 ? (
                <div className="space-y-3">
                  {data.comments.map((c: any) => (
                    <div key={c.id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/60">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div 
                        className="text-sm text-white/80 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(c.body) 
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">No comments yet</p>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {user && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  💬 Add Comment
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <WysiwygEditor 
                  value={comment} 
                  onChange={setComment} 
                  placeholder="Write your comment..."
                  minHeight="120px"
                />
                <Button 
                  color="primary" 
                  onPress={postComment}
                  isDisabled={!comment.trim()}
                  className="w-full"
                >
                  Post Comment
                </Button>
              </CardBody>
            </Card>
          )}

          {user && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  🔄 Change Status
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <Select 
                  label="New Status" 
                  placeholder="Select status"
                  selectedKeys={status ? [status] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setStatus(selected || "");
                  }}
                  variant="bordered"
                >
                  <SelectItem key="pending">Pending</SelectItem>
                  <SelectItem key="in_progress">In Progress</SelectItem>
                  <SelectItem key="completed">Completed</SelectItem>
                  <SelectItem key="canceled">Canceled</SelectItem>
                </Select>
                
                {statusError && (
                  <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                    ⚠️ {statusError}
                  </div>
                )}
                
                <Button 
                  color="primary" 
                  onPress={changeStatus}
                  isDisabled={!status.trim() || statusLoading}
                  isLoading={statusLoading}
                  className="w-full"
                >
                  {statusLoading ? "Updating..." : "Update Status"}
                </Button>
              </CardBody>
            </Card>
          )}

          {canAssignTicket() && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  👤 Assign Ticket
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <Button 
                  color="secondary" 
                  onPress={() => {
                    // Self-assign functionality
                    fetch(`${API}/api/v1/tickets/${id}/assign`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ self: true }),
                    }).then(() => load());
                  }}
                  className="w-full"
                >
                  Assign to Me
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
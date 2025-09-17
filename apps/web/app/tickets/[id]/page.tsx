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
  const { user, canEditTicket, canCancelTicket, canAssignTicket, canModifyTicketFields, canEditTicketContent } = useAuth();
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  
  // Ticket editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    initialType: "",
    resolvedType: "",
    priority: "",
    impactScore: "",
    urgencyScore: "",
    finalScore: "",
    redFlag: false
  });
  
  // Title and description editing state
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentEditLoading, setContentEditLoading] = useState(false);
  const [contentEditError, setContentEditError] = useState("");
  const [contentEditForm, setContentEditForm] = useState({
    title: "",
    description: ""
  });

  function load() {
    setLoading(true);
    fetch(`${API}/api/v1/tickets/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        setData(j.data);
        setStatus(j.data.ticket.status);
        // Initialize edit form with current ticket data
        const ticket = j.data.ticket;
        setEditForm({
          initialType: ticket.initialType || "",
          resolvedType: ticket.resolvedType || "",
          priority: ticket.priority || "",
          impactScore: ticket.impactScore?.toString() || "",
          urgencyScore: ticket.urgencyScore?.toString() || "",
          finalScore: ticket.finalScore?.toString() || "",
          redFlag: ticket.redFlag || false
        });
        // Initialize content edit form
        setContentEditForm({
          title: ticket.title || "",
          description: ticket.description || ""
        });
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function updateTicketFields() {
    if (!canModifyTicketFields()) return;
    
    setEditLoading(true);
    setEditError("");
    
    try {
      const payload: any = {};
      
      // Only include fields that have been changed
      if (editForm.initialType && editForm.initialType !== data.ticket.initialType) {
        payload.initialType = editForm.initialType;
      }
      if (editForm.resolvedType && editForm.resolvedType !== data.ticket.resolvedType) {
        payload.resolvedType = editForm.resolvedType;
      }
      if (editForm.priority && editForm.priority !== data.ticket.priority) {
        payload.priority = editForm.priority;
      }
      if (editForm.impactScore && parseInt(editForm.impactScore) !== data.ticket.impactScore) {
        payload.impactScore = parseInt(editForm.impactScore);
      }
      if (editForm.urgencyScore && parseInt(editForm.urgencyScore) !== data.ticket.urgencyScore) {
        payload.urgencyScore = parseInt(editForm.urgencyScore);
      }
      if (editForm.finalScore && parseInt(editForm.finalScore) !== data.ticket.finalScore) {
        payload.finalScore = parseInt(editForm.finalScore);
      }
      if (editForm.redFlag !== data.ticket.redFlag) {
        payload.redFlag = editForm.redFlag;
      }
      
      if (Object.keys(payload).length === 0) {
        setEditError("No changes detected");
        return;
      }
      
      const response = await fetch(`${API}/api/v1/tickets/${id}/fields`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update ticket fields");
      }
      
      // Success - reload data and exit edit mode
      setIsEditing(false);
      load();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update ticket fields");
    } finally {
      setEditLoading(false);
    }
  }

  async function updateTicketContent() {
    if (!canEditTicketContent(data.ticket.createdBy)) return;
    
    setContentEditLoading(true);
    setContentEditError("");
    
    try {
      const payload: any = {};
      
      // Only include fields that have been changed
      if (contentEditForm.title && contentEditForm.title !== data.ticket.title) {
        payload.title = contentEditForm.title;
      }
      if (contentEditForm.description && contentEditForm.description !== data.ticket.description) {
        payload.description = contentEditForm.description;
      }
      
      if (Object.keys(payload).length === 0) {
        setContentEditError("No changes detected");
        return;
      }
      
      const response = await fetch(`${API}/api/v1/tickets/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update ticket content");
      }
      
      // Success - reload data and exit edit mode
      setIsEditingContent(false);
      load();
    } catch (error) {
      setContentEditError(error instanceof Error ? error.message : "Failed to update ticket content");
    } finally {
      setContentEditLoading(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold gradient-text mb-2">Ticket #{t.code}</h1>
            {!isEditingContent ? (
              <p className="text-white/70">{t.title}</p>
            ) : (
              <Input
                value={contentEditForm.title}
                onChange={(e) => setContentEditForm(prev => ({ ...prev, title: e.target.value }))}
                variant="bordered"
                className="max-w-md"
                placeholder="Ticket title"
              />
            )}
          </div>
          {canEditTicketContent(t.createdBy) && (
            <div className="flex gap-2">
              {!isEditingContent ? (
                <Button
                  color="primary"
                  variant="bordered"
                  size="sm"
                  onPress={() => setIsEditingContent(true)}
                >
                  Edit Content
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    size="sm"
                    onPress={updateTicketContent}
                    isLoading={contentEditLoading}
                    isDisabled={contentEditLoading}
                  >
                    Save
                  </Button>
                  <Button
                    color="default"
                    variant="bordered"
                    size="sm"
                    onPress={() => {
                      setIsEditingContent(false);
                      setContentEditError("");
                      // Reset form to original values
                      setContentEditForm({
                        title: t.title,
                        description: t.description
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        {contentEditError && (
          <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg mt-2">
            ⚠️ {contentEditError}
          </div>
        )}
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
              {!isEditingContent ? (
                <div 
                  className="text-white/80 leading-relaxed prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(t.description) 
                  }}
                />
              ) : (
                <WysiwygEditor 
                  value={contentEditForm.description} 
                  onChange={(value) => setContentEditForm(prev => ({ ...prev, description: value }))} 
                  placeholder="Enter ticket description..."
                  minHeight="200px"
                />
              )}
            </div>

            {/* Steps to Reproduce section for Issue Reports */}
            {t.initialType === 'ISSUE_REPORT' && t.details?.steps && (
              <>
                <Divider />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Steps to Reproduce</h3>
                  <div 
                    className="text-white/80 leading-relaxed prose prose-invert prose-sm max-w-none bg-white/5 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(t.details.steps) 
                    }}
                  />
                </div>
              </>
            )}

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
                        {c.authorName && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white/90">
                              {c.authorName}
                            </span>
                            {c.authorRole && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                c.authorRole === 'Manager' ? 'bg-purple-500/20 text-purple-300' :
                                c.authorRole === 'Supervisor' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {c.authorRole}
                              </span>
                            )}
                          </div>
                        )}
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

          {canModifyTicketFields() && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  ⚙️ Edit Ticket Fields
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {!isEditing ? (
                  <Button 
                    color="primary" 
                    variant="bordered"
                    onPress={() => setIsEditing(true)}
                    className="w-full"
                  >
                    Edit Fields
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Select 
                        label="Initial Type" 
                        placeholder="Select type"
                        selectedKeys={editForm.initialType ? [editForm.initialType] : []}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setEditForm(prev => ({ ...prev, initialType: selected || "" }));
                        }}
                        variant="bordered"
                        size="sm"
                      >
                        <SelectItem key="ISSUE_REPORT">Issue Report</SelectItem>
                        <SelectItem key="CHANGE_REQUEST_NORMAL">Change Request Normal</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_DATA_CORRECTION">Service Request Data Correction</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_DATA_EXTRACTION">Service Request Data Extraction</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_ADVISORY">Service Request Advisory</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_GENERAL">Service Request General</SelectItem>
                      </Select>

                      <Select 
                        label="Resolved Type" 
                        placeholder="Select resolved type"
                        selectedKeys={editForm.resolvedType ? [editForm.resolvedType] : []}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setEditForm(prev => ({ ...prev, resolvedType: selected || "" }));
                        }}
                        variant="bordered"
                        size="sm"
                      >
                        <SelectItem key="EMERGENCY_CHANGE">Emergency Change</SelectItem>
                        <SelectItem key="DATA_CORRECTION">Data Correction</SelectItem>
                      </Select>

                      <Select 
                        label="Priority" 
                        placeholder="Select priority"
                        selectedKeys={editForm.priority ? [editForm.priority] : []}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setEditForm(prev => ({ ...prev, priority: selected || "" }));
                        }}
                        variant="bordered"
                        size="sm"
                      >
                        <SelectItem key="P0">P0 - Critical</SelectItem>
                        <SelectItem key="P1">P1 - High</SelectItem>
                        <SelectItem key="P2">P2 - Medium</SelectItem>
                        <SelectItem key="P3">P3 - Low</SelectItem>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Impact Score"
                          type="number"
                          value={editForm.impactScore}
                          onChange={(e) => setEditForm(prev => ({ ...prev, impactScore: e.target.value }))}
                          variant="bordered"
                          size="sm"
                        />
                        <Input
                          label="Urgency Score"
                          type="number"
                          value={editForm.urgencyScore}
                          onChange={(e) => setEditForm(prev => ({ ...prev, urgencyScore: e.target.value }))}
                          variant="bordered"
                          size="sm"
                        />
                      </div>

                      <Input
                        label="Final Score"
                        type="number"
                        value={editForm.finalScore}
                        onChange={(e) => setEditForm(prev => ({ ...prev, finalScore: e.target.value }))}
                        variant="bordered"
                        size="sm"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="redFlag"
                          checked={editForm.redFlag}
                          onChange={(e) => setEditForm(prev => ({ ...prev, redFlag: e.target.checked }))}
                          className="rounded"
                        />
                        <label htmlFor="redFlag" className="text-sm text-white/80">
                          Red Flag
                        </label>
                      </div>
                    </div>

                    {editError && (
                      <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                        ⚠️ {editError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        color="primary" 
                        onPress={updateTicketFields}
                        isDisabled={editLoading}
                        isLoading={editLoading}
                        className="flex-1"
                        size="sm"
                      >
                        {editLoading ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button 
                        color="default" 
                        variant="bordered"
                        onPress={() => {
                          setIsEditing(false);
                          setEditError("");
                        }}
                        className="flex-1"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
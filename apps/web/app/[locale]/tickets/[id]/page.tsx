"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Textarea, Input, Chip, Divider, Select, SelectItem, Checkbox } from "@heroui/react";
import { WysiwygEditor } from "@/lib/wysiwyg-editor";
import { useAuth } from "@/lib/auth";
import { computePriority, PriorityInput } from "@/lib/priority";
import UserSearchSelect from "@/components/UserSearchSelect";
import DOMPurify from "isomorphic-dompurify";
import { useTranslations, useLocale } from 'next-intl';
import { 
  AlertTriangle, 
  Paperclip, 
  MessageSquare, 
  RotateCcw, 
  Users, 
  Flag,
  Settings
} from "lucide-react";

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
  const t = useTranslations('ticketDetails');
  const tCommon = useTranslations('common');
  const tTickets = useTranslations('tickets');
  const tStatus = useTranslations('statusOptions');
  const tTypes = useTranslations('typeOptions');
  const tResolvedTypes = useTranslations('resolvedTypeOptions');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, canEditTicket, canCancelTicket, canAssignTicket, canModifyTicketFields, canEditTicketContent } = useAuth();
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
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
    priorityInput: { redFlags: {}, impact: {}, urgency: "none" } as PriorityInput
  });
  
  // Title and description editing state
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentEditLoading, setContentEditLoading] = useState(false);
  const [contentEditError, setContentEditError] = useState("");
  
  // Assignment state
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
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
        
        // Reconstruct priority input from stored data (if available) or use defaults
        const priorityInput: PriorityInput = {
          redFlags: ticket.priorityInput?.redFlags || {},
          impact: ticket.priorityInput?.impact || {},
          urgency: ticket.priorityInput?.urgency || "none"
        };
        
        setEditForm({
          initialType: ticket.initialType || "",
          resolvedType: ticket.resolvedType || "",
          priorityInput
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
      // Compute priority from the input
      const pr = computePriority(editForm.priorityInput);
      
      const payload: any = {};
      
      // Only include fields that have been changed
      if (editForm.initialType && editForm.initialType !== data.ticket.initialType) {
        payload.initialType = editForm.initialType;
      }
      if (editForm.resolvedType && editForm.resolvedType !== data.ticket.resolvedType) {
        payload.resolvedType = editForm.resolvedType;
      }
      
      // Always update priority fields when editing (they are computed from the checklist)
      payload.priorityInput = editForm.priorityInput;
      payload.priority = pr.priority;
      payload.impactScore = pr.impact;
      payload.urgencyScore = pr.urgency;
      payload.finalScore = pr.final;
      payload.redFlag = pr.redFlag;
      
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
    
    try {
      // Create comment first
      const res = await fetch(`${API}/api/v1/tickets/${id}/comments`, {
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment }),
      });
      
      if (!res.ok) {
        alert("Failed to post comment");
        return;
      }
      
      // Always consume the response to get the comment ID
      const response = await res.json();
      
      // Upload files if any
      if (commentFiles.length > 0) {
        const commentId = response.data.commentId;
        
        const formData = new FormData();
        commentFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const uploadRes = await fetch(`${API}/api/v1/tickets/${id}/comments/${commentId}/attachments`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.text();
          console.error("Failed to upload comment attachments:", errorData);
          alert("Comment posted successfully, but some attachments failed to upload. Please try adding them again.");
        }
      }
      
      setComment("");
      setCommentFiles([]);
      load();
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment");
    }
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
            <p className="text-white/70">{t('loadingTicket')}</p>
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
            <div className="text-red-400 text-lg mb-2 flex items-center justify-center gap-2">
              <AlertTriangle size={20} />
              {t('errorLoadingTicket')}
            </div>
            <p className="text-white/70">{t('unableToLoadTicket')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const ticket = data.ticket;

  return (
    <div className="container">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold gradient-text mb-2">Ticket #{ticket.code}</h1>
            {!isEditingContent ? (
              <p className="text-white/70">{ticket.title}</p>
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
          {canEditTicketContent(ticket.createdBy) && (
            <div className="flex gap-2">
              {!isEditingContent ? (
                <Button
                  color="primary"
                  variant="bordered"
                  size="sm"
                  onPress={() => setIsEditingContent(true)}
                >
                  {t('editContent')}
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
                    {t('save')}
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
                        title: ticket.title,
                        description: ticket.description
                      });
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        {contentEditError && (
          <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg mt-2">
            <AlertTriangle size={14} className="inline mr-1" />
            {contentEditError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass p-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold">{t('details')}</h2>
              <div className="flex items-center gap-2">
                <Chip 
                  color={statusColors[ticket.status as keyof typeof statusColors] || "default"}
                  variant="flat"
                >
                  {ticket.status.replace('_', ' ')}
                </Chip>
                <Chip 
                  color={priorityColors[ticket.priority as keyof typeof priorityColors] || "default"}
                  variant="flat"
                >
                  {ticket.priority}
                </Chip>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('description')}</h3>
              {!isEditingContent ? (
                <div 
                  className="text-white/80 leading-relaxed prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(ticket.description) 
                  }}
                />
              ) : (
                <WysiwygEditor 
                  value={contentEditForm.description} 
                  onChange={(value) => setContentEditForm(prev => ({ ...prev, description: value }))} 
                  placeholder={t('enterTicketDescription')}
                  minHeight="200px"
                />
              )}
            </div>

            {/* Ticket Attachments */}
            {data.attachments && data.attachments.length > 0 && (
              <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Paperclip size={18} className="text-primary-400" />
                      {t('attachments')}
                    </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={`${API}/api/v1/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        <Paperclip size={20} className="text-primary-400 group-hover:text-primary-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white/90 truncate">{att.filename}</p>
                        <p className="text-xs text-white/60">
                          {(att.size / 1024 / 1024).toFixed(2)} MB • {att.mime}
                          {att.mime === 'application/pdf' && (
                            <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">PDF</span>
                          )}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Divider />

            {/* Ticket Metadata */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('ticketInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">{t('ticketId')}:</span>
                  <span className="ml-2 font-medium">#{ticket.code}</span>
                </div>
                <div>
                  <span className="text-white/60">{t('created')}:</span>
                  <span className="ml-2">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-white/60">{t('lastUpdated')}:</span>
                  <span className="ml-2">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-white/60">{t('type')}:</span>
                  <span className="ml-2">{ticket.initialType.replace(/_/g, ' ')}</span>
                </div>
                {ticket.assignees && ticket.assignees.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-white/60">{t('assignedTo')}:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticket.assignees.map((assignee: any) => (
                        <div key={assignee.id} className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                            {assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{assignee.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignee.role === 'Manager' ? 'bg-purple-500/20 text-purple-300' :
                            assignee.role === 'Supervisor' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {assignee.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Steps to Reproduce section for Issue Reports */}
            {ticket.initialType === 'ISSUE_REPORT' && ticket.details?.steps && (
              <>
                <Divider />
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('stepsToReproduce')}</h3>
                  <div 
                    className="text-white/80 leading-relaxed prose prose-invert prose-sm max-w-none bg-white/5 p-6 rounded-lg"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(ticket.details.steps) 
                    }}
                  />
                </div>
              </>
            )}

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">{t('ticketInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <span className="text-white/60 text-sm">{t('type')}:</span>
                  <div className="font-medium">{ticket.initialType.replace(/_/g, ' ')}</div>
                </div>
                <div>
                    <span className="text-white/60 text-sm">{t('impactScore')}:</span>
                  <div className="font-medium">{Math.abs(ticket.impactScore)}</div>
                </div>
                <div>
                    <span className="text-white/60 text-sm">{t('urgencyScore')}:</span>
                  <div className="font-medium">{Math.abs(ticket.urgencyScore)}</div>
                </div>
                <div>
                    <span className="text-white/60 text-sm">{t('finalScore')}:</span>
                  <div className="font-medium">{Math.abs(ticket.finalScore)}</div>
                </div>
                {ticket.redFlag && (
                  <div className="md:col-span-2">
                    <Chip color="danger" variant="flat" size="sm">
                      <Flag size={14} className="mr-1" />
                      {t('redFlag')}
                    </Chip>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">{t('attachments')}</h3>
              {data.attachments && data.attachments.length > 0 ? (
                <div className="space-y-2">
                  {data.attachments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                      <Paperclip size={14} className="text-gray-400" />
                      <span className="text-sm">{a.filename}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">{t('noAttachments')}</p>
              )}
            </div>

            <Divider />

            <div>
              <h3 className="text-lg font-semibold mb-3">{t('activityTimeline')}</h3>
              {data.comments && data.comments.length > 0 ? (
                <div className="space-y-3">
                  {data.comments.map((c: any) => (
                    <div key={c.id} className="p-4 bg-white/5 rounded-lg">
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
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="text-xs font-medium text-white/60">{t('attachmentsColon')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {c.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={`${API}/api/v1/comment-attachments/${att.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                              >
                                <Paperclip size={14} />
                                <span>{att.filename}</span>
                                <span className="text-white/60">({(att.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">{t('noComments')}</p>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {user && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary-400" />
                  {t('addComment')}
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <WysiwygEditor 
                  value={comment} 
                  onChange={setComment} 
                  placeholder={t('writeComment')}
                  minHeight="120px"
                />
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">{t('attachments')}</label>
                  <input 
                    type="file" 
                    multiple 
                    onChange={(e) => setCommentFiles(Array.from(e.target.files || []))}
                    className="w-full p-2 border border-white/20 rounded-lg bg-white/5 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
                  />
                  {commentFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {commentFiles.map((file, index) => (
                        <div key={index} className="text-sm text-white/70 flex items-center justify-between bg-white/5 p-2 rounded">
                          <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button 
                            type="button"
                            onClick={() => setCommentFiles(commentFiles.filter((_, i) => i !== index))}
                            className="text-red-400 hover:text-red-300"
                          >
                            {t('remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  color="primary" 
                  onPress={postComment}
                  isDisabled={!comment.trim()}
                  className="w-full"
                >
                  {t('postComment')}
                </Button>
              </CardBody>
            </Card>
          )}

          {user && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <RotateCcw size={18} className="text-primary-400" />
                  {t('changeStatus')}
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <Select 
                  label={t('newStatus')} 
                  placeholder={t('selectStatus')}
                  selectedKeys={status ? [status] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setStatus(selected || "");
                  }}
                  variant="bordered"
                >
                  <SelectItem key="pending">{tStatus('pending')}</SelectItem>
                  <SelectItem key="in_progress">{tStatus('in_progress')}</SelectItem>
                  <SelectItem key="completed">{tStatus('completed')}</SelectItem>
                  <SelectItem key="canceled">{tStatus('canceled')}</SelectItem>
                </Select>
                
                {statusError && (
                      <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">
                    <AlertTriangle size={14} className="inline mr-1" />
                    {statusError}
                  </div>
                )}
                
                <Button 
                  color="primary" 
                  onPress={changeStatus}
                  isDisabled={!status.trim() || statusLoading}
                  isLoading={statusLoading}
                  className="w-full"
                >
                  {statusLoading ? t('updating') : t('updateStatus')}
                </Button>
              </CardBody>
            </Card>
          )}

          {canAssignTicket() && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users size={18} className="text-primary-400" />
                  {t('manageAssignments')}
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Current Assignees */}
                {data.ticket.assignees && data.ticket.assignees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white/80 mb-2">{t('currentAssignees')}:</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.ticket.assignees.map((assignee: any) => (
                        <div key={assignee.id} className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                            {assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{assignee.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignee.role === 'Manager' ? 'bg-purple-500/20 text-purple-300' :
                            assignee.role === 'Supervisor' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {assignee.role}
                          </span>
                          {(canModifyTicketFields() || user?.id === assignee.id) && (
                            <Button
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={async () => {
                                await fetch(`${API}/api/v1/tickets/${id}/assign`, {
                                  method: "DELETE",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ assigneeIds: [assignee.id] }),
                                });
                                load();
                              }}
                              className="min-w-0 w-6 h-6 p-0"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Self-Assign */}
                <Button 
                  color="secondary" 
                  variant="flat"
                  onPress={async () => {
                    await fetch(`${API}/api/v1/tickets/${id}/assign`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ self: true }),
                    });
                    load();
                  }}
                  className="w-full"
                >
                  {t('assignToMe')}
                </Button>

                {/* Multi-User Assignment (Supervisors/Managers only) */}
                {canModifyTicketFields() && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white/80">{t('assignMultipleUsers')}:</h4>
                    <UserSearchSelect
                      selectedUserIds={selectedAssignees}
                      onSelectionChange={setSelectedAssignees}
                      placeholder={t('searchUsersToAssign')}
                      excludeUserIds={data.ticket.assignees?.map((a: any) => a.id) || []}
                    />
                    <Button
                      color="primary"
                      onPress={async () => {
                        if (selectedAssignees.length > 0) {
                          await fetch(`${API}/api/v1/tickets/${id}/assign`, {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ assigneeIds: selectedAssignees }),
                          });
                          setSelectedAssignees([]);
                          load();
                        }
                      }}
                      isDisabled={selectedAssignees.length === 0}
                      className="w-full"
                    >
                      {t('assignSelectedUsers')}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {canModifyTicketFields() && (
            <Card className="glass">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings size={18} className="text-primary-400" />
                  {t('editTicketFields')}
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {!isEditing ? (
                  <Button 
                    color="primary" 
                    onPress={() => setIsEditing(true)}
                    className="w-full"
                  >
                    {t('editFields')}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Select 
                        label={t('initialType')} 
                        placeholder={t('selectType')}
                        selectedKeys={editForm.initialType ? [editForm.initialType] : []}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setEditForm(prev => ({ ...prev, initialType: selected || "" }));
                        }}
                        variant="bordered"
                        size="sm"
                      >
                        <SelectItem key="ISSUE_REPORT">{tTypes('ISSUE_REPORT')}</SelectItem>
                        <SelectItem key="CHANGE_REQUEST_NORMAL">{tTypes('CHANGE_REQUEST_NORMAL')}</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_DATA_CORRECTION">{tTypes('SERVICE_REQUEST_DATA_CORRECTION')}</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_DATA_EXTRACTION">{tTypes('SERVICE_REQUEST_DATA_EXTRACTION')}</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_ADVISORY">{tTypes('SERVICE_REQUEST_ADVISORY')}</SelectItem>
                        <SelectItem key="SERVICE_REQUEST_GENERAL">{tTypes('SERVICE_REQUEST_GENERAL')}</SelectItem>
                      </Select>

                      <Select 
                        label={t('resolvedType')} 
                        placeholder={t('selectResolvedType')}
                        selectedKeys={editForm.resolvedType ? [editForm.resolvedType] : []}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setEditForm(prev => ({ ...prev, resolvedType: selected || "" }));
                        }}
                        variant="bordered"
                        size="sm"
                      >
                        <SelectItem key="EMERGENCY_CHANGE">{tResolvedTypes('EMERGENCY_CHANGE')}</SelectItem>
                        <SelectItem key="DATA_CORRECTION">{tResolvedTypes('DATA_CORRECTION')}</SelectItem>
                      </Select>

                      {/* Priority Assessment Section */}
                      <div className="space-y-4 p-4 border border-white/20 rounded-lg">
                        <h4 className="text-lg font-semibold">{t('priorityAssessment')}</h4>
                        
                        {/* Red Flags */}
                        <div>
                          <h5 className="text-sm font-medium text-white/80 mb-2">{t('redFlagsCriticalIssues')}</h5>
                          <p className="text-xs text-white/60 mb-2">{t('multipleSelectionsAllowed')}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.redFlags?.outage} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  redFlags: {...prev.priorityInput.redFlags, outage: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('systemOutage')}
                            </Checkbox>
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.redFlags?.paymentsFailing} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  redFlags: {...prev.priorityInput.redFlags, paymentsFailing: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('paymentFailure')}
                            </Checkbox>
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.redFlags?.securityBreach} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  redFlags: {...prev.priorityInput.redFlags, securityBreach: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('securityBreach')}
                            </Checkbox>
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.redFlags?.nonCompliance} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  redFlags: {...prev.priorityInput.redFlags, nonCompliance: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('nonCompliance')}
                            </Checkbox>
                          </div>
                        </div>

                        {/* Impact Assessment */}
                        <div>
                          <h5 className="text-sm font-medium text-white/80 mb-2">{t('impact0to6')}</h5>
                          <p className="text-xs text-white/60 mb-2">{t('multipleSelectionsAllowedImpact')}</p>
                          <div className="grid grid-cols-1 gap-2">
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.impact?.lostRevenue} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  impact: {...prev.priorityInput.impact, lostRevenue: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('lostRevenue')}
                            </Checkbox>
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.impact?.coreProcesses} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  impact: {...prev.priorityInput.impact, coreProcesses: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('coreProcesses')}
                            </Checkbox>
                            <Checkbox 
                              isSelected={!!editForm.priorityInput.impact?.dataLoss} 
                              onValueChange={(v) => setEditForm(prev => ({
                                ...prev, 
                                priorityInput: {
                                  ...prev.priorityInput, 
                                  impact: {...prev.priorityInput.impact, dataLoss: v}
                                }
                              }))}
                              className="text-white"
                              size="sm"
                            >
                              {t('dataLoss')}
                            </Checkbox>
                          </div>
                        </div>

                        {/* Urgency Timeline */}
                        <div>
                          <h5 className="text-sm font-medium text-white/80 mb-2">{t('urgency0to4')}</h5>
                          <p className="text-xs text-white/60 mb-2">{t('singleSelectionOnly')}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: "<=48h", label: t('deadline48h'), score: 4 },
                              { value: "3-7d", label: t('deadline3to7d'), score: 3 },
                              { value: "8-30d", label: t('deadline8to30d'), score: 2 },
                              { value: ">=31d", label: t('deadline31dPlus'), score: 1 },
                              { value: "none", label: t('noDeadline'), score: 0 }
                            ].map((u) => (
                              <Button 
                                key={u.value} 
                                onPress={() => setEditForm(prev => ({
                                  ...prev, 
                                  priorityInput: {
                                    ...prev.priorityInput, 
                                    urgency: u.value as any
                                  }
                                }))} 
                                color="default"
                                variant="bordered"
                                size="sm"
                                className={`transition-all duration-200 ${
                                  editForm.priorityInput.urgency === u.value 
                                    ? "!bg-primary-600 !text-white border-primary-500 shadow-lg scale-105 font-semibold hover:!bg-primary-700 focus:!bg-primary-600" 
                                    : "hover:scale-102 hover:bg-default-100"
                                }`}
                              >
                                {u.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Priority Calculation Display */}
                        <div className="p-3 bg-white/5 rounded-lg border border-primary-500/20">
                          <h5 className="text-sm font-semibold mb-1">{t('priorityCalculation')}</h5>
                          {(() => {
                            const pr = computePriority(editForm.priorityInput);
                            return (
                              <div className="text-xs space-y-1">
                                <div>Red Flags: {pr.redFlag ? 10 : 0}/10 • Impact: {pr.impact}/6 • Urgency: {pr.urgency}/4 • Final: {pr.final}/10</div>
                                <div className="text-white/60">
                                  {t('newScoringSystem')}
                                </div>
                                <div className="font-semibold text-primary-400">
                                  {t('priority')}: {pr.priority} {pr.redFlag ? `(${t('redFlag')})` : ""}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {editError && (
                      <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">
                        <AlertTriangle size={14} className="inline mr-1" />
                        {editError}
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
                        {editLoading ? t('saving') : t('saveChanges')}
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
                        {t('cancel')}
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
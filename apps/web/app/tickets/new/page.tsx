"use client";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Textarea, Checkbox, Progress } from "@heroui/react";
import { computePriority, PriorityInput } from "@/lib/priority";
import { WysiwygEditor } from "@/lib/wysiwyg-editor";
import { useAuth } from "@/lib/auth";
import { 
  AlertTriangle, 
  Plus, 
  Bug, 
  Settings, 
  RotateCcw, 
  Edit3, 
  Database, 
  HelpCircle, 
  FileText, 
  Zap, 
  ClipboardList 
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Draft = {
  step: number;
  isAbnormal?: boolean | null;
  type?: string;
  title?: string;
  description?: string;
  details?: Record<string, any>;
  contactEmail?: string;
  contactPhone?: string;
  files?: File[];
  priority: PriorityInput;
  redFlagsData?: Record<string, any>;
  impactAssessmentData?: Record<string, any>;
  urgencyTimelineData?: Record<string, any>;
};

const initialDraft: Draft = {
  step: 1,
  isAbnormal: null,
  priority: { redFlags: {}, impact: {}, urgency: "none" }
};

const steps = [
  { number: 1, title: "Issue Type", description: "Determine if this is an abnormal system issue" },
  { number: 2, title: "Ticket Details", description: "Provide specific information about your request" },
  { number: 3, title: "Additional Info", description: "Add title, description, and attachments" },
  { number: 4, title: "Priority & Submit", description: "Set priority level and submit your ticket" }
];

export default function NewTicket() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const { user, canCreateTicketType } = useAuth();

  const pr = computePriority(draft.priority);

  async function submit() {
    setSubmitting(true);
    try {
      const initialType =
        draft.type ||
        (draft.isAbnormal
          ? "ISSUE_REPORT"
          : "SERVICE_REQUEST_GENERAL");
      const payload = {
        title: draft.title || "Untitled",
        description: draft.description || "",
        initialType,
        details: draft.details || {},
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
        priorityInput: draft.priority,
        redFlagsData: {
          criticalIssues: draft.priority.redFlags,
          description: "Initial red flags assessment during ticket creation"
        },
        impactAssessmentData: {
          impacts: draft.priority.impact,
          score: pr.impact,
          description: "Initial impact assessment during ticket creation"
        },
        urgencyTimelineData: {
          timeline: draft.priority.urgency,
          score: pr.urgency,
          description: "Initial urgency timeline assessment during ticket creation"
        },
      };
      
      // Create ticket first
      const res = await fetch(`${API}/api/v1/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        alert("Failed to submit ticket");
        return;
      }
      
      const { data } = await res.json();
      const ticketId = data.id;
      
      // Upload files if any
      if (draft.files && draft.files.length > 0) {
        const formData = new FormData();
        draft.files.forEach(file => {
          formData.append('files', file);
        });
        
        const uploadRes = await fetch(`${API}/api/v1/tickets/${ticketId}/attachments`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.text();
          console.error("Failed to upload attachments:", errorData);
          alert("Ticket created successfully, but some attachments failed to upload. Please try adding them again from the ticket page.");
        }
      }
      
      // Redirect after all uploads are complete
      window.location.href = `/tickets/${ticketId}`;
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert("Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((draft.step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Create New Ticket</h1>
        <p className="text-white/70">Submit a new support request or issue report</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass p-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold">Ticket Creation Wizard</h2>
              <div className="text-sm text-white/60">
                Step {draft.step} of {steps.length}
              </div>
            </div>
            <Progress 
              value={progress} 
              className="w-full mt-2"
              color="primary"
              size="sm"
            />
          </CardHeader>
          <CardBody className="space-y-6">
            {draft.step === 1 && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">What type of issue are you experiencing?</h3>
                  <p className="text-white/70 mb-6">This helps us route your ticket to the right team</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <Button 
                    color={draft.isAbnormal === true ? "primary" : "default"} 
                    variant={draft.isAbnormal === true ? "solid" : "flat"}
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-105"
                    onPress={() => setDraft({ ...draft, isAbnormal: true, step: 2, type: "ISSUE_REPORT" })}
                  >
                    <AlertTriangle size={24} className="text-red-400 mb-1" />
                    <div className="font-semibold text-sm mb-1">System Issue</div>
                    <div className="text-xs opacity-70 text-center px-2">Something is broken</div>
                  </Button>
                  <Button 
                    color={draft.isAbnormal === false ? "primary" : "default"} 
                    variant={draft.isAbnormal === false ? "solid" : "flat"}
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-105"
                    onPress={() => setDraft({ ...draft, isAbnormal: false, step: 2 })}
                  >
                    <Plus size={24} className="text-blue-400 mb-1" />
                    <div className="font-semibold text-sm mb-1">Service Request</div>
                    <div className="text-xs opacity-70 text-center px-2">Need assistance</div>
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 2 && draft.isAbnormal === true && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Issue Report Details</h3>
                  <p className="text-white/70 mb-6">Please provide detailed information about the problem</p>
                </div>
                <div className="space-y-4">
                  <WysiwygEditor 
                    label="Problem Description" 
                    placeholder="Describe the issue in detail..."
                    value={draft.description || ""} 
                    onChange={(v)=>setDraft({...draft, description: v})}
                    minHeight="120px"
                  />
                  <WysiwygEditor 
                    label="Steps to Reproduce" 
                    placeholder="How can we reproduce this issue?"
                    value={(draft.details?.steps)|| ""} 
                    onChange={(v)=>setDraft({...draft, details: {...(draft.details||{}), steps: v}})}
                    minHeight="100px"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Contact Email" 
                      placeholder="your@email.com"
                      variant="flat" 
                      value={draft.contactEmail||""} 
                      onValueChange={(v)=>setDraft({...draft, contactEmail: v})}
                      isRequired={!user}
                      description={!user ? "Required for anonymous users" : ""}
                    />
                    <Input 
                      label="Contact Phone" 
                      placeholder="+1 (555) 123-4567"
                      variant="flat" 
                      value={draft.contactPhone||""} 
                      onValueChange={(v)=>setDraft({...draft, contactPhone: v})}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onPress={()=>setDraft({...draft, step: 3})} color="primary" size="lg">
                    Continue
                  </Button>
                  <Button onPress={()=>setDraft({...draft, step: 1})} variant="flat" size="lg">
                    Back
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 2 && draft.isAbnormal === false && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">What type of service do you need?</h3>
                  <p className="text-white/70 mb-6">Select the most appropriate category</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {canCreateTicketType("CHANGE_REQUEST_NORMAL") && (
                    <Button 
                      onPress={()=>setDraft({...draft, type: "CHANGE_REQUEST_NORMAL", step: 3})}
                      variant="flat"
                      size="lg"
                      className="h-32 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <RotateCcw size={24} className="text-yellow-400 mb-1" />
                      <div className="font-semibold text-sm mb-1">Normal Change</div>
                      <div className="text-xs opacity-70 text-center px-2">System modifications</div>
                    </Button>
                  )}
                  {canCreateTicketType("SERVICE_REQUEST_DATA_CORRECTION") && (
                    <Button 
                      onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_DATA_CORRECTION", step: 3})}
                      variant="flat"
                      size="lg"
                      className="h-32 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <Edit3 size={24} className="text-green-400 mb-1" />
                      <div className="font-semibold text-sm mb-1">Data Correction</div>
                      <div className="text-xs opacity-70 text-center px-2">Fix incorrect data</div>
                    </Button>
                  )}
                  {canCreateTicketType("SERVICE_REQUEST_DATA_EXTRACTION") && (
                    <Button 
                      onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_DATA_EXTRACTION", step: 3})}
                      variant="flat"
                      size="lg"
                      className="h-32 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <Database size={24} className="text-blue-400 mb-1" />
                      <div className="font-semibold text-sm mb-1">Data Extraction</div>
                      <div className="text-xs opacity-70 text-center px-2">Export or retrieve data</div>
                    </Button>
                  )}
                  {canCreateTicketType("SERVICE_REQUEST_ADVISORY") && (
                    <Button 
                      onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_ADVISORY", step: 3})}
                      variant="flat"
                      size="lg"
                      className="h-32 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <HelpCircle size={24} className="text-orange-400 mb-1" />
                      <div className="font-semibold text-sm mb-1">Advisory</div>
                      <div className="text-xs opacity-70 text-center px-2">Expert consultation</div>
                    </Button>
                  )}
                  {canCreateTicketType("SERVICE_REQUEST_GENERAL") && (
                    <Button 
                      onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_GENERAL", step: 3})}
                      variant="flat"
                      size="lg"
                      className="h-32 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-[1.02] md:col-span-2"
                    >
                      <Settings size={24} className="text-gray-400 mb-1" />
                      <div className="font-semibold text-sm mb-1">General Request</div>
                      <div className="text-xs opacity-70 text-center px-2">Other support needs</div>
                    </Button>
                  )}
                </div>
                <Button onPress={()=>setDraft({...draft, step: 1})} variant="flat" size="lg">
                  Back
                </Button>
              </section>
            )}

            {draft.step === 3 && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Additional Information</h3>
                  <p className="text-white/70 mb-6">Provide a title and detailed description</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    label="Ticket Title" 
                    placeholder="Brief summary of your request"
                    variant="flat" 
                    value={draft.title || ""} 
                    onValueChange={(v)=>setDraft({...draft, title: v})}
                  />
                  <WysiwygEditor 
                    label="Description" 
                    placeholder="Provide detailed information about your request..."
                    value={draft.description || ""} 
                    onChange={(v)=>setDraft({...draft, description: v})}
                    minHeight="150px"
                  />
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Attachments</label>
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setDraft({...draft, files: Array.from(e.target.files || [])})}
                      className="w-full p-2 border border-white/20 rounded-lg bg-white/5 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
                    />
                    {draft.files && draft.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {draft.files.map((file, index) => (
                          <div key={index} className="text-sm text-white/70 flex items-center justify-between bg-white/5 p-2 rounded">
                            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button 
                              type="button"
                              onClick={() => setDraft({...draft, files: draft.files?.filter((_, i) => i !== index)})}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onPress={()=>setDraft({...draft, step: 4})} color="primary" size="lg">
                    Continue
                  </Button>
                  <Button onPress={()=>setDraft({...draft, step: 2})} variant="flat" size="lg">
                    Back
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 4 && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Priority Assessment</h3>
                  <p className="text-white/70 mb-6">Help us prioritize your ticket</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Red Flags (Critical Issues) (0/10)</h4>
                    <p className="text-sm text-white/70 mb-3">Multiple selections allowed. If any item is selected, full 10 points immediately.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.outage} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, outage: v}}})}
                        className="text-white"
                      >
                        System outage affecting a wide range of users
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.paymentsFailing} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, paymentsFailing: v}}})}
                        className="text-white"
                      >
                        Payment failure / unable to process payments
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.securityBreach} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, securityBreach: v}}})}
                        className="text-white"
                      >
                        Severe security issue / data breach
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.nonCompliance} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, nonCompliance: v}}})}
                        className="text-white"
                      >
                        Non-compliance with laws / regulations / contracts
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Impact (0/6)</h4>
                    <p className="text-sm text-white/70 mb-3">Multiple selections allowed. 2 points each, maximum 6 points.</p>
                    <div className="grid grid-cols-1 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.lostRevenue} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, lostRevenue: v}}})}
                        className="text-white"
                      >
                        Company loses revenue opportunities (2)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.coreProcesses} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, coreProcesses: v}}})}
                        className="text-white"
                      >
                        Core business processes disrupted or halted (2)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.dataLoss} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, dataLoss: v}}})}
                        className="text-white"
                      >
                        Data loss / corruption / duplication, difficult to recover (2)
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Urgency (0/4)</h4>
                    <p className="text-sm text-white/70 mb-3">Single selection only.</p>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { value: "<=48h", label: "Deadline ≤48 hours (4)", score: 4 },
                        { value: "3-7d", label: "Deadline 3–7 days (3)", score: 3 },
                        { value: "8-30d", label: "Deadline 8–30 days (2)", score: 2 },
                        { value: ">=31d", label: "Deadline ≥31 days (1)", score: 1 },
                        { value: "none", label: "No deadline (0)", score: 0 }
                      ].map((u) => (
                        <Button 
                          key={u.value} 
                          onPress={()=>setDraft({...draft, priority:{...draft.priority, urgency: u.value as any}})} 
                          color="default"
                          variant="bordered"
                          size="md"
                          className={`transition-all duration-200 ${
                            draft.priority.urgency === u.value 
                              ? "!bg-primary-600 !text-white border-primary-500 shadow-lg scale-105 font-semibold hover:!bg-primary-700 focus:!bg-primary-600" 
                              : "hover:scale-102 hover:bg-default-100"
                          }`}
                        >
                          {u.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 glass rounded-lg border border-primary-500/20">
                    <h4 className="text-lg font-semibold mb-2">Priority Calculation</h4>
                    <div className="text-sm space-y-1">
                      <div>Red Flags: {pr.redFlag ? 10 : 0}/10 • Impact: {pr.impact}/6 • Urgency: {pr.urgency}/4 • Final: {pr.final}/10</div>
                      <div className="text-xs text-white/60 mb-2">
                        New scoring system: Red Flags give 10 points immediately, or Impact (0/6) + Urgency (0/4) = Total (0/10)
                      </div>
                      <div className="font-semibold text-primary-400">
                        Priority: {pr.priority} {pr.redFlag ? "(Red Flag)" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onPress={submit} 
                    color="primary" 
                    size="lg"
                    isLoading={submitting}
                    className="flex-1"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, step: 3})} 
                    variant="flat" 
                    size="lg"
                  >
                    Back
                  </Button>
                </div>
              </section>
            )}
          </CardBody>
        </Card>

        <Card className="glass p-2">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList size={18} className="text-primary-400" />
              Progress
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {steps.map((step) => (
                <div 
                  key={step.number} 
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    draft.step === step.number 
                      ? "bg-primary-500/20 border border-primary-500/30" 
                      : draft.step > step.number 
                        ? "bg-green-500/10 border border-green-500/20" 
                        : "bg-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    draft.step === step.number 
                      ? "bg-primary-500 text-white" 
                      : draft.step > step.number 
                        ? "bg-green-500 text-white" 
                        : "bg-white/20 text-white/60"
                  }`}>
                    {draft.step > step.number ? "✓" : step.number}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${
                      draft.step >= step.number ? "text-white" : "text-white/60"
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs ${
                      draft.step >= step.number ? "text-white/70" : "text-white/40"
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
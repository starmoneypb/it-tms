"use client";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Textarea, Checkbox, Progress } from "@heroui/react";
import { computePriority, PriorityInput } from "@/lib/priority";

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

  const pr = computePriority(draft.priority);

  async function submit() {
    setSubmitting(true);
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
    };
    const res = await fetch(`${API}/api/v1/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      alert("Failed to submit");
      return;
    }
    const { data } = await res.json();
    window.location.href = `/tickets/${data.id}`;
  }

  const progress = ((draft.step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Create New Ticket</h1>
        <p className="text-white/70">Submit a new support request or issue report</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass">
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
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2">What type of issue are you experiencing?</h3>
                  <p className="text-white/70 mb-6">This helps us route your ticket to the right team</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    color={draft.isAbnormal === true ? "primary" : "default"} 
                    variant="solid"
                    size="lg"
                    className="h-20 flex flex-col items-center justify-center"
                    onPress={() => setDraft({ ...draft, isAbnormal: true, step: 2, type: "ISSUE_REPORT" })}
                  >
                    <div className="text-2xl mb-2">⚠️</div>
                    <div className="font-semibold">System Issue</div>
                    <div className="text-xs opacity-70">Something is broken</div>
                  </Button>
                  <Button 
                    color={draft.isAbnormal === false ? "primary" : "default"} 
                    variant="solid"
                    size="lg"
                    className="h-20 flex flex-col items-center justify-center"
                    onPress={() => setDraft({ ...draft, isAbnormal: false, step: 2 })}
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-semibold">Service Request</div>
                    <div className="text-xs opacity-70">Need assistance</div>
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 2 && draft.isAbnormal === true && (
              <section className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🐛</div>
                  <h3 className="text-xl font-semibold mb-2">Issue Report Details</h3>
                  <p className="text-white/70 mb-6">Please provide detailed information about the problem</p>
                </div>
                <div className="space-y-4">
                  <Textarea 
                    label="Problem Description" 
                    placeholder="Describe the issue in detail..."
                    variant="flat" 
                    value={draft.description || ""} 
                    onValueChange={(v)=>setDraft({...draft, description: v})}
                    minRows={4}
                  />
                  <Textarea 
                    label="Steps to Reproduce" 
                    placeholder="How can we reproduce this issue?"
                    variant="flat" 
                    value={(draft.details?.steps)|| ""} 
                    onValueChange={(v)=>setDraft({...draft, details: {...(draft.details||{}), steps: v}})}
                    minRows={3}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Contact Email" 
                      placeholder="your@email.com"
                      variant="flat" 
                      value={draft.contactEmail||""} 
                      onValueChange={(v)=>setDraft({...draft, contactEmail: v})}
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
                  <div className="text-4xl mb-4">🛠️</div>
                  <h3 className="text-xl font-semibold mb-2">What type of service do you need?</h3>
                  <p className="text-white/70 mb-6">Select the most appropriate category</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onPress={()=>setDraft({...draft, type: "CHANGE_REQUEST_NORMAL", step: 3})}
                    variant="flat"
                    className="h-16 flex flex-col items-center justify-center"
                  >
                    <div className="text-lg mb-1">🔄</div>
                    <div className="font-semibold text-sm">Normal Change</div>
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_DATA_CORRECTION", step: 3})}
                    variant="flat"
                    className="h-16 flex flex-col items-center justify-center"
                  >
                    <div className="text-lg mb-1">✏️</div>
                    <div className="font-semibold text-sm">Data Correction</div>
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_DATA_EXTRACTION", step: 3})}
                    variant="flat"
                    className="h-16 flex flex-col items-center justify-center"
                  >
                    <div className="text-lg mb-1">📊</div>
                    <div className="font-semibold text-sm">Data Extraction</div>
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_ADVISORY", step: 3})}
                    variant="flat"
                    className="h-16 flex flex-col items-center justify-center"
                  >
                    <div className="text-lg mb-1">💡</div>
                    <div className="font-semibold text-sm">Advisory</div>
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, type: "SERVICE_REQUEST_GENERAL", step: 3})}
                    variant="flat"
                    className="h-16 flex flex-col items-center justify-center md:col-span-2"
                  >
                    <div className="text-lg mb-1">📝</div>
                    <div className="font-semibold text-sm">General Request</div>
                  </Button>
                </div>
                <Button onPress={()=>setDraft({...draft, step: 1})} variant="flat" size="lg">
                  Back
                </Button>
              </section>
            )}

            {draft.step === 3 && (
              <section className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">📝</div>
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
                  <Textarea 
                    label="Description" 
                    placeholder="Provide detailed information about your request..."
                    variant="flat" 
                    value={draft.description || ""} 
                    onValueChange={(v)=>setDraft({...draft, description: v})}
                    minRows={5}
                  />
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Attachments</label>
                    <input 
                      type="file" 
                      multiple 
                      className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
                    />
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
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-semibold mb-2">Priority Assessment</h3>
                  <p className="text-white/70 mb-6">Help us prioritize your ticket</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Red Flags (Critical Issues)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.outage} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, outage: v}}})}
                        className="text-white"
                      >
                        System-wide outage
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.paymentsFailing} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, paymentsFailing: v}}})}
                        className="text-white"
                      >
                        Payments failing
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.securityBreach} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, securityBreach: v}}})}
                        className="text-white"
                      >
                        Security breach
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.nonCompliance} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, nonCompliance: v}}})}
                        className="text-white"
                      >
                        Legal non-compliance
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Impact Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.lawNonCompliance} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, lawNonCompliance: v}}})}
                        className="text-white"
                      >
                        Non-compliant with laws/regulations (+4)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.severeSecurity} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, severeSecurity: v}}})}
                        className="text-white"
                      >
                        Severe security vulnerability (+4)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.paymentAbnormal} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, paymentAbnormal: v}}})}
                        className="text-white"
                      >
                        Payment processing abnormality (+4)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.lostRevenue} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, lostRevenue: v}}})}
                        className="text-white"
                      >
                        Lost revenue opportunity (+2)
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.noWorkaround} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, noWorkaround: v}}})}
                        className="text-white md:col-span-2"
                      >
                        No workaround / cannot be avoided (+1)
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Urgency Timeline</h4>
                    <div className="flex gap-2 flex-wrap">
                      {["<=48h", "3-7d", "8-30d", ">=31d", "none"].map((u) => (
                        <Button 
                          key={u} 
                          onPress={()=>setDraft({...draft, priority:{...draft.priority, urgency: u as any}})} 
                          color={draft.priority.urgency === u ? "primary" : "default"}
                          variant={draft.priority.urgency === u ? "solid" : "flat"}
                          size="sm"
                        >
                          {u}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 glass rounded-lg border border-primary-500/20">
                    <h4 className="text-lg font-semibold mb-2">Priority Calculation</h4>
                    <div className="text-sm space-y-1">
                      <div>Impact: {pr.impact} • Urgency: {pr.urgency} • Final: {pr.final}</div>
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

        <Card className="glass">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📋 Progress
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {steps.map((step) => (
                <div 
                  key={step.number} 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
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
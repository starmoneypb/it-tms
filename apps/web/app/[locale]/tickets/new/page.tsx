"use client";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Textarea, Checkbox, Progress } from "@heroui/react";
import { computePriority, PriorityInput } from "@/lib/priority";
import { WysiwygEditor } from "@/lib/wysiwyg-editor";
import { useAuth } from "@/lib/auth";
import { useLocale, useTranslations } from 'next-intl';
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

// Steps will be defined inside the component to access translations

export default function NewTicket() {
  const locale = useLocale();
  const t = useTranslations('newTicket');
  const tCommon = useTranslations('common');
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const { user, canCreateTicketType } = useAuth();

  const steps = [
    { number: 1, title: t('steps.issueType.title'), description: t('steps.issueType.description') },
    { number: 2, title: t('steps.ticketDetails.title'), description: t('steps.ticketDetails.description') },
    { number: 3, title: t('steps.additionalInfo.title'), description: t('steps.additionalInfo.description') },
    { number: 4, title: t('steps.prioritySubmit.title'), description: t('steps.prioritySubmit.description') }
  ];

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
        alert(t('failedToSubmit'));
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
          alert(t('ticketCreatedSuccess'));
        }
      }
      
      // Redirect after all uploads are complete
      window.location.href = `/${locale}/tickets/${ticketId}`;
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert(t('failedToSubmit'));
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((draft.step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
        <p className="text-white/70">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass p-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold">{t('ticketCreationWizard')}</h2>
              <div className="text-sm text-white/60">
                {t('stepOf', { step: draft.step, total: steps.length })}
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
                  <h3 className="text-xl font-semibold mb-2">{t('whatTypeIssue')}</h3>
                  <p className="text-white/70 mb-6">{t('helpsRoute')}</p>
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
                    <div className="font-semibold text-sm mb-1">{t('yes')}</div>
                    <div className="text-xs opacity-70 text-center px-2">{t('systemIssue')}</div>
                  </Button>
                  <Button 
                    color={draft.isAbnormal === false ? "primary" : "default"} 
                    variant={draft.isAbnormal === false ? "solid" : "flat"}
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-105"
                    onPress={() => setDraft({ ...draft, isAbnormal: false, step: 2 })}
                  >
                    <Plus size={24} className="text-blue-400 mb-1" />
                    <div className="font-semibold text-sm mb-1">{t('no')}</div>
                    <div className="text-xs opacity-70 text-center px-2">{t('serviceRequest')}</div>
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 2 && draft.isAbnormal === true && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">{t('issueReportDetails')}</h3>
                  <p className="text-white/70 mb-6">{t('provideDetailedInfo')}</p>
                </div>
                <div className="space-y-4">
                  <WysiwygEditor 
                    label={t('problemDescription')} 
                    placeholder={t('problemPlaceholder')}
                    value={draft.description || ""} 
                    onChange={(v)=>setDraft({...draft, description: v})}
                    minHeight="120px"
                  />
                  <WysiwygEditor 
                    label={t('stepsToReproduce')} 
                    placeholder={t('howToReproduce')}
                    value={(draft.details?.steps)|| ""} 
                    onChange={(v)=>setDraft({...draft, details: {...(draft.details||{}), steps: v}})}
                    minHeight="100px"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label={t('contactEmail')} 
                      placeholder={t('yourEmail')}
                      variant="flat" 
                      value={draft.contactEmail||""} 
                      onValueChange={(v)=>setDraft({...draft, contactEmail: v})}
                      isRequired={!user}
                      description={!user ? t('requiredForAnonymous') : ""}
                    />
                    <Input 
                      label={t('contactPhone')} 
                      placeholder={t('yourPhone')}
                      variant="flat" 
                      value={draft.contactPhone||""} 
                      onValueChange={(v)=>setDraft({...draft, contactPhone: v})}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onPress={()=>setDraft({...draft, step: 3})} color="primary" size="lg">
                    {t('continue')}
                  </Button>
                  <Button onPress={()=>setDraft({...draft, step: 1})} variant="flat" size="lg">
                    {tCommon('back')}
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 2 && draft.isAbnormal === false && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">{t('whatTypeService')}</h3>
                  <p className="text-white/70 mb-6">{t('selectMostAppropriate')}</p>
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
                      <div className="font-semibold text-sm mb-1">{t('normalChange')}</div>
                      <div className="text-xs opacity-70 text-center px-2">{t('systemModifications')}</div>
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
                      <div className="font-semibold text-sm mb-1">{t('dataCorrection')}</div>
                      <div className="text-xs opacity-70 text-center px-2">{t('fixIncorrectData')}</div>
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
                      <div className="font-semibold text-sm mb-1">{t('dataExtraction')}</div>
                      <div className="text-xs opacity-70 text-center px-2">{t('exportRetrieveData')}</div>
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
                      <div className="font-semibold text-sm mb-1">{t('advisory')}</div>
                      <div className="text-xs opacity-70 text-center px-2">{t('expertConsultation')}</div>
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
                      <div className="font-semibold text-sm mb-1">{t('generalRequest')}</div>
                      <div className="text-xs opacity-70 text-center px-2">{t('otherSupportNeeds')}</div>
                    </Button>
                  )}
                </div>
                <Button onPress={()=>setDraft({...draft, step: 1})} variant="flat" size="lg">
                  {t('back')}
                </Button>
              </section>
            )}

            {draft.step === 3 && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">{t('additionalInformation')}</h3>
                  <p className="text-white/70 mb-6">{t('provideTitleDescription')}</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    label={t('ticketTitle')} 
                    placeholder={t('titlePlaceholder')}
                    variant="flat" 
                    value={draft.title || ""} 
                    onValueChange={(v)=>setDraft({...draft, title: v})}
                  />
                  <WysiwygEditor 
                    label={t('description')} 
                    placeholder={t('descriptionPlaceholder')}
                    value={draft.description || ""} 
                    onChange={(v)=>setDraft({...draft, description: v})}
                    minHeight="150px"
                  />
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">{t('attachments')}</label>
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
                              {t('remove')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onPress={()=>setDraft({...draft, step: 4})} color="primary" size="lg">
                    {t('continue')}
                  </Button>
                  <Button onPress={()=>setDraft({...draft, step: 2})} variant="flat" size="lg">
                    {tCommon('back')}
                  </Button>
                </div>
              </section>
            )}

            {draft.step === 4 && (
              <section className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">{t('priorityAssessment')}</h3>
                  <p className="text-white/70 mb-6">{t('helpUsPrioritize')}</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">{t('redFlagsCriticalIssues')}</h4>
                    <p className="text-sm text-white/70 mb-3">{t('multipleSelectionsAllowed')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.outage} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, outage: v}}})}
                        className="text-white"
                      >
                        {t('systemOutage')}
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.paymentsFailing} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, paymentsFailing: v}}})}
                        className="text-white"
                      >
                        {t('paymentFailure')}
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.securityBreach} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, securityBreach: v}}})}
                        className="text-white"
                      >
                        {t('securityBreach')}
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.redFlags?.nonCompliance} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, redFlags: {...draft.priority.redFlags, nonCompliance: v}}})}
                        className="text-white"
                      >
                        {t('nonCompliance')}
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">{t('impact0to6')}</h4>
                    <p className="text-sm text-white/70 mb-3">{t('multipleSelectionsAllowedImpact')}</p>
                    <div className="grid grid-cols-1 gap-3">
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.lostRevenue} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, lostRevenue: v}}})}
                        className="text-white"
                      >
                        {t('lostRevenue')}
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.coreProcesses} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, coreProcesses: v}}})}
                        className="text-white"
                      >
                        {t('coreProcesses')}
                      </Checkbox>
                      <Checkbox 
                        isSelected={!!draft.priority.impact?.dataLoss} 
                        onValueChange={(v)=>setDraft({...draft, priority:{...draft.priority, impact:{...draft.priority.impact, dataLoss: v}}})}
                        className="text-white"
                      >
                        {t('dataLoss')}
                      </Checkbox>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">{t('urgency0to4')}</h4>
                    <p className="text-sm text-white/70 mb-3">{t('singleSelectionOnly')}</p>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { value: "<=48h", label: t('deadline48h'), score: 4 },
                        { value: "3-7d", label: t('deadline3to7d'), score: 3 },
                        { value: "8-30d", label: t('deadline8to30d'), score: 2 },
                        { value: ">=31d", label: t('deadline31dPlus'), score: 1 },
                        { value: "none", label: t('noDeadline'), score: 0 }
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
                    <h4 className="text-lg font-semibold mb-2">{t('priorityCalculation')}</h4>
                    <div className="text-sm space-y-1">
                      <div>Red Flags: {pr.redFlag ? 10 : 0}/10 • Impact: {pr.impact}/6 • Urgency: {pr.urgency}/4 • Final: {pr.final}/10</div>
                      <div className="text-xs text-white/60 mb-2">
                        {t('newScoringSystem')}
                      </div>
                      <div className="font-semibold text-primary-400">
                        {t('priority')}: {pr.priority} {pr.redFlag ? "(Red Flag)" : ""}
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
                    {submitting ? t('submitting') : t('submit')}
                  </Button>
                  <Button 
                    onPress={()=>setDraft({...draft, step: 3})} 
                    variant="flat" 
                    size="lg"
                  >
                    {tCommon('back')}
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
              {t('progress')}
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
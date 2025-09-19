"use client";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { Tags, CheckCircle, Info, Eye, Calendar, User, Phone, Mail, AlertTriangle } from "lucide-react";
import { useTranslations } from 'next-intl';

// Use current hostname with port 8000 for production-like environment
const API = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

type Ticket = { 
  id: string; 
  code: number;
  title: string; 
  description: string;
  initialType: string; 
  resolvedType?: string | null;
  priority: string;
  impactScore: number;
  urgencyScore: number;
  finalScore: number;
  redFlag: boolean;
  effortData?: any;
  effortScore?: number;
  contactEmail?: string;
  contactPhone?: string;
  createdBy?: string;
  latestComment?: string;
  createdAt: string;
  updatedAt: string;
};

export default function ClassifyPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<Ticket[]>([]);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const {isOpen, onOpen, onClose} = useDisclosure();

  // Debug function to log selection changes
  const handleSelectionChange = (ticketId: string, keys: any) => {
    const selectedKey = Array.from(keys)[0] as string;
    if (selectedKey) {
      setSel(prev => ({
        ...prev,
        [ticketId]: selectedKey
      }));
    }
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    onOpen();
  };

  function load() {
    setLoading(true);
    fetch(`${API}/api/v1/tickets?status=pending`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setItems(j.data.filter((t: Ticket) => t.initialType === "ISSUE_REPORT" && !t.resolvedType)))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function classify(id: string) {
    const rt = sel[id];
    if (!rt) return;
    await fetch(`${API}/api/v1/tickets/${id}/classify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedType: rt }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white/70">{t('loadingTicketsForClassification')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">{t('title')}</h1>
        <p className="text-white/70">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        <Card className="glass p-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Tags size={20} className="text-primary-400" />
                {t('classification')}
              </h2>
              <Chip color="primary" variant="flat">
                {items.length} {t('pending')}
              </Chip>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {items.length === 0 && (
              <div className="text-center py-16">
                <div className="text-lg mb-4 text-green-400 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle size={20} />
                  {t('complete')}
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('allCaughtUp')}</h3>
                <p className="text-white/70">{t('noIssueReports')}</p>
              </div>
            )}
            
            {items.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="glass border-white/10 hover:border-primary-500/30 transition-colors"
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{ticket.title}</h3>
                        <Chip size="sm" color="primary" variant="flat">
                          #{ticket.code}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Chip size="sm" variant="flat" className="bg-orange-500/20 text-orange-300">
                          {ticket.initialType.replace(/_/g, ' ')}
                        </Chip>
                        <span className="text-sm text-white/60">{t('initialClassification')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        onPress={() => handleViewDetails(ticket)}
                        className="min-w-[120px] text-blue-400 hover:text-blue-300"
                        startContent={<Eye size={16} />}
                      >
                        {t('viewDetails')}
                      </Button>
                      
                      <div className="flex flex-col gap-2">
                        <Select 
                          label={t('resolvedType')} 
                          placeholder={t('selectClassification')}
                          selectedKeys={sel[ticket.id] ? [sel[ticket.id]] : []} 
                          onSelectionChange={(keys) => handleSelectionChange(ticket.id, keys)}
                          variant="bordered"
                          className="min-w-[200px]"
                        >
                          <SelectItem key="EMERGENCY_CHANGE">
                            {t('emergencyChange')}
                          </SelectItem>
                          <SelectItem key="DATA_CORRECTION">
                            {t('dataCorrection')}
                          </SelectItem>
                        </Select>
                      </div>
                      
                      <Button 
                        color="primary" 
                        onPress={() => classify(ticket.id)}
                        isDisabled={!sel[ticket.id]}
                        className="min-w-[100px]"
                      >
                        {t('apply')}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {items.length > 0 && (
          <Card className="glass border-blue-500/20">
            <CardBody className="p-6">
              <div className="flex items-center gap-3">
                <Info size={20} className="text-blue-400" />
                <div>
                  <h4 className="font-semibold text-blue-300">{t('classificationGuidelines')}</h4>
                  <p className="text-sm text-white/70">
                    <strong>{t('emergencyChange')}:</strong> {t('emergencyChangeDesc')}<br/>
                    <strong>{t('dataCorrection')}:</strong> {t('dataCorrectionDesc')}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Ticket Details Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
        classNames={{
          base: "bg-background/95 backdrop-blur-md",
          backdrop: "bg-black/50"
        }}
      >
        <ModalContent className="glass">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold">{t('ticketDetails')}</h3>
                  {selectedTicket && (
                    <Chip size="sm" color="primary" variant="flat">
                      #{selectedTicket.code}
                    </Chip>
                  )}
                </div>
              </ModalHeader>
              <ModalBody>
                {selectedTicket && (
                  <div className="space-y-6">
                    {/* Title and Status */}
                    <div>
                      <h4 className="text-lg font-semibold mb-2">{selectedTicket.title}</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <Chip size="sm" variant="flat" className="bg-orange-500/20 text-orange-300">
                          {selectedTicket.initialType.replace(/_/g, ' ')}
                        </Chip>
                        <Chip size="sm" color={
                          selectedTicket.priority === 'P0' ? 'danger' :
                          selectedTicket.priority === 'P1' ? 'warning' :
                          selectedTicket.priority === 'P2' ? 'primary' : 'default'
                        } variant="flat">
                          {selectedTicket.priority}
                        </Chip>
                        {selectedTicket.redFlag && (
                          <Chip size="sm" color="danger" variant="flat" startContent={<AlertTriangle size={12} />}>
                            {t('redFlag')}
                          </Chip>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h5 className="font-semibold mb-2 flex items-center gap-2">
                        <Info size={16} />
                        {t('description')}
                      </h5>
                      <div className="bg-default-100 rounded-lg p-4">
                        <p className="text-sm whitespace-pre-wrap">{selectedTicket.description || t('noDescriptionProvided')}</p>
                      </div>
                    </div>

                    {/* Priority Scores */}
                    <div>
                      <h5 className="font-semibold mb-3">{t('priorityAssessment')}</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-default-100 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-primary">{selectedTicket.impactScore}</div>
                          <div className="text-xs text-default-500">{t('impactScore')}</div>
                        </div>
                        <div className="bg-default-100 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-warning">{selectedTicket.urgencyScore}</div>
                          <div className="text-xs text-default-500">{t('urgencyScore')}</div>
                        </div>
                        <div className="bg-default-100 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-secondary">{selectedTicket.finalScore}</div>
                          <div className="text-xs text-default-500">{t('finalScore')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Effort Assessment */}
                    <div>
                      <h5 className="font-semibold mb-3">{t('effortAssessment')}</h5>
                      {selectedTicket.effortData ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-default-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-blue-500">
                                {[
                                  selectedTicket.effortData?.development?.versionControl,
                                  selectedTicket.effortData?.development?.externalService,
                                  selectedTicket.effortData?.development?.internalIntegration
                                ].filter(Boolean).length}/3
                              </div>
                              <div className="text-xs text-default-500">Development</div>
                            </div>
                            <div className="bg-default-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-purple-500">
                                {[
                                  selectedTicket.effortData?.security?.legalCompliance,
                                  selectedTicket.effortData?.security?.accessControl,
                                  selectedTicket.effortData?.security?.personalData
                                ].filter(Boolean).length}/3
                              </div>
                              <div className="text-xs text-default-500">Security</div>
                            </div>
                            <div className="bg-default-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-green-500">
                                {[
                                  selectedTicket.effortData?.data?.migration,
                                  selectedTicket.effortData?.data?.dataPreparation,
                                  selectedTicket.effortData?.data?.encryption
                                ].filter(Boolean).length}/3
                              </div>
                              <div className="text-xs text-default-500">Data</div>
                            </div>
                            <div className="bg-default-100 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-yellow-500">
                                {[
                                  selectedTicket.effortData?.operations?.offHours,
                                  selectedTicket.effortData?.operations?.training,
                                  selectedTicket.effortData?.operations?.uat
                                ].filter(Boolean).length}/3
                              </div>
                              <div className="text-xs text-default-500">Operations</div>
                            </div>
                          </div>
                          <div className="bg-primary-100 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-primary">{selectedTicket.effortScore || 0}/12</div>
                            <div className="text-xs text-default-500">Total Effort Score</div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-default-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-default-500">{t('noEffortDataAvailable')}</p>
                        </div>
                      )}
                    </div>

                    {/* Contact Information */}
                    {(selectedTicket.contactEmail || selectedTicket.contactPhone) && (
                      <div>
                        <h5 className="font-semibold mb-3">{t('contactInformation')}</h5>
                        <div className="space-y-2">
                          {selectedTicket.contactEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail size={16} className="text-blue-400" />
                              <span>{selectedTicket.contactEmail}</span>
                            </div>
                          )}
                          {selectedTicket.contactPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={16} className="text-green-400" />
                              <span>{selectedTicket.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Latest Comment */}
                    {selectedTicket.latestComment && (
                      <div>
                        <h5 className="font-semibold mb-2">{t('latestComment')}</h5>
                        <div className="bg-default-100 rounded-lg p-4">
                          <p className="text-sm">{selectedTicket.latestComment}</p>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div>
                      <h5 className="font-semibold mb-3">{t('timeline')}</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-blue-400" />
                          <span>{t('created')}: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-green-400" />
                          <span>{t('updated')}: {new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-white/10">
                <Button color="primary" variant="light" onPress={onClose}>
{t('close')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
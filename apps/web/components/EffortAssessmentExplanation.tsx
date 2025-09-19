"use client";
import { Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import { Calculator, Users, Trophy } from "lucide-react";
import { useTranslations } from 'next-intl';

interface EffortAssessmentExplanationProps {
  effortData: any;
  assignees: any[];
  className?: string;
}

export default function EffortAssessmentExplanation({ 
  effortData, 
  assignees, 
  className = "" 
}: EffortAssessmentExplanationProps) {
  const t = useTranslations('ticketDetails');
  const assigneeCount = assignees?.length || 0;

  // Calculate collaboration score based on assignee count
  const calculateCollaborationScore = (count: number) => {
    if (count < 2) {
      return {
        score: 0,
        level: t('noCollaboration'),
        description: "Single assignee or no assignees"
      };
    }
    
    if (count === 2) {
      return {
        score: 2,
        level: t('basicCollaboration'),
        description: "2 Assignees"
      };
    }
    
    if (count >= 3 && count <= 4) {
      return {
        score: 4,
        level: t('goodCollaboration'),
        description: "3–4 Assignees"
      };
    }
    
    if (count >= 5 && count <= 6) {
      return {
        score: 6,
        level: t('highCollaboration'),
        description: "5–6 Assignees"
      };
    }
    
    if (count >= 7) {
      return {
        score: 8,
        level: t('maximumCollaboration'),
        description: "7 or more Assignees"
      };
    }
    
    return {
      score: 0,
      level: t('noCollaboration'),
      description: "Unknown"
    };
  };

  // Calculate base effort score (0-12 points)
  const calculateBaseScore = () => {
    if (!effortData) return 0;
    
    let score = 0;
    
    // Development category (max 3 points)
    if (effortData.development) {
      score += effortData.development.versionControl ? 1 : 0;
      score += effortData.development.externalService ? 1 : 0;
      score += effortData.development.internalIntegration ? 1 : 0;
    }
    
    // Security category (max 3 points)
    if (effortData.security) {
      score += effortData.security.legalCompliance ? 1 : 0;
      score += effortData.security.accessControl ? 1 : 0;
      score += effortData.security.personalData ? 1 : 0;
    }
    
    // Data category (max 3 points)
    if (effortData.data) {
      score += effortData.data.migration ? 1 : 0;
      score += effortData.data.dataPreparation ? 1 : 0;
      score += effortData.data.encryption ? 1 : 0;
    }
    
    // Operations category (max 3 points)
    if (effortData.operations) {
      score += effortData.operations.offHours ? 1 : 0;
      score += effortData.operations.training ? 1 : 0;
      score += effortData.operations.uat ? 1 : 0;
    }
    
    return score;
  };

  const baseScore = calculateBaseScore();
  const collaborationResult = calculateCollaborationScore(assigneeCount);
  const collaborationExtra = collaborationResult.score;
  
  // Calculate total points for distribution
  const totalPointsForDistribution = baseScore + (collaborationExtra * assigneeCount);
  
  // Calculate points per person
  const pointsPerPerson = assigneeCount > 0 ? (totalPointsForDistribution / assigneeCount) : baseScore;

  const getCategoryScore = (category: string) => {
    if (!effortData || !effortData[category]) return 0;
    const cat = effortData[category];
    return Object.values(cat).filter(Boolean).length;
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = score / max;
    if (percentage === 0) return "default";
    if (percentage <= 0.33) return "warning";
    if (percentage <= 0.66) return "primary";
    return "success";
  };

  return (
    <Card className={`glass ${className}`}>
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator size={18} className="text-primary-400" />
          {t('effortAssessment')} - {t('detailedCalculation')}
        </h3>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Base Effort Score Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            {t('baseEffortScoreBreakdown')} (0-12 {t('points')})
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Development */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white/90">{t('effortDevelopmentTitle')}</span>
                <Chip 
                  color={getScoreColor(getCategoryScore('development'), 3)}
                  variant="flat"
                  size="sm"
                >
                  {getCategoryScore('development')}/3
                </Chip>
              </div>
              <div className="space-y-1 text-xs text-white/70">
                <div className={`flex justify-between ${effortData?.development?.versionControl ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDevVersionControl')}</span>
                  <span>{effortData?.development?.versionControl ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.development?.externalService ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDevExternalService')}</span>
                  <span>{effortData?.development?.externalService ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.development?.internalIntegration ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDevInternalIntegration')}</span>
                  <span>{effortData?.development?.internalIntegration ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white/90">{t('effortSecurityTitle')}</span>
                <Chip 
                  color={getScoreColor(getCategoryScore('security'), 3)}
                  variant="flat"
                  size="sm"
                >
                  {getCategoryScore('security')}/3
                </Chip>
              </div>
              <div className="space-y-1 text-xs text-white/70">
                <div className={`flex justify-between ${effortData?.security?.legalCompliance ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortSecLegalCompliance')}</span>
                  <span>{effortData?.security?.legalCompliance ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.security?.accessControl ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortSecAccessControl')}</span>
                  <span>{effortData?.security?.accessControl ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.security?.personalData ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortSecPersonalData')}</span>
                  <span>{effortData?.security?.personalData ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
              </div>
            </div>

            {/* Data */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white/90">{t('effortDataTitle')}</span>
                <Chip 
                  color={getScoreColor(getCategoryScore('data'), 3)}
                  variant="flat"
                  size="sm"
                >
                  {getCategoryScore('data')}/3
                </Chip>
              </div>
              <div className="space-y-1 text-xs text-white/70">
                <div className={`flex justify-between ${effortData?.data?.migration ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDataMigration')}</span>
                  <span>{effortData?.data?.migration ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.data?.dataPreparation ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDataPreparation')}</span>
                  <span>{effortData?.data?.dataPreparation ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.data?.encryption ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortDataEncryption')}</span>
                  <span>{effortData?.data?.encryption ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white/90">{t('effortOperationsTitle')}</span>
                <Chip 
                  color={getScoreColor(getCategoryScore('operations'), 3)}
                  variant="flat"
                  size="sm"
                >
                  {getCategoryScore('operations')}/3
                </Chip>
              </div>
              <div className="space-y-1 text-xs text-white/70">
                <div className={`flex justify-between ${effortData?.operations?.offHours ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortOpsOffHours')}</span>
                  <span>{effortData?.operations?.offHours ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.operations?.training ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortOpsTraining')}</span>
                  <span>{effortData?.operations?.training ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
                <div className={`flex justify-between ${effortData?.operations?.uat ? 'text-green-400' : 'text-white/50'}`}>
                  <span>{t('effortOpsUAT')}</span>
                  <span>{effortData?.operations?.uat ? '✓ 1pt' : '✗ 0pt'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Collaboration Bonus */}
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            {t('collaborationBonus')} ({assigneeCount} assignees)
          </h4>
          
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-white/90">{collaborationResult.level}</div>
                <div className="text-sm text-white/60">{collaborationResult.description}</div>
              </div>
              <Chip 
                color="primary"
                variant="flat"
                size="lg"
                className="font-bold"
              >
+{collaborationExtra} {t('ptsPerPerson')}
              </Chip>
            </div>
          </div>
        </div>

        <Divider />

        {/* Final Calculation */}
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <Calculator size={16} className="text-green-400" />
            {t('finalPointsCalculation')}
          </h4>
          
          <div className="space-y-3">
            {/* Calculation Formula */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-white/80 mb-2">{t('calculationFormula')}:</div>
              <div className="font-mono text-xs text-white/70 space-y-1">
                <div>{t('baseScore')}: {baseScore} {t('points')}</div>
                <div>{t('collaborationBonusPerPerson')}: {collaborationExtra} {t('points')}</div>
                <div>{t('numberOfAssignees')}: {assigneeCount}</div>
                <div className="border-t border-white/20 pt-2 mt-2">
                  <div>{t('totalPointsPool')}: {baseScore} + ({collaborationExtra} × {assigneeCount}) = {totalPointsForDistribution} {t('points')}</div>
                  <div className="font-bold text-primary-400">{t('pointsPerPerson')}: {totalPointsForDistribution} ÷ {assigneeCount || 1} = {pointsPerPerson.toFixed(2)} {t('points')}</div>
                </div>
              </div>
            </div>

            {/* Per-Person Distribution */}
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400 mb-1">
                  {pointsPerPerson.toFixed(2)} {t('pointsPerPersonShort')}
                </div>
                <div className="text-sm text-white/60">
                  {t('eachAssigneeWillReceive')}
                </div>
              </div>
            </div>

            {/* Assignee List */}
            {assignees && assignees.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-white/80">{t('pointsDistributionPreview')}:</div>
                <div className="space-y-2">
                  {assignees.map((assignee: any, index: number) => (
                    <div key={assignee.id || index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                          {assignee.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm text-white/90">{assignee.name || 'Unknown'}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignee.role === 'Manager' ? 'bg-purple-500/20 text-purple-300' :
                          assignee.role === 'Supervisor' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {assignee.role || 'User'}
                        </span>
                      </div>
                      <Chip 
                        color="success"
                        variant="flat"
                        size="sm"
                        className="font-bold"
                      >
                        {pointsPerPerson.toFixed(2)} pts
                      </Chip>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

package effort

import "testing"

func TestComputeBaseAndCollaboration(t *testing.T) {
    var in Input
    // No selections => 0
    if ComputeBase(in) != 0 {
        t.Fatalf("expected base 0")
    }

    // All selected => 12
    in.Development.VersionControl = true
    in.Development.ExternalService = true
    in.Development.InternalIntegration = true
    in.Security.LegalCompliance = true
    in.Security.AccessControl = true
    in.Security.PersonalData = true
    in.Data.Migration = true
    in.Data.DataPreparation = true
    in.Data.Encryption = true
    in.Operations.OffHours = true
    in.Operations.Training = true
    in.Operations.UAT = true
    if ComputeBase(in) != 12 {
        t.Fatalf("expected base 12")
    }

    // Collaboration tiers
    if CollaborationExtraPerPerson(1) != 0 { t.Fatalf("tier 1 (no collaboration)") }
    if CollaborationExtraPerPerson(2) != 2 { t.Fatalf("tier 2") }
    if CollaborationExtraPerPerson(3) != 4 { t.Fatalf("tier 3-4") }
    if CollaborationExtraPerPerson(4) != 4 { t.Fatalf("tier 3-4") }
    if CollaborationExtraPerPerson(5) != 6 { t.Fatalf("tier 5-6") }
    if CollaborationExtraPerPerson(7) != 8 { t.Fatalf("tier 7+") }

    // Total points for distribution for 2 assignees: base 12 + (2*2)=16 total; per person should be 8
    total := TotalPointsForDistribution(in, 2)
    if int(total) != 16 {
        t.Fatalf("expected total 16, got %v", total)
    }

    // Total points for distribution for 1 assignee: base 12 + (0*1)=12 total; single person gets full base score
    totalSingle := TotalPointsForDistribution(in, 1)
    if int(totalSingle) != 12 {
        t.Fatalf("expected total 12 for single assignee, got %v", totalSingle)
    }
}



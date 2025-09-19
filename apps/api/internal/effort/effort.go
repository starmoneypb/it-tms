package effort

// Input represents the Effort scoring checklist selections.
// Each category allows up to 3 selections, 1 point each.
type Input struct {
    Development struct {
        VersionControl      bool `json:"versionControl"`
        ExternalService     bool `json:"externalService"`
        InternalIntegration bool `json:"internalIntegration"`
    } `json:"development"`
    Security struct {
        LegalCompliance bool `json:"legalCompliance"`
        AccessControl   bool `json:"accessControl"`
        PersonalData    bool `json:"personalData"`
    } `json:"security"`
    Data struct {
        Migration       bool `json:"migration"`
        DataPreparation bool `json:"dataPreparation"`
        Encryption      bool `json:"encryption"`
    } `json:"data"`
    Operations struct {
        OffHours bool `json:"offHours"`
        Training bool `json:"training"`
        UAT      bool `json:"uat"`
    } `json:"operations"`
}

// ComputeBase returns the base Effort score (0..12) before collaboration, capped at 3 per category.
func ComputeBase(in Input) int {
    dev := boolToInt(in.Development.VersionControl) + boolToInt(in.Development.ExternalService) + boolToInt(in.Development.InternalIntegration)
    if dev > 3 { dev = 3 }

    sec := boolToInt(in.Security.LegalCompliance) + boolToInt(in.Security.AccessControl) + boolToInt(in.Security.PersonalData)
    if sec > 3 { sec = 3 }

    dat := boolToInt(in.Data.Migration) + boolToInt(in.Data.DataPreparation) + boolToInt(in.Data.Encryption)
    if dat > 3 { dat = 3 }

    ops := boolToInt(in.Operations.OffHours) + boolToInt(in.Operations.Training) + boolToInt(in.Operations.UAT)
    if ops > 3 { ops = 3 }

    return dev + sec + dat + ops
}

// CollaborationExtraPerPerson returns the collaboration bonus per person based on number of assignees.
// 1-2 -> 2, 3-4 -> 4, 5-6 -> 6, 7+ -> 8
func CollaborationExtraPerPerson(assigneeCount int) int {
    if assigneeCount <= 0 { return 0 }
    if assigneeCount <= 2 { return 2 }
    if assigneeCount <= 4 { return 4 }
    if assigneeCount <= 6 { return 6 }
    return 8
}

// TotalPointsForDistribution calculates the total points to pass into the distribution
// function so that each assignee receives: (base/assignees) + collaborationExtraPerPerson.
// Passing base + collaborationExtraPerPerson*assignees and dividing evenly in the repository
// yields the correct per-person score without changing the repository API.
func TotalPointsForDistribution(in Input, assigneeCount int) float64 {
    if assigneeCount <= 0 {
        assigneeCount = 1
    }
    base := ComputeBase(in)
    extra := CollaborationExtraPerPerson(assigneeCount)
    total := base + (extra * assigneeCount)
    return float64(total)
}

func boolToInt(b bool) int { if b { return 1 } ; return 0 }



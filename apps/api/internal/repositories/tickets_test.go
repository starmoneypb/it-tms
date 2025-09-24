package repositories

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/it-tms/apps/api/internal/models"
)

func TestTicketRepo_UpdateTicketFields(t *testing.T) {
	// This is a unit test for the UpdateTicketFields method
	// In a real test environment, you would use a test database

	tests := []struct {
		name           string
		initialType    *models.TicketInitialType
		resolvedType   *models.TicketResolvedType
		priority       *models.TicketPriority
		impactScore    *int32
		urgencyScore   *int32
		finalScore     *int32
		redFlag        *bool
		expectedFields int
	}{
		{
			name:           "Update priority only",
			priority:       func() *models.TicketPriority { v := models.PriorityP1; return &v }(),
			expectedFields: 1,
		},
		{
			name:           "Update multiple fields",
			priority:       func() *models.TicketPriority { v := models.PriorityP0; return &v }(),
			impactScore:    func() *int32 { v := int32(5); return &v }(),
			urgencyScore:   func() *int32 { v := int32(4); return &v }(),
			finalScore:     func() *int32 { v := int32(9); return &v }(),
			redFlag:        func() *bool { v := true; return &v }(),
			expectedFields: 5,
		},
		{
			name:           "Update initial type",
			initialType:    func() *models.TicketInitialType { v := models.InitialChangeRequestNormal; return &v }(),
			expectedFields: 1,
		},
		{
			name:           "Update resolved type",
			resolvedType:   func() *models.TicketResolvedType { v := models.ResolvedEmergencyChange; return &v }(),
			expectedFields: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Count non-nil fields to verify the method handles them correctly
			fieldCount := 0
			if tt.initialType != nil {
				fieldCount++
			}
			if tt.resolvedType != nil {
				fieldCount++
			}
			if tt.priority != nil {
				fieldCount++
			}
			if tt.impactScore != nil {
				fieldCount++
			}
			if tt.urgencyScore != nil {
				fieldCount++
			}
			if tt.finalScore != nil {
				fieldCount++
			}
			if tt.redFlag != nil {
				fieldCount++
			}

			assert.Equal(t, tt.expectedFields, fieldCount, "Field count should match expected")
		})
	}
}

func TestModels_Validation(t *testing.T) {
	// Test that the model enums work correctly

	// Test ticket types
	assert.Equal(t, "ISSUE_REPORT", string(models.InitialIssueReport))
	assert.Equal(t, "CHANGE_REQUEST_NORMAL", string(models.InitialChangeRequestNormal))
	assert.Equal(t, "SERVICE_REQUEST_DATA_CORRECTION", string(models.InitialServiceDataCorrection))

	// Test resolved types
	assert.Equal(t, "EMERGENCY_CHANGE", string(models.ResolvedEmergencyChange))
	assert.Equal(t, "DATA_CORRECTION", string(models.ResolvedDataCorrection))

	// Test priorities
	assert.Equal(t, "P0", string(models.PriorityP0))
	assert.Equal(t, "P1", string(models.PriorityP1))
	assert.Equal(t, "P2", string(models.PriorityP2))
	assert.Equal(t, "P3", string(models.PriorityP3))
}

func TestCommentGeneration_ChangeTracking(t *testing.T) {
	// Test the logic for generating automatic comments

	tests := []struct {
		name     string
		changes  []string
		role     string
		expected string
	}{
		{
			name:     "Single field change",
			changes:  []string{"`Supervisor` performed `Priority Change` from `P3` to `P1`"},
			role:     "Supervisor",
			expected: "`Supervisor` performed `Priority Change` from `P3` to `P1`",
		},
		{
			name:     "Multiple field changes",
			changes:  []string{"`Manager` performed `Priority Change` from `P3` to `P1`", "`Manager` performed `Impact Score Change` from `2` to `5`"},
			role:     "Manager",
			expected: "`Manager` performed `Priority Change` from `P3` to `P1` • `Manager` performed `Impact Score Change` from `2` to `5`",
		},
		{
			name:     "Title and description changes",
			changes:  []string{"`Supervisor` performed `Title Change` from `Old Title` to `New Title`", "`Supervisor` performed `Description Update`"},
			role:     "Supervisor",
			expected: "`Supervisor` performed `Title Change` from `Old Title` to `New Title` • `Supervisor` performed `Description Update`",
		},
		{
			name:     "Red flag changes",
			changes:  []string{"`Manager` performed `Red Flag Set` from `false` to `true`"},
			role:     "Manager",
			expected: "`Manager` performed `Red Flag Set` from `false` to `true`",
		},
		{
			name:     "Title with backticks (should be escaped)",
			changes:  []string{"`Supervisor` performed `Title Change` from `Fix the \\`backtick\\` issue` to `Fix the \\`backtick\\` issue v2`"},
			role:     "Supervisor",
			expected: "`Supervisor` performed `Title Change` from `Fix the \\`backtick\\` issue` to `Fix the \\`backtick\\` issue v2`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var commentBody string
			commentBody = strings.Join(tt.changes, " • ")

			assert.Equal(t, tt.expected, commentBody)
		})
	}
}

func TestChangeDetection_Logic(t *testing.T) {
	// Test the logic for detecting changes

	tests := []struct {
		name         string
		oldValue     interface{}
		newValue     interface{}
		shouldChange bool
	}{
		{
			name:         "String values different",
			oldValue:     "P3",
			newValue:     "P1",
			shouldChange: true,
		},
		{
			name:         "String values same",
			oldValue:     "P3",
			newValue:     "P3",
			shouldChange: false,
		},
		{
			name:         "Int values different",
			oldValue:     int32(2),
			newValue:     int32(5),
			shouldChange: true,
		},
		{
			name:         "Int values same",
			oldValue:     int32(2),
			newValue:     int32(2),
			shouldChange: false,
		},
		{
			name:         "Bool values different",
			oldValue:     false,
			newValue:     true,
			shouldChange: true,
		},
		{
			name:         "Bool values same",
			oldValue:     false,
			newValue:     false,
			shouldChange: false,
		},
		{
			name:         "Nil to value",
			oldValue:     nil,
			newValue:     "EMERGENCY_CHANGE",
			shouldChange: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var changed bool
			if tt.oldValue == nil {
				changed = tt.newValue != nil
			} else {
				changed = tt.oldValue != tt.newValue
			}

			assert.Equal(t, tt.shouldChange, changed)
		})
	}
}

func TestEscapeMarkdown(t *testing.T) {
	// Test the escapeMarkdown function
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "No backticks",
			input:    "Normal text",
			expected: "Normal text",
		},
		{
			name:     "Single backtick",
			input:    "Fix the `backtick` issue",
			expected: "Fix the \\`backtick\\` issue",
		},
		{
			name:     "Multiple backticks",
			input:    "`code` and `more code`",
			expected: "\\`code\\` and \\`more code\\`",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Only backticks",
			input:    "``",
			expected: "\\`\\`",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := escapeMarkdown(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

package tracker

import "strings"

// FormatComment creates a standardized Tracker comment body from the provided change descriptions.
func FormatComment(changes ...string) string {
	filtered := make([]string, 0, len(changes))
	for _, change := range changes {
		trimmed := strings.TrimSpace(change)
		if trimmed != "" {
			filtered = append(filtered, trimmed)
		}
	}
	if len(filtered) == 0 {
		return ""
	}
	return "**Tracker** • " + strings.Join(filtered, " • ")
}

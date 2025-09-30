package models

import "time"

type KnowledgeSharingDocument struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	ViewCount   int       `json:"viewCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	
	// Computed fields
	Contributors []User `json:"contributors,omitempty"`
	LikeCount    int    `json:"likeCount"`
	IsLiked      bool   `json:"isLiked,omitempty"`
	CanEdit      bool   `json:"canEdit,omitempty"`
	CanDelete    bool   `json:"canDelete,omitempty"`
}

type KnowledgeSharingContributor struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	UserID     string    `json:"userId"`
	User       *User     `json:"user,omitempty"`
	AddedAt    time.Time `json:"addedAt"`
	AddedBy    string    `json:"addedBy"`
	AddedByUser *User    `json:"addedByUser,omitempty"`
}

type KnowledgeSharingLike struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	UserID     string    `json:"userId"`
	User       *User     `json:"user,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type KnowledgeSharingScore struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	DocumentID string    `json:"documentId"`
	Points     float64   `json:"points"`
	AwardedAt  time.Time `json:"awardedAt"`
}

type KnowledgeSharingFilters struct {
	Query         string
	ContributorID string
	SortBy        string // "newest", "oldest", "popular", "likes"
	Limit         int
	Offset        int
}

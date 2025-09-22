package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

type StorageService struct {
	client     *storage.Client
	bucketName string
	projectID  string
}

type UploadResult struct {
	Path string
	URL  string
}

func NewStorageService(bucketName, projectID string) (*StorageService, error) {
	ctx := context.Background()
	
	// Initialize GCS client with default credentials
	// In production, this will use the service account key from environment
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}

	return &StorageService{
		client:     client,
		bucketName: bucketName,
		projectID:  projectID,
	}, nil
}

func NewStorageServiceWithCredentials(bucketName, projectID, credentialsJSON string) (*StorageService, error) {
	ctx := context.Background()
	
	// Initialize GCS client with provided credentials
	client, err := storage.NewClient(ctx, option.WithCredentialsJSON([]byte(credentialsJSON)))
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client with credentials: %w", err)
	}

	return &StorageService{
		client:     client,
		bucketName: bucketName,
		projectID:  projectID,
	}, nil
}

// UploadFile uploads a file to Google Cloud Storage
func (s *StorageService) UploadFile(ctx context.Context, reader io.Reader, filename string, contentType string) (*UploadResult, error) {
	// Sanitize filename: replace spaces and special characters
	originalName := filepath.Base(filename)
	sanitizedName := strings.ReplaceAll(originalName, " ", "_")
	sanitizedName = strings.ReplaceAll(sanitizedName, "(", "")
	sanitizedName = strings.ReplaceAll(sanitizedName, ")", "")
	
	// Create secure filename with timestamp
	objectName := fmt.Sprintf("%d_%s", time.Now().UnixNano(), sanitizedName)
	
	log.Printf("Uploading file to GCS: %s -> %s", originalName, objectName)
	
	// Get bucket handle
	bucket := s.client.Bucket(s.bucketName)
	
	// Create object writer
	obj := bucket.Object(objectName)
	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType
	
	// Copy file content to GCS
	if _, err := io.Copy(writer, reader); err != nil {
		writer.Close()
		return nil, fmt.Errorf("failed to upload file to GCS: %w", err)
	}
	
	// Close writer to finalize upload
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to finalize GCS upload: %w", err)
	}
	
	log.Printf("File uploaded successfully to GCS: %s", objectName)
	
	return &UploadResult{
		Path: objectName,
		URL:  fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.bucketName, objectName),
	}, nil
}

// GetSignedURL generates a signed URL for downloading a file from GCS
func (s *StorageService) GetSignedURL(ctx context.Context, objectName string, expiration time.Duration) (string, error) {
	// Get bucket handle
	bucket := s.client.Bucket(s.bucketName)
	
	// Generate signed URL using bucket method
	url, err := bucket.SignedURL(objectName, &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "GET",
		Expires: time.Now().Add(expiration),
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}
	
	return url, nil
}

// GetPublicURL returns a public URL for a file in GCS (if bucket is public)
func (s *StorageService) GetPublicURL(objectName string) string {
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.bucketName, objectName)
}

// DeleteFile deletes a file from GCS
func (s *StorageService) DeleteFile(ctx context.Context, objectName string) error {
	bucket := s.client.Bucket(s.bucketName)
	obj := bucket.Object(objectName)
	
	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete file from GCS: %w", err)
	}
	
	log.Printf("File deleted from GCS: %s", objectName)
	return nil
}

// Close closes the GCS client
func (s *StorageService) Close() error {
	return s.client.Close()
}

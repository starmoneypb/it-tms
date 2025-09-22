# Google Cloud Storage Migration Guide

This guide explains how to migrate the IT-TMS system from local file storage to Google Cloud Storage (GCS).

## Overview

The system has been updated to use Google Cloud Storage for all file uploads including:
- Ticket attachments
- Comment attachments  
- User profile pictures

## Prerequisites

### 1. Google Cloud Project Setup

1. Create a Google Cloud Project (if you don't have one)
2. Enable the Cloud Storage API
3. Create a Cloud Storage bucket for file storage

### 2. Service Account Setup

1. Create a service account with Storage Admin permissions
2. Download the service account key JSON file
3. Store the JSON content as an environment variable

### 3. Required Environment Variables

Add these variables to your environment configuration:

```bash
# Google Cloud Storage Configuration
GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
```

## Deployment Steps

### 1. Update Environment Variables

Update your `.env` file or environment configuration with the GCS settings:

```bash
GCS_BUCKET_NAME=unisight-files
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### 2. Deploy the Updated Code

The system will automatically use GCS when the environment variables are configured:

```bash
# Deploy using existing GitHub Actions workflow
git push origin main
```

### 3. Verify Deployment

1. Check application logs to confirm GCS initialization
2. Test file upload functionality
3. Verify files are stored in your GCS bucket

## Key Changes Made

### 1. Storage Service Implementation

- Created `internal/storage/storage.go` with GCS integration
- Supports both default credentials and JSON credentials
- Generates signed URLs for secure file downloads

### 2. Updated File Handlers

- Modified upload handlers to use GCS instead of local filesystem
- Updated download handlers to redirect to GCS signed URLs
- Removed local file serving routes

### 3. Configuration Updates

- Added GCS configuration to `pkg/config/config.go`
- Updated Docker configuration to remove local upload volumes
- Updated environment variable templates

### 4. Database Schema

No database schema changes were required. The existing file path fields now store GCS object names instead of local file paths.

## File Access Patterns

### Upload Process
1. User uploads file via API
2. File is uploaded directly to GCS bucket
3. GCS object name is stored in database
4. API returns success response

### Download Process
1. User requests file download
2. API generates signed URL for GCS object
3. User is redirected to signed URL
4. File is served directly from GCS

## Security Considerations

1. **Signed URLs**: Files are accessed via time-limited signed URLs (1 hour for attachments, 24 hours for profile pictures)
2. **Authentication**: Download endpoints still require proper authentication
3. **Bucket Permissions**: Ensure bucket has appropriate access controls

## Monitoring and Maintenance

### Logs to Monitor
- GCS client initialization
- File upload success/failure
- Signed URL generation

### Common Issues
1. **Missing Credentials**: Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is properly set
2. **Bucket Permissions**: Verify service account has Storage Admin access
3. **Network Connectivity**: Ensure GCP APIs are accessible from your deployment

## Rollback Plan

If you need to rollback to local file storage:

1. Revert the code changes
2. Restore the `uploads` volume in docker-compose.gcp.yml
3. Remove GCS environment variables
4. Redeploy the application

## Cost Considerations

- GCS charges for storage, operations, and bandwidth
- Monitor usage through GCP Console
- Consider lifecycle policies for old files

## Support

For issues related to GCS integration:
1. Check application logs for GCS errors
2. Verify service account permissions
3. Test GCS connectivity from your deployment environment

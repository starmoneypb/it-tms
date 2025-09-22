# Profile Picture Feature - Production Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Migration Files
- ✅ `0009_profile_pictures_table.up.sql` - Creates profile_pictures table
- ✅ `0009_profile_pictures_table.down.sql` - Rollback migration
- ✅ Migration added to all docker-compose files:
  - `docker-compose.yml` (development)
  - `docker-compose.dev.yml` (development with hot reload)
  - `docker-compose.prod.yml` (production)

### 2. Database Schema Compatibility
- ✅ Uses UUID for id (consistent with users table)
- ✅ Foreign key references users(id) correctly
- ✅ Uses same structure as comment_attachments table
- ✅ Includes proper indexes for performance
- ✅ Uses `IF NOT EXISTS` for safe re-runs

### 3. Code Changes
- ✅ Handler methods implemented
- ✅ Repository methods implemented
- ✅ Routes added to main.go
- ✅ Proper error handling
- ✅ CORS headers included
- ✅ Import statements added

### 4. Migration Execution Order
The migration will run automatically when the API container starts:
```
0001_init.up.sql ← Creates users table
0002_indexes.up.sql
0003_add_profile_picture.up.sql ← Adds profile_picture column to users
0004_multiple_assignees.up.sql
0005_comment_attachments.up.sql ← Creates comment_attachments table (pattern we're copying)
0006_enhanced_scoring_system.up.sql
0007_fix_ranking_numbers.up.sql
0008_effort_fields.up.sql
0009_profile_pictures_table.up.sql ← NEW: Creates profile_pictures table
```

## 🚀 Deployment Process

### What Happens During Deployment:
1. **Container Restart**: API container restarts with new code
2. **Migration Runs**: `0009_profile_pictures_table.up.sql` executes automatically
3. **Table Created**: `profile_pictures` table is created with proper structure
4. **API Available**: New endpoints become available immediately

### Expected Behavior:
- ✅ **Existing users**: Will have `profile_picture` field as NULL (shows fallback avatar)
- ✅ **New uploads**: Will use new attachment system
- ✅ **Old profile pictures**: Will be ignored (users need to re-upload)
- ✅ **No downtime**: Migration is non-breaking

## 🔧 Post-Deployment Verification

### 1. Check Migration Applied
```bash
# Connect to database and verify table exists
sudo docker exec -i unisight-db-1 psql -U postgres -d it_tms -c "\d profile_pictures"
```

### 2. Test New Endpoints
```bash
# Test profile picture download endpoint (should return 404 for non-existent ID)
curl -I "https://unisight.dev/api/v1/profile-pictures/test-id/download"
```

### 3. Test Upload Functionality
- Visit `/profile` page
- Upload a new profile picture
- Verify it displays correctly
- Check that URL format is `/profile-pictures/{id}/download`

### 4. Check Logs
```bash
# Check for any migration errors
sudo docker logs unisight-api-1 | grep -i migration

# Check for any profile picture related errors
sudo docker logs unisight-api-1 | grep -i "profile picture"
```

## 🚨 Rollback Plan (If Needed)

If issues occur, you can rollback:

### 1. Rollback Database
```bash
sudo docker exec -i unisight-db-1 psql -U postgres -d it_tms < db/migrations/0009_profile_pictures_table.down.sql
```

### 2. Rollback Code
```bash
# Revert to previous commit
git revert <commit-hash>
# Push and redeploy
```

## 📊 Migration Safety Features

- ✅ **Non-breaking**: Existing functionality unaffected
- ✅ **Safe re-runs**: Uses `IF NOT EXISTS` clauses
- ✅ **Proper cleanup**: Down migration removes everything cleanly
- ✅ **Foreign key constraints**: Ensures data integrity
- ✅ **Indexes**: Optimized for performance

## 🎯 Success Criteria

After deployment, you should see:
- ✅ No migration errors in logs
- ✅ `profile_pictures` table exists in database
- ✅ Profile upload works without 404 errors
- ✅ Profile pictures display correctly
- ✅ Fallback avatars show for users without pictures
- ✅ No nginx routing issues (all handled by Go API)

## 🔍 Troubleshooting

If profile pictures still don't work:
1. Check API container logs for errors
2. Verify migration was applied successfully
3. Test the download endpoint directly
4. Check that files are being saved to container filesystem

The new system bypasses all nginx and Docker volume issues by using the proven attachment pattern!

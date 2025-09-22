# Profile Picture Solution: Using Attachment Pattern

## Problem Solved
Instead of dealing with nginx routing and Docker volume mounting issues, we're now using the same proven pattern that comment attachments use.

## How It Works (Like Comment Attachments)

### 1. Database Storage
- New `profile_pictures` table stores metadata (ID, filename, MIME type, size, path)
- User's `profile_picture` field stores the download URL: `/profile-pictures/{id}/download`

### 2. Upload Process
1. File is uploaded via `POST /profile/picture`
2. File is saved to filesystem using existing `saveUpload()` function
3. Metadata is stored in `profile_pictures` table
4. User's `profile_picture` field is updated with download URL
5. Returns the download URL to frontend

### 3. Download Process
1. Frontend requests image via `/profile-pictures/{id}/download`
2. Go handler looks up metadata in database
3. File is served directly by Go with proper headers
4. No nginx routing issues, no volume mounting problems

## Files Changed

### Backend Changes
1. **handlers.go**: Modified `ProfilePictureUpload` and added `DownloadProfilePicture`
2. **users.go**: Added `AddProfilePicture` and `GetProfilePictureByID` methods
3. **main.go**: Added route for `/profile-pictures/:profilePictureId/download`
4. **Migration**: New table `profile_pictures`

### Database Migration
- Run migration `0009_profile_pictures_table.up.sql` to create the table

## Advantages of This Approach

✅ **No nginx routing issues** - handled entirely by Go API server
✅ **No Docker volume mounting problems** - uses existing file system
✅ **Consistent with existing patterns** - same as comment attachments
✅ **Proper authentication** - can add auth if needed later
✅ **Database integrity** - metadata stored properly
✅ **File cleanup** - can implement cleanup of orphaned files
✅ **CORS headers** - properly handled in Go
✅ **Caching headers** - controlled by application

## Deployment Steps

1. **Apply database migration**:
   ```sql
   -- Run the migration file
   \i db/migrations/0009_profile_pictures_table.up.sql
   ```

2. **Deploy the updated API server**:
   ```bash
   # Restart API container to pick up code changes
   sudo docker restart unisight-api-1
   ```

3. **Clean up old profile picture references**:
   ```sql
   -- Clear old profile picture references
   UPDATE users SET profile_picture = NULL WHERE profile_picture IS NOT NULL;
   ```

4. **Test the new system**:
   - Upload a new profile picture
   - Verify it displays correctly
   - Check that URL is `/profile-pictures/{id}/download` format

## Expected Results

After deployment:
- ✅ Profile picture uploads will work immediately
- ✅ Images will be accessible via download URLs
- ✅ No more nginx routing issues
- ✅ No more Docker volume mounting problems
- ✅ Consistent behavior with comment attachments
- ✅ Proper fallback avatars for users without pictures

## Migration Command for Production

```bash
# Connect to your database and run:
sudo docker exec -i unisight-db-1 psql -U postgres -d it_tms < db/migrations/0009_profile_pictures_table.up.sql

# Restart API server
sudo docker restart unisight-api-1

# Clean up old references
sudo docker exec -i unisight-db-1 psql -U postgres -d it_tms -c "UPDATE users SET profile_picture = NULL WHERE profile_picture IS NOT NULL;"
```

This solution eliminates all the complex nginx and Docker issues by using the proven attachment pattern that already works perfectly for comment attachments.

# Frontend Profile Picture Updates

## Changes Made

The backend now returns profile picture URLs in the format `/profile-pictures/{id}/download` instead of `/uploads/filename`. Updated all frontend components to handle the new URL format.

### Files Updated

#### 1. `apps/web/app/[locale]/profile/page.tsx`
- **Profile picture display in profile page**
- Changed: `${API}${profile.profilePicture}` → `${API}/api/v1${profile.profilePicture}`

#### 2. `apps/web/components/Navigation.tsx`
- **Desktop navigation profile picture**
- **Mobile navigation profile picture**  
- Changed: `${API}${user.profilePicture}` → `${API}/api/v1${user.profilePicture}`
- Updated both desktop and mobile sections

#### 3. `apps/web/components/UserSearchSelect.tsx`
- **User selection dropdown avatars**
- **Selected user chips avatars**
- Changed: `${API}${user.profilePicture}` → `${API}/api/v1${user.profilePicture}`
- Updated both main avatar and chip avatar sections

## URL Format Change

### Before (Old System):
```
profilePicture: "/uploads/1758506036324936856_filename.png"
Frontend builds: "https://unisight.dev/uploads/1758506036324936856_filename.png"
```

### After (New Attachment System):
```
profilePicture: "/profile-pictures/uuid-123-456/download"
Frontend builds: "https://unisight.dev/api/v1/profile-pictures/uuid-123-456/download"
```

## How It Works Now

1. **Upload**: User uploads profile picture → Backend stores file and metadata → Returns `/profile-pictures/{id}/download`
2. **Display**: Frontend requests `${API}/api/v1/profile-pictures/{id}/download` → Go handler serves file directly
3. **Fallback**: If profile picture fails to load, shows user's initials avatar

## Components Affected

✅ **Profile page** - Main profile picture display  
✅ **Navigation (desktop)** - User dropdown avatar  
✅ **Navigation (mobile)** - Mobile menu avatar  
✅ **UserSearchSelect** - User selection dropdown avatars  
✅ **UserSearchSelect chips** - Selected user chip avatars  

## Benefits

- ✅ **Consistent with backend attachment pattern**
- ✅ **Proper authentication can be added if needed**
- ✅ **Database-backed URLs with metadata**
- ✅ **No more nginx routing issues**
- ✅ **Proper error handling and fallbacks**

## Expected Behavior After Deployment

- **Existing users**: Profile pictures will be NULL, show fallback avatars
- **New uploads**: Will work with new attachment URLs
- **All components**: Will display profile pictures or fallback avatars correctly
- **No broken images**: Proper error handling shows initials when image fails

The frontend now fully supports the new attachment-style profile picture system!

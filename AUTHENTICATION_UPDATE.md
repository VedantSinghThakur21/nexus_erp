# Authentication System Update - Username/Email Support

## Overview
Updated the authentication system to support **both username and email** for login, making it compatible with Frappe/ERPNext's authentication system.

## Changes Made

### 1. Login Function (`app/actions/user-auth.ts`)

#### Updated Function Signature
```typescript
// Before
export async function loginUser(email: string, password: string)

// After
export async function loginUser(usernameOrEmail: string, password: string)
```

#### Key Improvements

**✅ Flexible Input Validation**
- Accepts both username AND email formats
- Minimum length check (3 characters) instead of strict email regex
- Determines if input is email or username: `const isEmail = isValidEmail(usernameOrEmail)`

**✅ Smart Tenant Lookup**
- If **email** provided: Lookup Tenant by `owner_email`
- If **username** provided: 
  1. First lookup User doctype to get email
  2. Then lookup Tenant by email
- This ensures both username and email users can access their tenant sites

**✅ Proper User Creation**
- Added `username` field to user creation
- Generates username from email: `username = email.split('@')[0]`
- Sets both `username` and `email` fields in User doctype

**✅ Cookie Management**
- Stores email in `user_email` cookie (if available)
- Works with username-only logins by getting email from Frappe response

### 2. Login Page UI (`app/login/page.tsx`)

#### Updated Labels
```typescript
// Before
<Label>Email address</Label>
<Input type="email" placeholder="name@company.com" />

// After
<Label>Email or Username</Label>
<Input type="text" placeholder="name@company.com or username" />
```

#### Validation Changes
- Removed strict email regex validation on client side
- Accepts any credential with minimum 3 characters
- Updated error messages to say "username/email"

### 3. Master Site Login

Updated `loginToMasterSite()` function to accept username or email:
- Parameter name changed from `email` to `usernameOrEmail`
- Stores email in cookie only if available from response
- Works for admin users logging in with username

## How It Works Now

### For Tenant Users

1. **User enters username or email** → System detects format
2. **If email**: Direct lookup in Tenant doctype by `owner_email`
3. **If username**: 
   - Lookup User doctype to get email
   - Then lookup Tenant doctype by email
4. **Login to tenant site** with Frappe's `usr` parameter (accepts both)
5. **Store session** with sid cookie and user_email (if available)

### For Admin Users

1. **User enters username or email** → No tenant found
2. **Fallback to master site login**
3. **Frappe handles authentication** with `usr` parameter
4. **Store admin session** with sid cookie and user_type='admin'

## Frappe/ERPNext Compatibility

### User Doctype Fields
```python
User:
  name: "john.doe@company.com"  # Username (primary key)
  username: "johndoe"            # Optional username field
  email: "john.doe@company.com"  # Email field
```

### Login Endpoint
```http
POST /api/method/login
Content-Type: application/x-www-form-urlencoded

usr=john.doe@company.com&pwd=password
# OR
usr=johndoe&pwd=password
```

Both formats work! Frappe's `login` method accepts either username or email in the `usr` parameter.

## Multi-Tenancy Structure

### Tenant Doctype
```json
{
  "doctype": "Tenant",
  "subdomain": "acme",
  "site_url": "https://acme.erpnext.com",
  "owner_email": "admin@acme.com",
  "status": "Active"
}
```

### Tenant User Creation
When creating a new tenant user:
```typescript
{
  doctype: 'User',
  username: 'john',              // Generated from email
  email: 'john@acme.com',        // User's email
  first_name: 'John',
  last_name: 'Doe',
  enabled: 1,
  new_password: 'SecurePass123!'
}
```

## Testing

### Test Cases
1. ✅ Login with email: `john@company.com`
2. ✅ Login with username: `john`
3. ✅ Tenant user login (routes to tenant site)
4. ✅ Admin user login (routes to master site)
5. ✅ Invalid credentials error handling
6. ✅ Session persistence with cookies

### Expected Behavior
- **Email login**: Works for all users
- **Username login**: Works if username field is set in User doctype
- **Tenant routing**: Automatically routes to correct tenant site
- **Admin access**: Falls back to master site for non-tenant users

## Environment Variables

Required in `.env.local`:
```bash
ERP_NEXT_URL=https://your-erpnext-site.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
```

## Migration Notes

### For Existing Users
- Existing users with email as username will continue to work
- No database migration needed
- New users will have both `username` and `email` fields set

### For New Deployments
1. Ensure Frappe/ERPNext backend is accessible
2. Create Tenant doctype with fields:
   - subdomain (Data)
   - site_url (Data)
   - owner_email (Data)
   - status (Select: Active/Inactive)
3. Set environment variables for API access
4. Test with both username and email formats

## Security Considerations

### Input Validation
- Minimum length check (3 characters)
- Server-side validation in Frappe
- No SQL injection risk (uses Frappe ORM)

### Session Management
- HTTPOnly cookies for security
- Secure flag in production
- SameSite: lax for CSRF protection
- 7-day session expiration

### Multi-Tenant Isolation
- Each tenant has unique site URL
- Users can only access their tenant site
- Admin users bypass tenant routing
- X-Frappe-Site-Name header ensures correct tenant

## Troubleshooting

### Issue: "Invalid credentials" error
- **Cause**: Username not set in User doctype
- **Solution**: Use email format or update User doctype to include username

### Issue: "Tenant not found" error
- **Cause**: Tenant doctype not created or owner_email mismatch
- **Solution**: Create Tenant doctype entry with correct owner_email

### Issue: "Session expired" error
- **Cause**: Sid cookie expired or invalid
- **Solution**: Clear cookies and login again

## Future Enhancements

1. **Username uniqueness validation** during signup
2. **Allow custom username** during signup (optional field)
3. **Forgot username** feature (send to email)
4. **Username availability check** in real-time
5. **Import existing usernames** from ERPNext

## References

- Frappe Authentication: https://frappeframework.com/docs/user/en/api/rest
- ERPNext User Doctype: https://docs.erpnext.com/docs/user/manual/en/setting-up/users-and-permissions
- Multi-Tenant Setup: https://frappeframework.com/docs/user/en/bench/guides/multitenant-setup

---

**Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Ready for Production

# Google OAuth Setup Instructions

## Prerequisites

1. **Google Cloud Console Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API

2. **Create OAuth 2.0 Credentials:**
   - Go to "Credentials" in the Google Cloud Console
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Set the following redirect URIs:
     - `http://localhost:4000/auth/google/callback`
   - Copy the Client ID and Client Secret

## Environment Configuration

### Backend (.env file)
Update your `Backend/.env` file with the following:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_session_secret_here_should_be_random_string
JWT_SECRET=your_jwt_secret_here_should_be_random_string
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

### Frontend (.env.local file)
Update your `Frontend/.env.local` file with:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_should_be_random_string

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Testing the Authentication Flow

1. **Start Backend Server:**
   ```bash
   cd Backend
   npm start
   ```

2. **Start Frontend Server:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test Authentication:**
   - Go to `http://localhost:3000/auth/login`
   - Select user type (Student, Training Institution, or Admin)
   - Click "Đăng nhập với Google"
   - You should be redirected to Google's OAuth consent screen
   - After successful authentication, you'll be redirected to the appropriate dashboard

## Role-Based Access Control

The system automatically assigns roles based on email domains:

- **Admin**: Emails matching `ADMIN_EMAIL` environment variable
- **Issuer**: Emails ending with `@vnu.edu.vn`
- **User**: All other authenticated users

Only `@vnu.edu.vn` domain emails and the designated admin email are allowed to log in.

## Troubleshooting

1. **"OAuth2Strategy requires a clientID option" Error:**
   - Make sure you've set the `GOOGLE_CLIENT_ID` in your `.env` file

2. **"Invalid domain" Error:**
   - Only `@vnu.edu.vn` emails and the admin email are allowed
   - Check your `ADMIN_EMAIL` environment variable

3. **Authentication Failed:**
   - Verify your Google OAuth credentials
   - Check the redirect URI in Google Cloud Console matches `http://localhost:4000/auth/google/callback`

## Security Notes

- The JWT tokens are stored as HTTP-only cookies for security
- Sessions expire after 24 hours
- All sensitive routes require proper authentication and role verification
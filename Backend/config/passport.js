// config/passport.js
require('dotenv').config();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Only import and configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here' &&
    process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret_here') {
  
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  
  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = {
        googleId: profile.id,
        email: profile.emails[0].value,
        fullName: profile.displayName,
        avatar: profile.photos[0].value
      };
      
      console.log('Google OAuth user:', user);
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
  
  console.log('✅ Google OAuth strategy configured successfully');
} else {
  console.warn('⚠️  Google OAuth credentials not configured.');
  console.warn('   Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
  console.warn('   You can use development login mode for testing.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
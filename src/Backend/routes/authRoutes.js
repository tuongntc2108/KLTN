// routes/authRoutes.js
const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middlewares/authMiddleware');
const { createUserIfNotExists, updateUserLastLogin, getUserRole } = require('../utils/userUtils');
const router = express.Router();

// Helper function to generate JWT token
function generateToken(user) {
  console.log(`[GENERATE_TOKEN] User role: ${user.role}`);
  const payload = {
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

// Google OAuth initiation
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// Development test login (only for development)
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Development login not available in production' });
  }
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Create user record if not exists (first login)
    await createUserIfNotExists(email);
    
    // Update last login
    await updateUserLastLogin(email);
    
    // Get user role from database
    const role = await getUserRole(email);
    console.log(`[DEV LOGIN] Email: ${email}, Role: ${role}`);
    
    const user = {
      email: email,
      fullName: 'Test User (' + email.split('@')[0] + ')',
      avatar: 'https://via.placeholder.com/100',
      role: role
    };
    
    const token = generateToken(user);
    
    // Determine redirect URL based on role automatically
    let redirectPath = '/dashboard/student'; // default
    
    if (user.role === 'Admin') {
      redirectPath = '/dashboard/admin';
    } else if (user.role === 'Issuer') {
      redirectPath = '/dashboard/training';
    }
    
    // Set HTTP-only cookie with JWT token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      message: 'Development login successful',
      redirectUrl: `${process.env.FRONTEND_URL}${redirectPath}?auth=success`,
      user: user
    });
    
  } catch (error) {
    console.error('Development login error:', error);
    res.status(500).json({ success: false, message: 'Development login failed' });
  }
});

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=oauth_failed` }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Create user record if not exists (first login)
      await createUserIfNotExists(user.email);
      
      // Update last login
      await updateUserLastLogin(user.email);
      
      // Get user role from database
      const role = await getUserRole(user.email);
      console.log(`[GOOGLE OAUTH] Email: ${user.email}, Role: ${role}`);
          
      // Update user object with role
      user.role = role;
      
      const token = generateToken(user);
      
      // Allow any email to register (no domain restriction)
      // Role assignment is handled by getUserRole function
      
      // Determine redirect URL based on role automatically
      let redirectPath = '/dashboard/student'; // default
      
      if (role === 'Admin') {
        redirectPath = '/dashboard/admin';
      } else if (role === 'Issuer') {
        redirectPath = '/dashboard/training';
      }
      
      // Set HTTP-only cookie with JWT token
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      // Redirect to appropriate dashboard
      res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?auth=success`);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=callback_failed`);
    }
  }
);

// Logout route
router.post('/logout', (req, res) => {
  try {
    // Clear authentication cookie
    res.clearCookie('auth_token');
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Test endpoint to check user role
router.get('/test-role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const role = await getUserRole(email);
    console.log(`[TEST_ROLE] Email: ${email}, Role: ${role}`);
    
    res.json({
      email: email,
      role: role
    });
  } catch (error) {
    console.error('Test role error:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
});

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    if (req.user) {
      const { email, fullName, avatar, role } = req.user;
      
      // Get fresh user data from database (including avatar_url)
      const { getUserFullProfile } = require('../utils/userUtils');
      const profile = await getUserFullProfile(email);
      
      // Update last login for the user
      await updateUserLastLogin(email);
      
      res.json({
        success: true,
        user: { 
          email: profile.email, 
          fullName: profile.full_name || fullName, 
          avatar: profile.avatar_url || avatar,
          role: profile.role || role 
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' });
    }
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user info' });
  }
});

module.exports = router;
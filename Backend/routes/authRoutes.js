// routes/authRoutes.js
const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middlewares/authMiddleware');
const router = express.Router();

// Helper function to determine user role
function getUserRole(email) {
  if (email === '22021207@vnu.edu.vn') {
    return 'Admin';
  } else if (email === 'tts.tuongntc@vnpay.vn') {
    return 'Issuer';
  } else {
    return 'User'; // All other emails are students
  }
}

// Helper function to generate JWT token
function generateToken(user) {
  const payload = {
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    role: getUserRole(user.email)
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
router.post('/dev-login', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Development login not available in production' });
  }
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Allow any email to register (no domain restriction)
    // Role assignment is handled by getUserRole function
    
    const user = {
      email: email,
      fullName: 'Test User (' + email.split('@')[0] + ')',
      avatar: 'https://via.placeholder.com/100',
      role: getUserRole(email)
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
  (req, res) => {
    try {
      const user = req.user;
      const userRole = getUserRole(user.email);
      const token = generateToken(user);
      
      // Allow any email to register (no domain restriction)
      // Role assignment is handled by getUserRole function
      
      // Determine redirect URL based on role automatically
      let redirectPath = '/dashboard/student'; // default
      
      if (userRole === 'Admin') {
        redirectPath = '/dashboard/admin';
      } else if (userRole === 'Issuer') {
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

// Get current user info
router.get('/me', authenticate, (req, res) => {
  try {
    if (req.user) {
      const { email, fullName, avatar, role } = req.user;
      res.json({
        success: true,
        user: { email, fullName, avatar, role }
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
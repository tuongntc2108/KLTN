const jwt = require('jsonwebtoken');

// Authentication middleware - verify JWT token from cookies or Authorization header
module.exports.authenticate = function(req, res, next) {
  try {
    let token = null;
    
    // Try to get token from cookies first (more secure)
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    // Fallback to Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required - No token provided" 
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user information in request
    req.user = {
      email: decoded.email,
      fullName: decoded.fullName,
      avatar: decoded.avatar,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: "Token expired - Please login again" 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token - Please login again" 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: "Authentication failed" 
    });
  }
};

// Role-based authorization middleware
module.exports.requireRole = function(allowedRoles = []) {
  return (req, res, next) => {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }
    
    // Get user role (should already be set by authenticate middleware)
    const userRole = req.user.role;
    
    // If no specific roles required, just check if authenticated
    if (allowedRoles.length === 0) {
      return next();
    }
    
    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied - Required role: ${allowedRoles.join(' or ')}, Current role: ${userRole}` 
      });
    }
    
    next();
  };
};

// Helper function to get user role based on email (for backward compatibility)
function getUserRole(email) {
  if (email === '22021207@vnu.edu.vn') {
    return "Admin";
  } else if (email === 'tts.tuongntc@vnpay.vn') {
    return "Issuer";
  } else {
    return "User"; // All other emails are students
  }
}

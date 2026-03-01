const db = require("../config/pg");
const { getUserFullProfile } = require('../utils/userUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Get full user profile with role-specific information
 */
exports.getProfile = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized', 
        details: 'User not authenticated' 
      });
    }
    
    const profile = await getUserFullProfile(userEmail);
    
    return res.status(200).json({
      success: true,
      profile
    });
  } catch (err) {
    console.error('❌ getProfile error:', err.message);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};

/**
 * Update user language preference
 */
exports.updateLanguage = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const { language } = req.body;
    
    if (!userEmail) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized', 
        details: 'User not authenticated' 
      });
    }
    
    if (!language || !['vi', 'en'].includes(language)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request', 
        details: 'Language must be either "vi" or "en"' 
      });
    }
    
    const updateQuery = `
      UPDATE users 
      SET language = $1 
      WHERE email = $2
      RETURNING language
    `;
    
    const result = await db.pool.query(updateQuery, [language, userEmail]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Not Found', 
        details: 'User not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Language updated successfully',
      language: result.rows[0].language
    });
  } catch (err) {
    console.error('❌ updateLanguage error:', err.message);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};

/**
 * Update user avatar
 * File is uploaded via multer middleware
 * Automatically deletes old avatar to save storage
 */
exports.updateAvatar = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized', 
        details: 'User not authenticated' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request', 
        details: 'No file uploaded' 
      });
    }
    
    // Get old avatar_url before updating (to delete old file later)
    const getOldAvatarQuery = `
      SELECT avatar_url 
      FROM users 
      WHERE email = $1
    `;
    const oldAvatarResult = await db.pool.query(getOldAvatarQuery, [userEmail]);
    const oldAvatarUrl = oldAvatarResult.rows.length > 0 ? oldAvatarResult.rows[0].avatar_url : null;
    
    // Generate avatar URL path (relative to public folder)
    const avatarUrl = `/avatars/${req.file.filename}`;
    
    // Update database
    const updateQuery = `
      UPDATE users 
      SET avatar_url = $1 
      WHERE email = $2
      RETURNING avatar_url
    `;
    
    const result = await db.pool.query(updateQuery, [avatarUrl, userEmail]);
    
    if (result.rows.length === 0) {
      // Clean up uploaded file if DB update fails
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false,
        error: 'Not Found', 
        details: 'User not found' 
      });
    }
    
    // Delete old avatar file if it exists and is a local file
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/avatars/')) {
      const oldFilePath = path.join(__dirname, '../public', oldAvatarUrl);
      try {
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`✅ Deleted old avatar: ${oldFilePath}`);
        }
      } catch (deleteErr) {
        console.error('⚠️ Failed to delete old avatar:', deleteErr);
        // Don't fail the request if old file deletion fails
      }
    }
    
    // Add cache busting timestamp to avatar URL
    const avatarUrlWithTimestamp = `${result.rows[0].avatar_url}?t=${Date.now()}`;
    
    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar_url: avatarUrlWithTimestamp
    });
  } catch (err) {
    console.error('❌ updateAvatar error:', err.message);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete uploaded file:', unlinkErr);
      }
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};

/**
 * Configure multer for avatar upload
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/avatars');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userEmail = req.user?.email || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = userEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const filename = `${safeName}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    
    cb(null, true);
  }
});

exports.uploadMiddleware = upload.single('avatar');

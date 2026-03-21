const { Pool } = require('pg');
const db = require('../config/pg');

/**
 * Course Content Service
 * Handles retrieval of course training content using fuzzy search
 */
class CourseContentService {
  constructor() {
    this.pool = db.pool;
  }

  /**
   * Fuzzy search courses by name using pg_trgm
   * @param {string} courseName - Course name to search (will be normalized)
   * @param {number} similarityThreshold - Min similarity score (0-1), default 0.3
   * @param {number} limit - Max results to return, default 5
   * @returns {Promise<Array>} Array of matched courses sorted by similarity DESC
   */
  async fuzzySearchCourses(courseName, similarityThreshold = 0.3, limit = 5) {
    try {
      console.log(`🔍 [COURSE FUZZY MATCH] Searching for: "${courseName}", threshold=${similarityThreshold}`);

      if (!courseName || typeof courseName !== 'string') {
        console.warn('⚠️  [COURSE FUZZY MATCH] Invalid course name provided');
        return [];
      }

      const normalizedName = courseName.trim();
      
      // pg_trgm similarity search query
      // similarity() function returns 0-1, with 1 being exact match
      const query = `
        SELECT 
          id,
          issuer_id,
          course_name,
          course_description,
          training_content,
          duration,
          created_at,
          updated_at,
          similarity(course_name, $1) as similarity_score
        FROM courses
        WHERE similarity(course_name, $1) > $2
        ORDER BY similarity_score DESC
        LIMIT $3
      `;

      const result = await this.pool.query(query, [normalizedName, similarityThreshold, limit]);
      
      console.log(`✅ [COURSE FUZZY MATCH] Found ${result.rows.length} matches`);
      result.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. "${row.course_name}" (similarity: ${(row.similarity_score * 100).toFixed(1)}%)`);
      });

      return result.rows;
    } catch (error) {
      console.error('❌ [COURSE FUZZY MATCH] Error:', error.message);
      // Try fallback without similarity - just LIKE match
      return await this.fallbackCourseSearch(courseName, limit);
    }
  }

  /**
   * Fallback search without pg_trgm (case-insensitive LIKE)
   * @param {string} courseName - Course name
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Matched courses
   */
  async fallbackCourseSearch(courseName, limit = 5) {
    try {
      console.log(`🔄 [COURSE FALLBACK] Using LIKE search for: "${courseName}"`);
      
      const query = `
        SELECT 
          id,
          issuer_id,
          course_name,
          course_description,
          training_content,
          duration,
          created_at,
          updated_at,
          1.0 as similarity_score
        FROM courses
        WHERE LOWER(course_name) LIKE LOWER($1)
        LIMIT $2
      `;

      const searchPattern = `%${courseName.trim()}%`;
      const result = await this.pool.query(query, [searchPattern, limit]);
      
      console.log(`✅ [COURSE FALLBACK] Found ${result.rows.length} matches via LIKE`);
      return result.rows;
    } catch (error) {
      console.error('❌ [COURSE FALLBACK] Fallback search also failed:', error.message);
      return [];
    }
  }

  /**
   * Get course by ID
   * @param {number} courseId - Course ID
   * @returns {Promise<Object|null>} Course object or null
   */
  async getCourseById(courseId) {
    try {
      console.log(`📚 [COURSE RETRIEVAL] Fetching course ID: ${courseId}`);
      
      const query = `
        SELECT 
          id,
          issuer_id,
          course_name,
          course_description,
          training_content,
          duration,
          created_at,
          updated_at
        FROM courses
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [courseId]);
      const course = result.rows[0] || null;
      
      if (course) {
        console.log(`✅ [COURSE RETRIEVAL] Found: "${course.course_name}"`);
      } else {
        console.log(`❌ [COURSE RETRIEVAL] Course not found`);
      }

      return course;
    } catch (error) {
      console.error('❌ [COURSE RETRIEVAL] Error:', error.message);
      return null;
    }
  }

  /**
   * Get multiple courses by IDs
   * @param {Array<number>} courseIds - Array of course IDs
   * @returns {Promise<Array>} Array of course objects
   */
  async getCoursesByIds(courseIds) {
    try {
      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return [];
      }

      console.log(`📚 [COURSE RETRIEVAL] Fetching courses: ${courseIds.join(',')}`);
      
      const placeholders = courseIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT 
          id,
          issuer_id,
          course_name,
          course_description,
          training_content,
          duration,
          created_at,
          updated_at
        FROM courses
        WHERE id IN (${placeholders})
        ORDER BY course_name ASC
      `;

      const result = await this.pool.query(query, courseIds);
      console.log(`✅ [COURSE RETRIEVAL] Retrieved ${result.rows.length} courses`);
      
      return result.rows;
    } catch (error) {
      console.error('❌ [COURSE RETRIEVAL] Error:', error.message);
      return [];
    }
  }

  /**
   * Format course content for LLM context
   * @param {Object|Array} courses - Course or array of courses
   * @returns {string} Formatted course content string for prompt injection
   */
  formatCoursesForContext(courses) {
    if (!courses) return '';
    
    const courseList = Array.isArray(courses) ? courses : [courses];
    
    return courseList.map((course, idx) => {
      const trainingContent = course.training_content ? course.training_content.substring(0, 2000) : 'Không có nội dung';
      return `
${idx + 1}. **${course.course_name}**
   Mô tả: ${course.course_description || 'N/A'}
   Thời lượng: ${course.duration || 'N/A'}
   
   Nội dung chương trình đào tạo:
   ${trainingContent}${course.training_content && course.training_content.length > 2000 ? '...' : ''}
      `.trim();
    }).join('\n\n---\n\n');
  }
}

module.exports = new CourseContentService();

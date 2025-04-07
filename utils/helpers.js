/**
 * General helper utilities for the application
 */

/**
 * Format number with commas
 * @param {Number} num - Number to format
 * @returns {String} - Formatted number
 */
exports.formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  /**
   * Format currency
   * @param {Number} amount - Amount to format
   * @param {String} currency - Currency code
   * @returns {String} - Formatted currency
   */
  exports.formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };
  
  /**
   * Format date
   * @param {Date|String} date - Date to format
   * @param {Object} options - Format options
   * @returns {String} - Formatted date
   */
  exports.formatDate = (date, options = {}) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
  };
  
  /**
   * Truncate string
   * @param {String} str - String to truncate
   * @param {Number} length - Maximum length
   * @param {String} end - Ending characters
   * @returns {String} - Truncated string
   */
  exports.truncateString = (str, length = 30, end = '...') => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length - end.length) + end;
  };
  
  /**
   * Generate random string
   * @param {Number} length - String length
   * @returns {String} - Random string
   */
  exports.generateRandomString = (length = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  };
  
  /**
   * Calculate percentage
   * @param {Number} value - Current value
   * @param {Number} total - Total value
   * @returns {Number} - Percentage
   */
  exports.calculatePercentage = (value, total) => {
    if (!total) return 0;
    return (value / total) * 100;
  };
  
  /**
   * Paginate array
   * @param {Array} array - Array to paginate
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @returns {Object} - Pagination result
   */
  exports.paginateArray = (array, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const results = {
      data: array.slice(startIndex, endIndex),
      pagination: {
        total: array.length,
        page,
        limit,
        totalPages: Math.ceil(array.length / limit)
      }
    };
    
    return results;
  };
  
  /**
   * Get minimum value
   * @param {Number} a - First number
   * @param {Number} b - Second number
   * @returns {Number} - Minimum value
   */
  exports.min = (a, b) => {
    return a < b ? a : b;
  };
  
  /**
   * Get maximum value
   * @param {Number} a - First number
   * @param {Number} b - Second number
   * @returns {Number} - Maximum value
   */
  exports.max = (a, b) => {
    return a > b ? a : b;
  };
  
  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {Boolean} - Is empty
   */
  exports.isEmpty = (value) => {
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'object' && Object.keys(value).length === 0) ||
      (typeof value === 'string' && value.trim().length === 0)
    );
  };
  
  /**
   * Create slugified string
   * @param {String} text - Text to slugify
   * @returns {String} - Slugified string
   */
  exports.slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  };
  
  /**
   * Extract error message
   * @param {Error} error - Error object
   * @returns {String} - Error message
   */
  exports.getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    
    if (error.response && error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    
    if (error.message) return error.message;
    
    return 'Unknown error occurred';
  };
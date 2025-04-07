/**
 * Input validation utilities
 */

/**
 * Validate email
 * @param {String} email - Email to validate
 * @returns {Boolean} - Is valid email
 */
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validate password strength
   * @param {String} password - Password to validate
   * @returns {Boolean} - Is strong password
   */
  exports.isStrongPassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };
  
  /**
   * Get password strength score (0-4)
   * @param {String} password - Password to check
   * @returns {Number} - Strength score
   */
  exports.getPasswordStrength = (password) => {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    
    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    
    return Math.min(score, 4);
  };
  
  /**
   * Validate ethereum address
   * @param {String} address - Ethereum address
   * @returns {Boolean} - Is valid address
   */
  exports.isValidEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  /**
   * Validate bitcoin address
   * @param {String} address - Bitcoin address
   * @returns {Boolean} - Is valid address
   */
  exports.isValidBitcoinAddress = (address) => {
    // Basic validation, not comprehensive
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
           /^bc1[ac-hj-np-z02-9]{39,59}$/.test(address);
  };
  
  /**
   * Validate phone number
   * @param {String} phone - Phone number
   * @returns {Boolean} - Is valid phone
   */
  exports.isValidPhone = (phone) => {
    // Basic international phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };
  
  /**
   * Validate URL
   * @param {String} url - URL to validate
   * @returns {Boolean} - Is valid URL
   */
  exports.isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (err) {
      return false;
    }
  };
  
  /**
   * Validate number
   * @param {*} value - Value to check
   * @returns {Boolean} - Is number
   */
  exports.isNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  };
  
  /**
   * Validate integer
   * @param {*} value - Value to check
   * @returns {Boolean} - Is integer
   */
  exports.isInteger = (value) => {
    return Number.isInteger(Number(value));
  };
  
  /**
   * Validate positive number
   * @param {*} value - Value to check
   * @returns {Boolean} - Is positive number
   */
  exports.isPositive = (value) => {
    return this.isNumber(value) && Number(value) > 0;
  };
  
  /**
   * Validate date
   * @param {*} value - Value to check
   * @returns {Boolean} - Is valid date
   */
  exports.isValidDate = (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  };
  
  /**
   * Validate within range
   * @param {Number} value - Value to check
   * @param {Number} min - Minimum value
   * @param {Number} max - Maximum value
   * @returns {Boolean} - Is within range
   */
  exports.isWithinRange = (value, min, max) => {
    return value >= min && value <= max;
  };
  
  /**
   * Validate array
   * @param {*} value - Value to check
   * @returns {Boolean} - Is array
   */
  exports.isArray = (value) => {
    return Array.isArray(value);
  };
  
  /**
   * Validate object
   * @param {*} value - Value to check
   * @returns {Boolean} - Is object
   */
  exports.isObject = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };
  
  /**
   * Validate string
   * @param {*} value - Value to check
   * @returns {Boolean} - Is string
   */
  exports.isString = (value) => {
    return typeof value === 'string';
  };
  
  /**
   * Validate boolean
   * @param {*} value - Value to check
   * @returns {Boolean} - Is boolean
   */
  exports.isBoolean = (value) => {
    return typeof value === 'boolean';
  };
  
  /**
   * Validate function
   * @param {*} value - Value to check
   * @returns {Boolean} - Is function
   */
  exports.isFunction = (value) => {
    return typeof value === 'function';
  };
/**
 * Validates cookies and provides security recommendations.
 */
export class CookieValidator {
  /**
   * Validates a cookie and returns warnings/errors.
   * @param {object} cookie Cookie to validate.
   * @return {object} Validation result with warnings and errors.
   */
  static validate(cookie) {
    const warnings = [];
    const errors = [];
    const suggestions = [];

    if (!cookie.name || cookie.name.trim() === '') {
      errors.push('Cookie name is required');
    }

    if (cookie.name && /[\s;,]/.test(cookie.name)) {
      errors.push(
        'Cookie name contains invalid characters (space, semicolon, comma)'
      );
    }

    if (!cookie.secure && cookie.sameSite === 'None') {
      errors.push('SameSite=None requires Secure flag to be set');
    }

    if (cookie.secure && cookie.domain && !cookie.domain.startsWith('.')) {
      const isLocalhost =
        cookie.domain === 'localhost' ||
        cookie.domain.startsWith('127.') ||
        cookie.domain.startsWith('192.168.');
      if (!isLocalhost) {
        warnings.push('Secure cookies should typically use HTTPS');
      }
    }

    if (!cookie.httpOnly && this.isSensitiveName(cookie.name)) {
      warnings.push('Sensitive cookie should have HttpOnly flag for security');
      suggestions.push('Enable HttpOnly to prevent JavaScript access');
    }

    if (!cookie.secure && this.isSensitiveName(cookie.name)) {
      warnings.push('Sensitive cookie should have Secure flag');
      suggestions.push('Enable Secure to ensure HTTPS-only transmission');
    }

    if (cookie.sameSite === 'None' && !this.isThirdPartyCookie(cookie)) {
      warnings.push('SameSite=None is typically for third-party cookies');
      suggestions.push('Consider using Lax or Strict for better security');
    }

    if (!cookie.sameSite || cookie.sameSite === 'unspecified') {
      warnings.push('SameSite attribute not set');
      suggestions.push('Set SameSite to Lax or Strict for CSRF protection');
    }

    if (cookie.expirationDate) {
      const expirationMs = cookie.expirationDate * 1000;
      const now = Date.now();
      const daysUntilExpiry = (expirationMs - now) / (1000 * 60 * 60 * 24);

      if (daysUntilExpiry > 400) {
        warnings.push('Cookie has very long expiration (>400 days)');
        suggestions.push('Consider shorter expiration for better privacy');
      }

      if (expirationMs < now) {
        warnings.push('Cookie is already expired');
      }
    }

    if (cookie.value && cookie.value.length > 4096) {
      warnings.push('Cookie value is very large (>4KB)');
      suggestions.push('Consider storing large data server-side');
    }

    if (cookie.path === '/') {
      warnings.push('Cookie is accessible from all paths');
      suggestions.push('Use specific path for better security isolation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      securityScore: this.calculateSecurityScore(cookie),
    };
  }

  /**
   * Checks if cookie name suggests sensitive data.
   * @param {string} name Cookie name.
   * @return {boolean}
   */
  static isSensitiveName(name) {
    const sensitivePrefixes = [
      'auth',
      'token',
      'session',
      'sess',
      'jwt',
      'api',
      'key',
      'secret',
      'password',
      'pwd',
      'user',
      'login',
    ];
    const lowerName = name.toLowerCase();
    return sensitivePrefixes.some(prefix => lowerName.includes(prefix));
  }

  /**
   * Checks if cookie is likely a third-party cookie.
   * @param {object} cookie Cookie data.
   * @return {boolean}
   */
  static isThirdPartyCookie(cookie) {
    return cookie.domain && cookie.domain.startsWith('.');
  }

  /**
   * Calculates a security score for the cookie (0-100).
   * @param {object} cookie Cookie data.
   * @return {number}
   */
  static calculateSecurityScore(cookie) {
    let score = 0;

    if (cookie.secure) score += 25;
    if (cookie.httpOnly) score += 25;
    if (cookie.sameSite === 'Strict') score += 30;
    else if (cookie.sameSite === 'Lax') score += 20;

    if (cookie.expirationDate) {
      const daysUntilExpiry =
        (cookie.expirationDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 30) score += 10;
      else if (daysUntilExpiry <= 90) score += 5;
    } else {
      score += 10;
    }

    if (cookie.path && cookie.path !== '/') score += 10;

    return Math.min(100, score);
  }

  /**
   * Suggests improvements for a cookie.
   * @param {object} cookie Cookie data.
   * @return {object} Improved cookie configuration.
   */
  static suggestImprovements(cookie) {
    const improved = { ...cookie };

    if (this.isSensitiveName(cookie.name)) {
      improved.secure = true;
      improved.httpOnly = true;
      improved.sameSite = 'Strict';
    }

    if (!improved.sameSite || improved.sameSite === 'unspecified') {
      improved.sameSite = 'Lax';
    }

    if (improved.sameSite === 'None') {
      improved.secure = true;
    }

    return improved;
  }
}

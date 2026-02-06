/**
 * Advanced search and filtering for cookies.
 */
export class CookieSearch {
  /**
   * Searches cookies with advanced filters.
   * @param {object[]} cookies Cookies to search.
   * @param {object} filters Search filters.
   * @return {object[]} Filtered cookies.
   */
  static search(cookies, filters) {
    let results = [...cookies];

    if (filters.name) {
      const regex = this.createRegex(filters.name, filters.nameRegex);
      results = results.filter(c => regex.test(c.name));
    }

    if (filters.value) {
      const regex = this.createRegex(filters.value, filters.valueRegex);
      results = results.filter(c => regex.test(c.value));
    }

    if (filters.domain) {
      const regex = this.createRegex(filters.domain, filters.domainRegex);
      results = results.filter(c => regex.test(c.domain));
    }

    if (filters.path) {
      results = results.filter(c => c.path === filters.path);
    }

    if (filters.secure !== undefined) {
      results = results.filter(c => c.secure === filters.secure);
    }

    if (filters.httpOnly !== undefined) {
      results = results.filter(c => c.httpOnly === filters.httpOnly);
    }

    if (filters.sameSite) {
      results = results.filter(c => c.sameSite === filters.sameSite);
    }

    if (filters.session !== undefined) {
      results = results.filter(c =>
        filters.session ? !c.expirationDate : !!c.expirationDate
      );
    }

    if (filters.expiresAfter) {
      const afterDate = new Date(filters.expiresAfter).getTime() / 1000;
      results = results.filter(
        c => c.expirationDate && c.expirationDate > afterDate
      );
    }

    if (filters.expiresBefore) {
      const beforeDate = new Date(filters.expiresBefore).getTime() / 1000;
      results = results.filter(
        c => c.expirationDate && c.expirationDate < beforeDate
      );
    }

    if (filters.minSize !== undefined) {
      results = results.filter(
        c => c.name.length + c.value.length >= filters.minSize
      );
    }

    if (filters.maxSize !== undefined) {
      results = results.filter(
        c => c.name.length + c.value.length <= filters.maxSize
      );
    }

    if (filters.sortBy) {
      results = this.sortCookies(results, filters.sortBy, filters.sortOrder);
    }

    return results;
  }

  /**
   * Creates a regex from a string pattern.
   * @param {string} pattern Search pattern.
   * @param {boolean} isRegex Whether pattern is regex.
   * @return {RegExp}
   */
  static createRegex(pattern, isRegex = false) {
    if (isRegex) {
      try {
        return new RegExp(pattern, 'i');
      } catch (e) {
        return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    }
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  /**
   * Sorts cookies by a field.
   * @param {object[]} cookies Cookies to sort.
   * @param {string} field Field to sort by.
   * @param {string} order Sort order (asc/desc).
   * @return {object[]}
   */
  static sortCookies(cookies, field, order = 'asc') {
    const sorted = [...cookies].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      if (field === 'size') {
        aVal = a.name.length + a.value.length;
        bVal = b.name.length + b.value.length;
      }

      if (typeof aVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return sorted;
  }

  /**
   * Groups cookies by a field.
   * @param {object[]} cookies Cookies to group.
   * @param {string} field Field to group by.
   * @return {object}
   */
  static groupBy(cookies, field) {
    const groups = {};

    for (const cookie of cookies) {
      let key = cookie[field];

      if (field === 'expiration') {
        if (!cookie.expirationDate) {
          key = 'Session';
        } else {
          const days = Math.ceil(
            (cookie.expirationDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (days < 0) key = 'Expired';
          else if (days <= 1) key = '1 day';
          else if (days <= 7) key = '1 week';
          else if (days <= 30) key = '1 month';
          else if (days <= 90) key = '3 months';
          else if (days <= 365) key = '1 year';
          else key = '>1 year';
        }
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(cookie);
    }

    return groups;
  }

  /**
   * Gets statistics about cookies.
   * @param {object[]} cookies Cookies to analyze.
   * @return {object}
   */
  static getStatistics(cookies) {
    const stats = {
      total: cookies.length,
      secure: 0,
      httpOnly: 0,
      session: 0,
      persistent: 0,
      sameSite: { Strict: 0, Lax: 0, None: 0, unspecified: 0 },
      totalSize: 0,
      avgSize: 0,
      domains: new Set(),
      paths: new Set(),
    };

    for (const cookie of cookies) {
      if (cookie.secure) stats.secure++;
      if (cookie.httpOnly) stats.httpOnly++;
      if (!cookie.expirationDate) stats.session++;
      else stats.persistent++;

      const sameSite = cookie.sameSite || 'unspecified';
      stats.sameSite[sameSite]++;

      const size = cookie.name.length + cookie.value.length;
      stats.totalSize += size;

      stats.domains.add(cookie.domain);
      stats.paths.add(cookie.path);
    }

    stats.avgSize =
      stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0;
    stats.domains = stats.domains.size;
    stats.paths = stats.paths.size;

    return stats;
  }
}

/**
 * Compares cookies between different states or domains.
 */
export class CookieComparison {
  /**
   * Compares two sets of cookies.
   * @param {object[]} cookies1 First set of cookies.
   * @param {object[]} cookies2 Second set of cookies.
   * @return {object} Comparison result.
   */
  static compare(cookies1, cookies2) {
    const map1 = this.createCookieMap(cookies1);
    const map2 = this.createCookieMap(cookies2);

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    for (const [key, cookie2] of map2.entries()) {
      if (!map1.has(key)) {
        added.push(cookie2);
      } else {
        const cookie1 = map1.get(key);
        const diff = this.getDifferences(cookie1, cookie2);
        if (diff.length > 0) {
          modified.push({
            cookie: cookie2,
            differences: diff,
            previous: cookie1,
          });
        } else {
          unchanged.push(cookie2);
        }
      }
    }

    for (const [key, cookie1] of map1.entries()) {
      if (!map2.has(key)) {
        removed.push(cookie1);
      }
    }

    return {
      added,
      removed,
      modified,
      unchanged,
      summary: {
        total1: cookies1.length,
        total2: cookies2.length,
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        unchanged: unchanged.length,
      },
    };
  }

  /**
   * Creates a map of cookies by name+domain.
   * @param {object[]} cookies Cookies array.
   * @return {Map}
   */
  static createCookieMap(cookies) {
    const map = new Map();
    for (const cookie of cookies) {
      const key = `${cookie.name}::${cookie.domain}`;
      map.set(key, cookie);
    }
    return map;
  }

  /**
   * Gets differences between two cookies.
   * @param {object} cookie1 First cookie.
   * @param {object} cookie2 Second cookie.
   * @return {Array} List of differences.
   */
  static getDifferences(cookie1, cookie2) {
    const differences = [];
    const fields = [
      'value',
      'path',
      'secure',
      'httpOnly',
      'sameSite',
      'expirationDate',
    ];

    for (const field of fields) {
      if (cookie1[field] !== cookie2[field]) {
        differences.push({
          field,
          oldValue: cookie1[field],
          newValue: cookie2[field],
        });
      }
    }

    return differences;
  }

  /**
   * Generates a diff report in text format.
   * @param {object} comparison Comparison result.
   * @return {string} Text report.
   */
  static generateReport(comparison) {
    let report = '=== Cookie Comparison Report ===\n\n';

    report += `Summary:\n`;
    report += `  Total (Before): ${comparison.summary.total1}\n`;
    report += `  Total (After): ${comparison.summary.total2}\n`;
    report += `  Added: ${comparison.summary.added}\n`;
    report += `  Removed: ${comparison.summary.removed}\n`;
    report += `  Modified: ${comparison.summary.modified}\n`;
    report += `  Unchanged: ${comparison.summary.unchanged}\n\n`;

    if (comparison.added.length > 0) {
      report += `Added Cookies (${comparison.added.length}):\n`;
      for (const cookie of comparison.added) {
        report += `  + ${cookie.name} (${cookie.domain})\n`;
      }
      report += '\n';
    }

    if (comparison.removed.length > 0) {
      report += `Removed Cookies (${comparison.removed.length}):\n`;
      for (const cookie of comparison.removed) {
        report += `  - ${cookie.name} (${cookie.domain})\n`;
      }
      report += '\n';
    }

    if (comparison.modified.length > 0) {
      report += `Modified Cookies (${comparison.modified.length}):\n`;
      for (const item of comparison.modified) {
        report += `  ~ ${item.cookie.name} (${item.cookie.domain})\n`;
        for (const diff of item.differences) {
          report += `    ${diff.field}: ${diff.oldValue} → ${diff.newValue}\n`;
        }
      }
    }

    return report;
  }

  /**
   * Exports comparison as JSON.
   * @param {object} comparison Comparison result.
   * @return {string} JSON string.
   */
  static exportAsJson(comparison) {
    return JSON.stringify(comparison, null, 2);
  }
}

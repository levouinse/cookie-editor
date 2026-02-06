/**
 * Monitors cookie changes and triggers alerts based on rules.
 */
export class CookieMonitor {
  /**
   * Constructs a CookieMonitor.
   * @param {GenericStorageHandler} storageHandler
   * @param {BrowserDetector} browserDetector
   */
  constructor(storageHandler, browserDetector) {
    this.storageHandler = storageHandler;
    this.browserDetector = browserDetector;
    this.rulesKey = 'cookie_monitor_rules';
    this.logsKey = 'cookie_monitor_logs';
    this.maxLogs = 1000;
  }

  /**
   * Adds a monitoring rule.
   * @param {object} rule Monitoring rule.
   * @return {Promise<void>}
   */
  async addRule(rule) {
    const rules = await this.getRules();
    rule.id = Date.now() + Math.random();
    rule.enabled = rule.enabled !== false;
    rule.createdAt = Date.now();
    rules.push(rule);
    await this.storageHandler.setLocal(this.rulesKey, rules);
  }

  /**
   * Gets all monitoring rules.
   * @return {Promise<Array>}
   */
  async getRules() {
    return (await this.storageHandler.getLocal(this.rulesKey)) || [];
  }

  /**
   * Updates a monitoring rule.
   * @param {string} ruleId Rule ID.
   * @param {object} updates Updates to apply.
   * @return {Promise<void>}
   */
  async updateRule(ruleId, updates) {
    const rules = await this.getRules();
    const index = rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      rules[index] = { ...rules[index], ...updates };
      await this.storageHandler.setLocal(this.rulesKey, rules);
    }
  }

  /**
   * Deletes a monitoring rule.
   * @param {string} ruleId Rule ID.
   * @return {Promise<void>}
   */
  async deleteRule(ruleId) {
    const rules = await this.getRules();
    const filtered = rules.filter(r => r.id !== ruleId);
    await this.storageHandler.setLocal(this.rulesKey, filtered);
  }

  /**
   * Checks if a cookie change matches any rules.
   * @param {object} changeInfo Cookie change information.
   * @return {Promise<Array>} Matched rules.
   */
  async checkRules(changeInfo) {
    const rules = await this.getRules();
    const matched = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      if (this.matchesRule(changeInfo, rule)) {
        matched.push(rule);
        await this.logEvent(rule, changeInfo);

        if (rule.action === 'notify') {
          this.sendNotification(rule, changeInfo);
        } else if (rule.action === 'block') {
          // Block would need to be implemented in the cookie handler
          console.log('Block action triggered for rule:', rule.name);
        }
      }
    }

    return matched;
  }

  /**
   * Checks if a change matches a rule.
   * @param {object} changeInfo Cookie change information.
   * @param {object} rule Monitoring rule.
   * @return {boolean}
   */
  matchesRule(changeInfo, rule) {
    const cookie = changeInfo.cookie;

    if (rule.cookieName && !this.matchPattern(cookie.name, rule.cookieName)) {
      return false;
    }

    if (rule.domain && !this.matchPattern(cookie.domain, rule.domain)) {
      return false;
    }

    if (
      rule.changeType &&
      changeInfo.removed !== (rule.changeType === 'delete')
    ) {
      if (rule.changeType === 'create' && changeInfo.cause !== 'explicit') {
        return false;
      }
      if (rule.changeType === 'modify' && changeInfo.cause !== 'overwrite') {
        return false;
      }
    }

    if (rule.conditions) {
      if (
        rule.conditions.secure !== undefined &&
        cookie.secure !== rule.conditions.secure
      ) {
        return false;
      }
      if (
        rule.conditions.httpOnly !== undefined &&
        cookie.httpOnly !== rule.conditions.httpOnly
      ) {
        return false;
      }
      if (
        rule.conditions.sameSite &&
        cookie.sameSite !== rule.conditions.sameSite
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Matches a value against a pattern (supports wildcards).
   * @param {string} value Value to match.
   * @param {string} pattern Pattern to match against.
   * @return {boolean}
   */
  matchPattern(value, pattern) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return regex.test(value);
  }

  /**
   * Logs a monitoring event.
   * @param {object} rule Matched rule.
   * @param {object} changeInfo Cookie change information.
   * @return {Promise<void>}
   */
  async logEvent(rule, changeInfo) {
    const logs = await this.getLogs();

    logs.unshift({
      timestamp: Date.now(),
      ruleId: rule.id,
      ruleName: rule.name,
      cookie: changeInfo.cookie,
      removed: changeInfo.removed,
      cause: changeInfo.cause,
    });

    if (logs.length > this.maxLogs) {
      logs.splice(this.maxLogs);
    }

    await this.storageHandler.setLocal(this.logsKey, logs);
  }

  /**
   * Gets monitoring logs.
   * @param {number} limit Maximum number of logs to return.
   * @return {Promise<Array>}
   */
  async getLogs(limit = 100) {
    const logs = (await this.storageHandler.getLocal(this.logsKey)) || [];
    return logs.slice(0, limit);
  }

  /**
   * Clears monitoring logs.
   * @return {Promise<void>}
   */
  async clearLogs() {
    await this.storageHandler.setLocal(this.logsKey, []);
  }

  /**
   * Sends a browser notification.
   * @param {object} rule Matched rule.
   * @param {object} changeInfo Cookie change information.
   */
  sendNotification(rule, changeInfo) {
    const cookie = changeInfo.cookie;
    const action = changeInfo.removed ? 'deleted' : 'modified';

    if (this.browserDetector.getApi().notifications) {
      this.browserDetector.getApi().notifications.create({
        type: 'basic',
        iconUrl: 'icons/cookie-48-filled.png',
        title: `Cookie Monitor: ${rule.name}`,
        message: `Cookie "${cookie.name}" was ${action} on ${cookie.domain}`,
      });
    }
  }

  /**
   * Gets statistics about monitoring.
   * @return {Promise<object>}
   */
  async getStatistics() {
    const logs = await this.getLogs(this.maxLogs);
    const rules = await this.getRules();

    const stats = {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
      totalEvents: logs.length,
      eventsByRule: {},
      recentEvents: logs.slice(0, 10),
    };

    for (const log of logs) {
      if (!stats.eventsByRule[log.ruleName]) {
        stats.eventsByRule[log.ruleName] = 0;
      }
      stats.eventsByRule[log.ruleName]++;
    }

    return stats;
  }
}

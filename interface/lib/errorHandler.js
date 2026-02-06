/**
 * Centralized error handling and logging system.
 */
export class ErrorHandler {
  /**
   * Constructs an ErrorHandler.
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(storageHandler) {
    this.storageHandler = storageHandler;
    this.errorLogKey = 'error_logs';
    this.maxLogs = 100;
  }

  /**
   * Handles and logs an error.
   * @param {Error|string} error Error to handle.
   * @param {object} context Additional context.
   * @return {Promise<void>}
   */
  async handleError(error, context = {}) {
    const errorLog = {
      timestamp: Date.now(),
      message: error.message || error,
      stack: error.stack || null,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Error occurred:', errorLog);

    const logs = await this.getErrorLogs();
    logs.unshift(errorLog);

    if (logs.length > this.maxLogs) {
      logs.splice(this.maxLogs);
    }

    await this.storageHandler.setLocal(this.errorLogKey, logs);
  }

  /**
   * Gets error logs.
   * @param {number} limit Maximum number of logs to return.
   * @return {Promise<Array>}
   */
  async getErrorLogs(limit = 50) {
    const logs = (await this.storageHandler.getLocal(this.errorLogKey)) || [];
    return logs.slice(0, limit);
  }

  /**
   * Clears error logs.
   * @return {Promise<void>}
   */
  async clearErrorLogs() {
    await this.storageHandler.setLocal(this.errorLogKey, []);
  }

  /**
   * Exports error logs as text.
   * @return {Promise<string>}
   */
  async exportErrorLogs() {
    const logs = await this.getErrorLogs(this.maxLogs);
    let text = '=== Cookie-Editor Error Logs ===\n\n';

    for (const log of logs) {
      text += `[${new Date(log.timestamp).toISOString()}]\n`;
      text += `Message: ${log.message}\n`;
      if (log.context && Object.keys(log.context).length > 0) {
        text += `Context: ${JSON.stringify(log.context)}\n`;
      }
      if (log.stack) {
        text += `Stack: ${log.stack}\n`;
      }
      text += '\n';
    }

    return text;
  }

  /**
   * Gets error statistics.
   * @return {Promise<object>}
   */
  async getStatistics() {
    const logs = await this.getErrorLogs(this.maxLogs);

    const stats = {
      total: logs.length,
      last24h: 0,
      byType: {},
      mostRecent: logs[0] || null,
    };

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const log of logs) {
      if (log.timestamp > oneDayAgo) {
        stats.last24h++;
      }

      const errorType = this.categorizeError(log.message);
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Categorizes an error by its message.
   * @param {string} message Error message.
   * @return {string}
   */
  categorizeError(message) {
    if (message.includes('permission')) return 'Permission';
    if (message.includes('network') || message.includes('fetch'))
      return 'Network';
    if (message.includes('cookie')) return 'Cookie Operation';
    if (message.includes('storage')) return 'Storage';
    return 'Other';
  }
}

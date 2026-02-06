/**
 * Manages cookie operation history for undo/redo functionality.
 */
export class CookieHistory {
  /**
   * Constructs a CookieHistory manager.
   * @param {GenericStorageHandler} storageHandler
   * @param {GenericCookieHandler} cookieHandler
   */
  constructor(storageHandler, cookieHandler) {
    this.storageHandler = storageHandler;
    this.cookieHandler = cookieHandler;
    this.historyKey = 'cookie_history';
    this.maxHistorySize = 50;
  }

  /**
   * Records a cookie operation.
   * @param {string} operation Type of operation (create, edit, delete).
   * @param {object} cookie Cookie data.
   * @param {object} previousState Previous cookie state (for edit/delete).
   * @return {Promise<void>}
   */
  async recordOperation(operation, cookie, previousState = null) {
    const history = await this.getHistory();

    const entry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      operation,
      cookie,
      previousState,
      url: this.cookieHandler.currentTab?.url,
    };

    history.unshift(entry);

    if (history.length > this.maxHistorySize) {
      history.splice(this.maxHistorySize);
    }

    await this.storageHandler.setLocal(this.historyKey, history);
  }

  /**
   * Gets the operation history.
   * @return {Promise<Array>}
   */
  async getHistory() {
    const history = await this.storageHandler.getLocal(this.historyKey);
    return history || [];
  }

  /**
   * Undoes the last operation.
   * @return {Promise<boolean>} True if undo was successful.
   */
  async undo() {
    const history = await this.getHistory();

    if (history.length === 0) {
      return false;
    }

    const lastEntry = history[0];

    try {
      switch (lastEntry.operation) {
        case 'create':
          await new Promise((resolve, reject) => {
            this.cookieHandler.removeCookie(
              lastEntry.cookie.name,
              lastEntry.url,
              error => (error ? reject(error) : resolve())
            );
          });
          break;

        case 'edit':
          if (lastEntry.previousState) {
            await new Promise((resolve, reject) => {
              this.cookieHandler.saveCookie(
                lastEntry.previousState,
                lastEntry.url,
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
          }
          break;

        case 'delete':
          if (lastEntry.previousState) {
            await new Promise((resolve, reject) => {
              this.cookieHandler.saveCookie(
                lastEntry.previousState,
                lastEntry.url,
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
          }
          break;
      }

      history.shift();
      await this.storageHandler.setLocal(this.historyKey, history);
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  }

  /**
   * Clears the history.
   * @return {Promise<void>}
   */
  async clearHistory() {
    await this.storageHandler.setLocal(this.historyKey, []);
  }

  /**
   * Gets history for a specific domain.
   * @param {string} domain Domain to filter by.
   * @return {Promise<Array>}
   */
  async getHistoryForDomain(domain) {
    const history = await this.getHistory();
    return history.filter(
      entry =>
        entry.cookie.domain === domain || entry.cookie.domain === '.' + domain
    );
  }
}

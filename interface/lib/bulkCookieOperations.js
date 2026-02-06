/**
 * Handles bulk operations on cookies.
 */
export class BulkCookieOperations {
  /**
   * Constructs a BulkCookieOperations handler.
   * @param {GenericCookieHandler} cookieHandler
   */
  constructor(cookieHandler) {
    this.cookieHandler = cookieHandler;
  }

  /**
   * Edits multiple cookies at once based on a filter.
   * @param {function} filterFn Function to filter cookies.
   * @param {object} updates Properties to update.
   * @param {function} callback
   */
  async bulkEdit(filterFn, updates, callback) {
    this.cookieHandler.getAllCookies(async cookies => {
      const filtered = cookies.filter(filterFn);
      const results = [];

      for (const cookie of filtered) {
        const updated = { ...cookie, ...updates };
        try {
          await new Promise((resolve, reject) => {
            this.cookieHandler.saveCookie(
              updated,
              this.cookieHandler.currentTab.url,
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
          });
          results.push({ success: true, cookie: updated });
        } catch (error) {
          results.push({ success: false, cookie, error });
        }
      }

      callback(results);
    });
  }

  /**
   * Deletes multiple cookies based on a filter.
   * @param {function} filterFn Function to filter cookies.
   * @param {function} callback
   */
  async bulkDelete(filterFn, callback) {
    this.cookieHandler.getAllCookies(async cookies => {
      const filtered = cookies.filter(filterFn);
      const results = [];

      for (const cookie of filtered) {
        try {
          await new Promise((resolve, reject) => {
            this.cookieHandler.removeCookie(
              cookie.name,
              this.cookieHandler.currentTab.url,
              error => {
                if (error) reject(error);
                else resolve();
              }
            );
          });
          results.push({ success: true, cookie });
        } catch (error) {
          results.push({ success: false, cookie, error });
        }
      }

      callback(results);
    });
  }

  /**
   * Exports cookies based on a filter.
   * @param {function} filterFn Function to filter cookies.
   * @return {Promise<object[]>} Filtered cookies.
   */
  async filterExport(filterFn) {
    return new Promise(resolve => {
      this.cookieHandler.getAllCookies(cookies => {
        resolve(cookies.filter(filterFn));
      });
    });
  }
}

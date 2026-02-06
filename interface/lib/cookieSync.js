/**
 * Manages cookie synchronization across devices using browser sync storage.
 */
export class CookieSync {
  /**
   * Constructs a CookieSync manager.
   * @param {BrowserDetector} browserDetector
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(browserDetector, storageHandler) {
    this.browserDetector = browserDetector;
    this.storageHandler = storageHandler;
    this.syncKey = 'cookie_sync_profiles';
  }

  /**
   * Saves current cookies as a sync profile.
   * @param {string} profileName Profile name.
   * @param {object[]} cookies Cookies to sync.
   * @param {object} options Sync options.
   * @return {Promise<void>}
   */
  async saveProfile(profileName, cookies, options = {}) {
    const profiles = await this.getProfiles();

    const profile = {
      name: profileName,
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
      })),
      timestamp: Date.now(),
      options: {
        autoSync: options.autoSync || false,
        syncDomains: options.syncDomains || [],
        excludePatterns: options.excludePatterns || [],
      },
    };

    profiles[profileName] = profile;

    if (this.browserDetector.getApi().storage.sync) {
      await this.browserDetector.getApi().storage.sync.set({
        [this.syncKey]: profiles,
      });
    } else {
      await this.storageHandler.setLocal(this.syncKey, profiles);
    }
  }

  /**
   * Gets all sync profiles.
   * @return {Promise<object>}
   */
  async getProfiles() {
    if (this.browserDetector.getApi().storage.sync) {
      const result = await this.browserDetector
        .getApi()
        .storage.sync.get(this.syncKey);
      return result[this.syncKey] || {};
    } else {
      return (await this.storageHandler.getLocal(this.syncKey)) || {};
    }
  }

  /**
   * Loads a sync profile.
   * @param {string} profileName Profile name.
   * @return {Promise<object>}
   */
  async loadProfile(profileName) {
    const profiles = await this.getProfiles();
    return profiles[profileName] || null;
  }

  /**
   * Deletes a sync profile.
   * @param {string} profileName Profile name.
   * @return {Promise<void>}
   */
  async deleteProfile(profileName) {
    const profiles = await this.getProfiles();
    delete profiles[profileName];

    if (this.browserDetector.getApi().storage.sync) {
      await this.browserDetector.getApi().storage.sync.set({
        [this.syncKey]: profiles,
      });
    } else {
      await this.storageHandler.setLocal(this.syncKey, profiles);
    }
  }

  /**
   * Applies a profile to current browser.
   * @param {string} profileName Profile name.
   * @param {GenericCookieHandler} cookieHandler Cookie handler.
   * @param {string} currentUrl Current URL.
   * @return {Promise<object>} Result with success/failure counts.
   */
  async applyProfile(profileName, cookieHandler, currentUrl) {
    const profile = await this.loadProfile(profileName);

    if (!profile) {
      throw new Error('Profile not found');
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const cookie of profile.cookies) {
      try {
        await new Promise((resolve, reject) => {
          cookieHandler.saveCookie(cookie, currentUrl, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ cookie: cookie.name, error: error.message });
      }
    }

    return results;
  }

  /**
   * Checks if sync is available.
   * @return {boolean}
   */
  isSyncAvailable() {
    return typeof this.browserDetector.getApi().storage.sync !== 'undefined';
  }
}

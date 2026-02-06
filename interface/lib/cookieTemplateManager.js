/**
 * Manages cookie templates for quick creation.
 */
export class CookieTemplateManager {
  /**
   * Constructs a CookieTemplateManager.
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(storageHandler) {
    this.storageHandler = storageHandler;
    this.templatesKey = 'cookie_templates';
  }

  /**
   * Saves a cookie as a template.
   * @param {string} name Template name.
   * @param {object} cookie Cookie data.
   * @return {Promise<void>}
   */
  async saveTemplate(name, cookie) {
    const templates = await this.getTemplates();
    templates[name] = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDays: cookie.expirationDate
        ? Math.ceil(
            (cookie.expirationDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : null,
    };
    await this.storageHandler.setLocal(this.templatesKey, templates);
  }

  /**
   * Gets all saved templates.
   * @return {Promise<object>}
   */
  async getTemplates() {
    const templates = await this.storageHandler.getLocal(this.templatesKey);
    return templates || {};
  }

  /**
   * Deletes a template.
   * @param {string} name Template name.
   * @return {Promise<void>}
   */
  async deleteTemplate(name) {
    const templates = await this.getTemplates();
    delete templates[name];
    await this.storageHandler.setLocal(this.templatesKey, templates);
  }

  /**
   * Applies a template to create a new cookie.
   * @param {string} templateName Template name.
   * @param {object} overrides Properties to override.
   * @return {Promise<object>} Cookie object ready to be saved.
   */
  async applyTemplate(templateName, overrides = {}) {
    const templates = await this.getTemplates();
    const template = templates[templateName];

    if (!template) {
      throw new Error('Template not found');
    }

    const cookie = { ...template };

    if (template.expirationDays !== null) {
      cookie.expirationDate = Math.floor(
        (Date.now() + template.expirationDays * 24 * 60 * 60 * 1000) / 1000
      );
    }
    delete cookie.expirationDays;

    return { ...cookie, ...overrides };
  }

  /**
   * Gets common cookie presets.
   * @return {object} Preset templates.
   */
  static getPresets() {
    return {
      'Session Cookie': {
        name: 'session_id',
        value: '',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        expirationDays: null,
      },
      'Auth Token': {
        name: 'auth_token',
        value: '',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expirationDays: 7,
      },
      'Tracking Cookie': {
        name: 'tracking_id',
        value: '',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'None',
        expirationDays: 365,
      },
      'Preference Cookie': {
        name: 'user_pref',
        value: '',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDays: 30,
      },
    };
  }
}

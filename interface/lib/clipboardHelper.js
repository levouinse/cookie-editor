/**
 * Modern clipboard helper using Clipboard API with fallback.
 */
export class ClipboardHelper {
  /**
   * Copies text to clipboard using modern API with fallback.
   * @param {string} text Text to copy.
   * @return {Promise<boolean>} True if successful.
   */
  static async copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return this.fallbackCopy(text);
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return this.fallbackCopy(text);
    }
  }

  /**
   * Fallback copy method using textarea.
   * @param {string} text Text to copy.
   * @return {boolean} True if successful.
   */
  static fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      document.body.removeChild(textarea);
      return false;
    }
  }

  /**
   * Reads text from clipboard.
   * @return {Promise<string>} Clipboard text.
   */
  static async read() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      throw new Error('Clipboard read not supported');
    } catch (error) {
      console.error('Clipboard read failed:', error);
      throw error;
    }
  }

  /**
   * Checks if clipboard API is available.
   * @return {boolean} True if available.
   */
  static isAvailable() {
    return !!(navigator.clipboard && navigator.clipboard.writeText);
  }
}

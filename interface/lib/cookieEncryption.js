/**
 * Handles encryption and decryption of cookies for secure export/import.
 */
export class CookieEncryption {
  /**
   * Encrypts cookie data with a password.
   * @param {string} data Cookie data to encrypt.
   * @param {string} password Password for encryption.
   * @return {Promise<string>} Encrypted data.
   */
  static async encrypt(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const passwordBuffer = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', passwordBuffer),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...result));
  }

  /**
   * Decrypts cookie data with a password.
   * @param {string} encryptedData Encrypted cookie data.
   * @param {string} password Password for decryption.
   * @return {Promise<string>} Decrypted data.
   */
  static async decrypt(encryptedData, password) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const passwordBuffer = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', passwordBuffer),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  }
}

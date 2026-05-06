/*
 * Ezkey - Open Source Cryptographic MFA Platform
 *
 * Copyright (c) 2025 Ezkey contributors
 * Licensed under the MIT License. See LICENSE file in the project root for full license information.
 */

/**
 * Thrown when the Integration API returns a non-success status or the response cannot be parsed.
 */
export class EzkeyIntegrationError extends Error {
  /**
   * @param message - Operator-safe summary
   * @param statusCode - HTTP status when available (0 when unknown)
   * @param responseBody - Raw body (truncate in logs if sensitive)
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(message);
    this.name = 'EzkeyIntegrationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

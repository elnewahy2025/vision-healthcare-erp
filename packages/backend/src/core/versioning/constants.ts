// ============================================
// API Versioning Constants
// ============================================

/** Currently supported API versions in order of precedence */
export const SUPPORTED_VERSIONS = ['v1'] as const;

/** The current (default) API version used when no version is specified */
export const CURRENT_VERSION = 'v1';

/** Oldest supported version — requests below this are rejected */
export const MINIMUM_VERSION = 'v1';

/** Deprecation sunset dates for old versions (ISO-8601) */
export const VERSION_SUNSET: Record<string, string> = {
  // v1 has no sunset yet
};

/** Custom header for explicit version selection */
export const VERSION_HEADER = 'X-API-Version';

/** Response header that echoes the resolved version */
export const VERSION_RESPONSE_HEADER = 'X-API-Version-Resolved';

/** Response header for deprecation warnings */
export const DEPRECATION_HEADER = 'Deprecation';

/** Response header for sunset date */
export const SUNSET_HEADER = 'Sunset';

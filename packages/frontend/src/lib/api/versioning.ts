// ============================================
// Frontend API Versioning Constants
// ============================================

/** Current API version — must match backend CURRENT_VERSION */
export const API_VERSION = 'v1' as const;

/** Custom header name for explicit version selection */
export const VERSION_HEADER = 'X-API-Version' as const;

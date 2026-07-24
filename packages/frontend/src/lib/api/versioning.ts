// ============================================
// Frontend API Versioning Constants
// ============================================

/** Current API version — must match backend CURRENT_VERSION */
export const API_VERSION = 'v1' as const;

/** Full API base path including version */
export const API_V1_BASE = `/api/${API_VERSION}` as const;

/** Custom header name for explicit version selection */
export const VERSION_HEADER = 'X-API-Version' as const;

/** Response header that echoes the resolved server version */
export const VERSION_RESPONSE_HEADER = 'X-API-Version-Resolved' as const;

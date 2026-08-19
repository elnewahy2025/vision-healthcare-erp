/**
 * Menu filtering utility per AUTHORIZATION-SOUND-OF-TRUTH.md §7.4.
 *
 * Filters navigation menu items based on user permissions.
 * The sidebar already does this inline, but this utility provides
 * a reusable, testable function for any menu-like structure.
 */

export interface MenuItem {
  label: string;
  path: string;
  permission?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

/**
 * Filter a menu tree by permissions.
 * Items without a permission requirement are always visible.
 * Items with a permission requirement are visible only if the user has it.
 * Empty parent groups (where all children are filtered out) are removed.
 */
export function filterMenu(
  items: MenuItem[],
  hasPermission: (permission: string) => boolean,
): MenuItem[] {
  return items
    .filter((item) => !item.permission || hasPermission(item.permission))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenu(item.children, hasPermission)
        : undefined,
    }))
    .filter((item) => {
      // Remove groups with no visible children
      if (item.children && item.children.length === 0) return false;
      return true;
    });
}

/**
 * Check if a route path requires a permission the user doesn't have.
 * Useful for route guards that don't use <ProtectedRoute>.
 */
export function canAccessRoute(
  path: string,
  routePermissions: Record<string, string>,
  hasPermission: (permission: string) => boolean,
): boolean {
  const required = routePermissions[path];
  if (!required) return true; // No permission required
  return hasPermission(required);
}

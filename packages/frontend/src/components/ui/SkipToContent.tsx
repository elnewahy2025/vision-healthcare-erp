/**
 * Skip-to-content link for keyboard accessibility.
 * Renders a visually hidden link that becomes visible on focus.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      Skip to main content
    </a>
  );
}

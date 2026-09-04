/**
 * The server sends bare officer paths ("/complaint/12") in search hits and in notification rows —
 * including rows stored before the app moved under /app. Prefixing at the point of navigation
 * covers both without a data migration.
 */
export const appPath = (link: string): string => (link.startsWith('/app/') ? link : '/app' + link);

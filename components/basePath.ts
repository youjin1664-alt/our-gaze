// Mirrors next.config.ts's basePath for plain asset URLs (e.g. CSS
// background-image) that next/image and next/link don't auto-prefix.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

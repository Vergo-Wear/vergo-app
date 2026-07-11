export function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

/** Only return to known workspace routes; never redirect to external URLs. */
export function authDestination(value: unknown): string {
  if (typeof value !== "string" || /[\\\x00-\x20]/.test(value)) return "/panel";
  const pathname = value.split(/[?#]/, 1)[0];
  return /^\/(panel|predicciones\/nueva|historial(?:\/[a-zA-Z0-9_-]+)?)$/.test(pathname) ? value : "/panel";
}

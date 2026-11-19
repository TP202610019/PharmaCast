export const DEMO_ACCESS_EVENT = "pharmacast:demo-access-required";

export function isDemoEmail(email?: string | null): boolean {
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL || "test@pharmacy.dev";
  return !!email && email.trim().toLowerCase() === demoEmail.trim().toLowerCase();
}

export function requestDemoAccess() {
  window.dispatchEvent(new Event(DEMO_ACCESS_EVENT));
}

export function isDemoWrite(method: string, path: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return false;
  return !/^\/api\/auth\/(login|demo|register|refresh|logout)\/?$/.test(path.split("?")[0]);
}

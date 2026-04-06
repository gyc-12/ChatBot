/**
 * Platform detection utilities.
 * Keep checks dynamic so Tauri globals injected after module evaluation
 * are still observed by callers in dev and mobile webviews.
 */

function getWindowObject(): Record<string, unknown> {
  return typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
}

function getUserAgent(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

/** Running inside a Tauri webview (desktop or mobile) */
export function isTauri(): boolean {
  const windowObject = getWindowObject();
  return "__TAURI_INTERNALS__" in windowObject || "__TAURI__" in windowObject;
}

/** Running on Android (Tauri mobile) */
export function isAndroid(): boolean {
  const windowObject = getWindowObject();
  return !!windowObject.__TAURI_ANDROID__ || /android/i.test(getUserAgent());
}

/** Running on iOS (Tauri mobile) */
export function isIOS(): boolean {
  const windowObject = getWindowObject();
  return !!windowObject.__TAURI_IOS__ || /iphone|ipad|ipod/i.test(getUserAgent());
}

/** Running on mobile (Android or iOS) */
export function isMobile(): boolean {
  return isAndroid() || isIOS();
}

/** Running on desktop Tauri (macOS / Windows / Linux) */
export function isDesktop(): boolean {
  return isTauri() && !isMobile();
}

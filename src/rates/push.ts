// Phone / computer notifications (Web Push).

export interface PushSupport {
  supported: boolean;
  isIos: boolean;
  installed: boolean; // running as the Home Screen app
  reason?: string;
}

export function pushSupport(): PushSupport {
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & { standalone?: boolean };
  const installed = nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  const has = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos && !installed) {
    return { supported: false, isIos, installed, reason: 'On iPhone, add this app to your Home Screen first (Share button > Add to Home Screen), then open it from there.' };
  }
  if (!has) return { supported: false, isIos, installed, reason: 'This browser does not support notifications.' };
  return { supported: true, isIos, installed };
}

function keyToBytes(base64: string): BufferSource {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out as unknown as BufferSource;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Must be called from a button tap (iPhone requires it). Returns the subscription to save on the server. */
export async function subscribeThisDevice(vapidPublicKey: string): Promise<PushSubscription> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were not allowed. Allow them in the phone settings for this app and try again.');
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapidPublicKey) });
}

export async function unsubscribeThisDevice(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export function deviceLabel(): string {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Windows/.test(ua)) return 'Windows computer';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Device';
}

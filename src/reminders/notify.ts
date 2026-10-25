// Turning phone / computer notifications on and off for THIS device (shared by Today, Settings and the Rates Desk).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { pushSupport, currentSubscription, subscribeThisDevice, unsubscribeThisDevice, deviceLabel } from '../rates/push';
import { ratesCall, RatesStatus } from '../rates/api';

export function useNotifications() {
  const support = useMemo(() => pushSupport(), []);
  const [on, setOn] = useState<boolean | null>(null); // null = not known yet
  const [busy, setBusy] = useState(false);
  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  useEffect(() => { currentSubscription().then(s => setOn(!!s)).catch(() => setOn(false)); }, []);

  /** Must be called from a tap. Throws a plain-words Error when it cannot be done. */
  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const st = await ratesCall<RatesStatus>('status');
      const sub = await subscribeThisDevice(st.vapidPublicKey);
      await ratesCall('subscribe', { subscription: sub.toJSON(), label: deviceLabel() });
      setOn(true);
    } finally { setBusy(false); }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const ep = await unsubscribeThisDevice();
      if (ep) await ratesCall('unsubscribe', { endpoint: ep });
      setOn(false);
    } finally { setBusy(false); }
  }, []);

  return { support, on, busy, denied, enable, disable };
}

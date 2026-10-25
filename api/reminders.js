// Contract reminders endpoint (loading and payment reminders). The rules are in /server/reminders.
import { makeHandler } from '../server/reminders/handler.js';
import { createReminders } from '../server/reminders/service.js';
import { makeReminderStore } from '../server/reminders/store.js';
import { getAdmin, makeStore } from '../server/rates/store.js';
import { createPush } from '../server/rates/push.js';

let built = null;
async function deps() {
  if (built) return built;
  const { db, auth } = await getAdmin();
  const ratesStore = makeStore(db);
  const push = createPush({ store: ratesStore });
  const reminders = createReminders({ store: makeReminderStore(db), push, subsStore: ratesStore });
  built = { reminders, auth, cronKey: async () => (await ratesStore.getSecrets()).cronKey || null, env: process.env };
  return built;
}

export default makeHandler(deps);

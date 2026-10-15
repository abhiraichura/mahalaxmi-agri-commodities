// Rates Desk server endpoint (live NCDEX rates -> message -> notification).
// Everything real is in /server/rates; this file only connects it to Firebase.
import { makeHandler } from '../server/rates/handler.js';
import { getAdmin, makeStore } from '../server/rates/store.js';
import { createService } from '../server/rates/service.js';
import { createPush } from '../server/rates/push.js';

let built = null;
async function deps() {
  if (built) return built;
  const { db, auth } = await getAdmin();
  const store = makeStore(db);
  const push = createPush({ store });
  built = { service: createService({ store, push }), auth };
  return built;
}

export default makeHandler(deps);

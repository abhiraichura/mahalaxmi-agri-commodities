# Update: Rates Desk (live rates message, phone notifications, one-tap WhatsApp)

## What is new

A new page called **Rates Desk** (left menu, below Products). It does the job your Grok automation does, inside your own app:

1. **Builds the rates message** in exactly your Grok format: Jeera and Dhaniya (nearest expiry) with LTP, change, change % and OI, 🟩 🟥 ➖ icons, "Movement Since Previous Update", the pure-Hindi Quick Outlook (2-3 sentences per commodity) and your company footer.
2. **Runs by itself at 10 AM, 12 PM, 2 PM, 4 PM and 5 PM (Indian time, Monday to Friday)** and does nothing outside those times (the same as your "SKIP" rule).
3. **Sends a notification to your phone** when an update is ready ("📊 2 PM update ready"). Tap it and the message opens in the app, ready to send.
4. **One-tap WhatsApp**: "Send on WhatsApp" opens WhatsApp with the whole message already typed. "Send to my client lists" hands the message to your existing WhatsApp Broadcast page.
5. **If NCDEX does not give fresh numbers, the app never sends old numbers as if they were live.** It sends you a "⚠️ rates need you" notification instead, and you can fix it in 30 seconds with **Paste board text** (copy the board from the NCDEX site on your phone and paste) or **Type the numbers**. The message is built the same way from either.

Also fixed on the way: the "WhatsApp Broadcast" menu item had a wrong icon name, so it showed no icon. It now shows a proper icon.

## Files in this zip (upload all, same folders, replace when asked)

```
RATES_DESK_GUIDE.md                    (this guide, optional to upload)
package.json                           (2 new libraries: firebase-admin, web-push)
vercel.json                            (notification file not cached, Mumbai region, 60 s limit for the rates server)
vite.config.ts                         (loads the notification handler into the app's service worker)
api/rates.js                           (new)
server/rates/ist.js                    (new)
server/rates/parse.js                  (new)
server/rates/hindi.js                  (new)
server/rates/message.js                (new)
server/rates/fetchBoard.js             (new)
server/rates/store.js                  (new)
server/rates/push.js                   (new)
server/rates/telegram.js               (new)
server/rates/service.js                (new)
server/rates/handler.js                (new)
public/push-sw.js                      (new)
src/rates/api.ts                       (new)
src/rates/push.ts                      (new)
src/pages/RatesDesk.tsx                (new)
src/App.tsx                            (2 lines added: the /rates page)
src/components/Layout.tsx              (menu item "Rates Desk" + icon fix for WhatsApp Broadcast)
src/pages/WhatsAppBroadcast.tsx        (8 lines added: can receive a message from the Rates Desk)
```

Nothing else in the app was touched. Your existing screens, contracts, bills and WhatsApp lists work exactly as before. `server/` is a new folder at the top of the project (next to `src` and `api`).

**Important about `WhatsAppBroadcast.tsx`:** it is based on the newest version in your GitHub (with your 13 Oct changes). Only the small "receive a message" block was added.

## One-time setup (about 15 minutes)

### Step 1: Upload and let Vercel build
Upload the files to GitHub (same folders). Vercel builds automatically. The first build takes a little longer because it installs the two new libraries.

### Step 2: Give the app's server permission to use your Firebase (once)
The rates server saves its own data (rate history, phone notification addresses) in your Firebase, so it needs a key.

1. Open the Firebase console, open your project, click the gear icon, **Project settings**.
2. Open the **Service accounts** tab, click **Generate new private key**, confirm. A small file ending in `.json` downloads.
3. Open Vercel, your project, **Settings**, **Environment Variables**.
4. Add a variable named exactly `FIREBASE_SERVICE_ACCOUNT`. As the value, paste the **whole contents** of that downloaded file. Save.
5. Go to **Deployments**, open the latest one, and click **Redeploy** (the variable is only picked up by a new deployment).
6. Keep the downloaded file private. Do not upload it to GitHub and do not send it to anyone. Anyone holding it has full access to your Firebase.

Until you do this, the Rates Desk page opens but shows a "Setup needed" panel with the same steps.

### Step 3 (recommended): Lock the rates data in Firebase
The server stores a secret key and notification keys in Firebase. The app itself never reads them directly, so you can block the app from touching them. In Firebase console, **Firestore Database**, **Rules**, add these lines **inside** your existing `match /databases/{database}/documents { ... }` block (do not remove your existing rules):

```
match /rateSecrets/{doc}  { allow read, write: if false; }
match /rateConfig/{doc}   { allow read, write: if false; }
match /rateDays/{doc}     { allow read, write: if false; }
match /rateUpdates/{doc}  { allow read, write: if false; }
match /ratePushSubs/{doc} { allow read, write: if false; }
```

The rates server is not affected by these (it uses the admin key from Step 2). This matters most if your current rules are very open. I cannot see your rules, so please check.

### Step 4: Check the NCDEX connection (the most important step)
1. Open the app, **Rates Desk**, scroll to **Automatic updates**, tap **Check the NCDEX connection**.
2. What the result means:
   - **Green, "fresh board found", with Jeera and Dhaniya numbers**: the server can read NCDEX live. Everything can run by itself.
   - **"Not today" / "old"**: the NCDEX page the server got is an old copy, or the market is closed today (holiday).
   - **"Blocked" / "could not read"**: NCDEX is refusing the server, or the page layout changed. See "If NCDEX does not cooperate" below.
3. Tap **Copy details** under the result and send it to me if it is not green. It contains a short piece of what the server saw, which is all I need to adjust the reader.

I could not test against the real NCDEX site from where I work (it is not reachable from my environment). I tested the reader against several layouts and against pasted text, but only this step tells us how the real site behaves from Vercel. Please do it during market hours (10:00 to 17:00, Monday to Friday).

### Step 5: Turn on notifications on your phone
1. **iPhone**: open the app in Safari, tap Share, **Add to Home Screen**, then open the app **from the Home Screen icon** (iOS 16.4 or newer is needed). Notifications do not work from a normal Safari tab on iPhone.
   **Android**: Chrome works directly (installing the app is better but not required).
2. Open **Rates Desk**, card **Notifications on this device**, tap **Turn on notifications**, tap **Allow** when the phone asks.
3. Tap **Send a test notification**. It should arrive in a few seconds.
4. Repeat on every phone or computer that should get the alerts (each device is turned on separately). Turn off in the same card.

### Step 6: Set up the automatic schedule (free)
Vercel's free plan cannot run jobs every few hours, so a free outside scheduler taps the app at the right times.

1. Create a free account at **cron-job.org**.
2. Click **Create cronjob**. Title: `Mahalaxmi rates`.
3. **URL**: in the app, **Rates Desk**, **Automatic updates**, tap the copy button next to the long address and paste it here. The address contains a secret key, so do not share it. It can only start a rates update, nothing else.
4. **Execution schedule**: choose **Custom**. Time zone: **Asia/Kolkata**. Hours: `10, 12, 14, 16, 17`. Minutes: `0` and `8` (the second try, at 8 minutes past, is a safety net; if the first try worked, the second does nothing). Days of week: Monday to Friday.
5. Save. In cron-job.org, use **Test run** once and then look at the Rates Desk page.
6. Notes: the app ignores repeats, so the same update is never sent twice. On exchange holidays it says "market closed today" once at 10 AM and stays quiet for the rest of the day.

## How the message is built

- **Contract chosen**: nearest expiry that has not expired (Jeera and Dhaniya; Turmeric can be switched on in **Message settings**). Option rows (CE / PE) are ignored.
- **Numbers**: LTP, change and change % are checked against each other (previous close + change must equal LTP, change % must match). A number that does not add up is refused, not sent.
- **Movement Since Previous Update**: compared with the latest earlier scheduled update of the same day (for example 2 PM against 12 PM). The first update of the day has no earlier update, so it shows the change against yesterday's close and says "(vs prev close)".
- **Quick Outlook (Hindi)**: written from fixed Hindi sentences chosen by the size of the movement since the last update: under 0.10% "Steady", under 0.40% "Mild", more than that "Strong". It always says "भाव" and never gives a buy or sell call. The wording is different from update to update. It is not AI-generated, so it cannot make anything up.
- **Freshness check**: the app reads the "As on ..." time printed on the NCDEX board. If it is not today, or older than 30 minutes (changeable in Message settings), the update is **not** prepared and you get a "needs you" notification instead.

## Sending on WhatsApp

- **Send on WhatsApp** (in the latest update card): opens WhatsApp with the full message typed. Pick the chat or group and press send. Takes 5 seconds per update. Works on every phone.
- **Send to my client lists**: opens your existing **WhatsApp Broadcast** page with the message filled in. Your client lists and the "Sent" ticks work as before. The page resets the ticks once a day, so **press "Reset Statuses" before each new round** (10 AM, 12 PM, and so on).
- **Fully automatic WhatsApp to every client, with no tap**: this is only allowed through the official **WhatsApp Business Platform (Cloud API)**. It needs a business number registered with Meta, approved message templates, and costs money per message (a marketing message is about ₹0.86 plus GST each; at 5 messages a day per client that is roughly ₹110 per client per month). Unofficial "bot" tools that send from a normal WhatsApp number can get your number banned, so I did not build those. This is a decision for you; see the questions at the end of my reply. If you choose it, I add it as a separate step.
- **Alternative that is free and automatic**: a **Telegram channel** (see below) or a WhatsApp **Channel** (broadcast-only, free) where you paste the update.

## Optional: also post every update to a Telegram channel
In Vercel, Environment Variables, add `TELEGRAM_BOT_TOKEN` (from the @BotFather chat) and `TELEGRAM_CHAT_ID` (your channel or group id), then Redeploy. Each ready update is then posted there automatically and the Rates Desk page shows "Telegram posting is on".

## If NCDEX does not cooperate (honest note)
- The app reads the public NCDEX page in a normal, polite way. It does **not** use tricks to hide that it is a program. If NCDEX refuses the server, the app says so plainly, notifies you, and the 30-second **Paste board text** path keeps your clients served. Nothing silent, nothing stale.
- Because of this, I cannot honestly promise that a free, public web page will be readable by a server in every single situation. What I can promise is that **an update always goes out**: automatic when NCDEX allows it, otherwise 30 seconds of your time.
- If you want it to work automatically in all situations, the reliable route is a licensed data feed (a data vendor or NCDEX's own data service). It costs money. If you ever want it, only one file (`server/rates/fetchBoard.js`) needs to change.
- **Please note**: sending NCDEX prices to clients on a regular basis can fall under the exchange's data-redistribution rules. Many brokers show delayed or "market information" prices with a disclaimer (your footer already has one). Please confirm what your NCDEX membership allows.

## Troubleshooting

| What you see | What to do |
|---|---|
| "Setup needed" panel | Step 2 is not done, or you did not redeploy after adding the variable. |
| "Please sign in again" | Log out and log in again. |
| No notification arrives | iPhone: open from the Home Screen icon, turn notifications on again, check Settings > Notifications > the app. Android: check the notification permission for the app/Chrome. Tap **Send a test notification**. |
| No automatic update at 10 AM | Check cron-job.org (the job's history shows success or failure), and Rates Desk, Recent updates, for the reason. |
| "Not today" on a normal trading day | NCDEX page copy is old or the board is not updating yet. Use **Paste board text**. |
| Message shows a number that looks wrong | Do not send. Tell me and send the **Copy details** text. |

## Quick test after upload
1. Rates Desk opens, no setup panel (after Step 2).
2. **Check the NCDEX connection** (market hours).
3. **Turn on notifications**, then **Send a test notification**.
4. **Fetch from NCDEX** (or Paste board text). A message appears; tap **Send on WhatsApp**.
5. Create the cron-job.org job and use **Test run**.

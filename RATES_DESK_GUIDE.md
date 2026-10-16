# Rates Desk guide (live rates message, phone notifications, one-tap WhatsApp)

## Update 2 (read this first if you already uploaded the first Rates Desk)

Your connection check showed: **"HTTP 200, 4212 bytes, board time not found, commodities read: none."** That means the server did reach NCDEX but received a tiny 4 KB page with no rates in it. The real Live Quotes page is many times bigger. So NCDEX (or the protection layer in front of it) does not show the board to the server, even though it shows it fine to your phone. It is not something the app did wrong, and the app correctly refused to send anything.

What this update does about it:

1. **The check now tells us exactly what came back.** If the page is not the board, the server tries again on the other address, and then shows "page came back but it does not contain the rates board", the first part of what it saw, and where the server runs. Tap **Copy details** and send it to me. That is what lets me see the real reason.
2. **Your own phone can hand the board to the app** (new section below, "If NCDEX does not show the board to the server"). Your phone visits the NCDEX page like any normal visitor, so this does not depend on the server being allowed in. It uses the same freshness checks, message, notification and WhatsApp buttons.
3. **One-tap clipboard paste.** In **Get rates now > Paste board text** there is now **Paste from clipboard and read**: copy the NCDEX page on your phone, press that button, and the numbers are read straight away.
4. **A bug found and fixed.** While testing the reader against the real column layout of the NCDEX table (Product, Expiry, Open, Low, LTP, High, Close, Change, Change %, ATP, Spot, Best Buy, Best Sell, OI), I found that the first version could, on a pasted full board, pick up a **neighbouring product's row** (for example Pepper's price shown as Dhaniya) when that product had an earlier expiry. It now decides each row's product from the name printed right before that row, never from the row above, and a filter drop-down can no longer claim a row. **Please do not use the Paste feature of the first version; use this update.** The automatic server fetch could not have sent a wrong number because it never got the board.


## What is new

A new page called **Rates Desk** (left menu, below Products). It does the job your Grok automation does, inside your own app:

1. **Builds the rates message** in exactly your Grok format: Jeera and Dhaniya (nearest expiry) with LTP, change, change % and OI, 🟩 🟥 ➖ icons, "Movement Since Previous Update", the pure-Hindi Quick Outlook (2-3 sentences per commodity) and your company footer.
2. **Runs by itself at 10 AM, 12 PM, 2 PM, 4 PM and 5 PM (Indian time, Monday to Friday)** and does nothing outside those times (the same as your "SKIP" rule).
3. **Sends a notification to your phone** when an update is ready ("📊 2 PM update ready"). Tap it and the message opens in the app, ready to send.
4. **One-tap WhatsApp**: "Send on WhatsApp" opens WhatsApp with the whole message already typed. "Send to my client lists" hands the message to your existing WhatsApp Broadcast page.
5. **If NCDEX does not give fresh numbers, the app never sends old numbers as if they were live.** It sends you a "⚠️ rates need you" notification instead, and you can fix it in 30 seconds with **Paste board text** (copy the board from the NCDEX site on your phone and paste) or **Type the numbers**. The message is built the same way from either.

Also fixed on the way: the "WhatsApp Broadcast" menu item had a wrong icon name, so it showed no icon. It now shows a proper icon.

## Files in this zip (upload all, same folders, replace when asked)

This is **update 2**. If you uploaded the first Rates Desk, these files replace the older ones:

```
RATES_DESK_GUIDE.md                    (this guide)
server/rates/parse.js                  (reader: row ownership fix)
server/rates/fetchBoard.js             (retries on a stub page, records what came back)
server/rates/service.js                (board sent by your phone, alert hold)
server/rates/handler.js                (the address your phone sends the page to)
server/rates/message.js                (new setting default)
src/rates/api.ts                       (new setting)
src/pages/RatesDesk.tsx                (clipboard paste, phone address, richer check result)
```

The first Rates Desk update (not repeated here) added everything else: `api/rates.js`, the other `server/rates/*` files, `public/push-sw.js`, `src/rates/push.ts`, the `/rates` route, the menu item, and small edits to `package.json`, `vercel.json`, `vite.config.ts` and `WhatsAppBroadcast.tsx`. Nothing else in the app was touched, and nothing needs to be set up again.

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
   - **Green, "Connected", with Jeera and Dhaniya numbers**: the server can read NCDEX live. Everything can run by itself.
   - **"page came back but it does not contain the rates board"** (what you saw: a tiny page): NCDEX is not showing the board to the server. Use the phone route below.
   - **"Not today" / "old"**: the page the server got is an old copy, or the market is closed today (holiday).
   - **"Could not read the board"** with a real-sized page: the layout changed. Send me the details.
3. Tap **Copy details** and send it to me if it is not green. It shows what kind of page the server received, which is all I need.

Please check during market hours (10:00 to 17:00, Monday to Friday).

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
4. **Execution schedule**: choose **Custom**. Time zone: **Asia/Kolkata**. Hours: `10, 12, 14, 16, 17`. Minutes: `0` and `8` (the second try, at 8 minutes past, is a safety net and is required if you use the phone route; if the first try worked, the second does nothing). Days of week: Monday to Friday.
5. Save. In cron-job.org, use **Test run** once and then look at the Rates Desk page.
6. Notes: the app ignores repeats, so the same update is never sent twice. On exchange holidays it says "market closed today" once at 10 AM and stays quiet for the rest of the day.

## If NCDEX does not show the board to the server: let your phone fetch it

Your phone is an ordinary visitor, so NCDEX shows it the board. The phone downloads the NCDEX page and sends it to your app. The app then does everything else (freshness check, message, notification, WhatsApp button). If the server is later allowed in, nothing needs to change: whichever arrives first wins, and the second does nothing.

**iPhone (Shortcuts app), about 5 minutes, once:**
1. In the app, **Rates Desk > Automatic updates**, copy the address under **"If NCDEX does not show the board to the server"** (the phone address).
2. Open the **Shortcuts** app, tap **+**, name it `Send rates`.
3. Add action **Get Contents of URL**. URL: `https://www.ncdex.com/market-watch/live_quotes` (method GET, leave the rest).
4. Add a second action **Get Contents of URL**. URL: paste the phone address. Tap **Show More**: Method **POST**, Request Body **File**, and for File choose **Contents of URL** (the result of step 3).
5. Tap the play button to test. The answer should show `"ok":true` and `"status":"ready"` and your app gets a "ready" notification. If it says "Nothing (or too little) was received", change the second action's Request Body to **JSON**, add a **Text** item named `text`, and choose **Contents of URL** as its value. Tell me what you get if it still fails.
6. To run it on its own: Shortcuts > **Automation** tab > **+** > **Time of Day** > 10:00 AM, **Repeat: Weekly**, Monday to Friday > **Run Shortcut: Send rates** > switch **Ask Before Running** off. Repeat for 12:00 PM, 2:00 PM, 4:00 PM and 5:00 PM. (You can also just tap the Shortcut yourself whenever you want an update.)
7. In the Rates Desk, **Message settings**, tick **My phone also sends the board**, press **Save settings**. With this on, the "needs you" alert waits until 8 minutes past the hour, so you are not alerted when your phone is about to deliver. **This needs the 8-minute retry in cron-job.org (Step 6, minutes 0 and 8).**

Honest notes: the phone must be on and online at those times, and iPhone may run an automation a minute or two late. I could not test this on your phone; the test in step 5 shows quickly whether it works. On Android, an app such as "HTTP Shortcuts" does the same job; tell me which phone you use and I will write the steps.

**No setup at all (always works):** Rates Desk > **Get rates now** > **Paste board text** > open the NCDEX Live Quotes page, select all, copy, then press **Paste from clipboard and read**, check, **Prepare message**. About 30 seconds.

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
| Check says "does not contain the rates board" | NCDEX is not showing the board to the server. Use the phone route or Paste from clipboard, and send me **Copy details**. |
| "Not today" on a normal trading day | NCDEX page copy is old or the board is not updating yet. Use **Paste board text**. |
| Message shows a number that looks wrong | Do not send. Tell me and send the **Copy details** text. |

## Quick test after upload
1. Rates Desk opens, no setup panel (after Step 2).
2. **Check the NCDEX connection** (market hours).
3. **Turn on notifications**, then **Send a test notification**.
4. **Fetch from NCDEX** (or Paste board text). A message appears; tap **Send on WhatsApp**.
5. Create the cron-job.org job and use **Test run**.

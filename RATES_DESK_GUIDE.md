# Rates Desk guide (live rates message, phone notifications, one-tap WhatsApp)

## Update 3 (read this first if you already uploaded the first Rates Desk)

**1. What your last screenshot means.** The check showed the same small page three times: `HTTP 200, 4212 bytes`, containing a loading spinner and "checking your browser" code. NCDEX puts a **browser check** in front of the Live Quotes page. A real browser (like your Brave) runs the check in a split second and then shows the board. A server cannot run it, so it only ever sees the spinner page. The app correctly refused to send anything.

I will **not** build anything that tries to get past that check (for example a hidden automated browser). It would be the kind of "bot" behaviour that gets a site to block you harder, and it may breach NCDEX's terms. Because of that, I cannot honestly promise a fully automatic fetch from the NCDEX website. What I built instead keeps you to **one click**:

**2. One-click "send what my browser is showing".** You open the NCDEX Live Quotes page in your own browser (you pass the check as usual), click a bookmark, and the app takes the text of that page, runs the same checks as before (today's board time, numbers must add up), makes the message, notifies all your devices and (if set) posts to Telegram. Details in the section "If NCDEX does not show the board to the server" below. The older **Paste from clipboard and read** button still works too.

(Update 2 had an iPhone Shortcut that *downloads* the page. It would receive the same spinner page, so it is replaced by the Share-sheet version below, which uses the page already open in Safari.)

**3. The "Movement Since Previous Update" section is now optional and editable.** It is still worked out automatically. Under the message, in **Movement since previous update**, you can:
- **Edit the numbers**: choose Up or Down and type the rupees for each commodity, and what it is compared with (for example "12 PM" or "prev close"). The message and the Hindi outlook are rebuilt with your numbers. Nothing else in the message changes.
- **Leave it out of the message**: the whole section disappears (the rates and outlook stay). Hindi outlook then uses today's change against yesterday's close.
- **Back to automatic** / **Show it again**: returns to the automatically calculated numbers (they are always kept).
- In **Message settings**, untick "Include the Movement section in new messages" if you want new messages to start without it.

**4. Earlier fixes still apply:** the reader picks each row's product from the name printed right before it (so Pepper can never be read as Dhaniya), and the connection check shows what kind of page came back (**Copy details**).

## What is new

A new page called **Rates Desk** (left menu, below Products). It does the job your Grok automation does, inside your own app:

1. **Builds the rates message** in exactly your Grok format: Jeera and Dhaniya (nearest expiry) with LTP, change, change % and OI, 🟩 🟥 ➖ icons, "Movement Since Previous Update", the pure-Hindi Quick Outlook (2-3 sentences per commodity) and your company footer.
2. **Runs by itself at 10 AM, 12 PM, 2 PM, 4 PM and 5 PM (Indian time, Monday to Friday)** and does nothing outside those times (the same as your "SKIP" rule).
3. **Sends a notification to your phone** when an update is ready ("📊 2 PM update ready"). Tap it and the message opens in the app, ready to send.
4. **One-tap WhatsApp**: "Send on WhatsApp" opens WhatsApp with the whole message already typed. "Send to my client lists" hands the message to your existing WhatsApp Broadcast page.
5. **If NCDEX does not give fresh numbers, the app never sends old numbers as if they were live.** It sends you a "⚠️ rates need you" notification instead, and you can fix it in 30 seconds with **Paste board text** (copy the board from the NCDEX site on your phone and paste) or **Type the numbers**. The message is built the same way from either.

Also fixed on the way: the "WhatsApp Broadcast" menu item had a wrong icon name, so it showed no icon. It now shows a proper icon.

## Files in this zip (upload all, same folders, replace when asked)

This is **update 3**. These files replace the older ones:

```
RATES_DESK_GUIDE.md                    (this guide)
server/rates/message.js                (movement section can be left out or typed)
server/rates/service.js                (change movement, board sent from your browser)
server/rates/handler.js                (the "send this page" address, change-movement action)
src/rates/api.ts                       (new fields)
src/pages/RatesDesk.tsx                (bookmark, movement editor, settings)
```

Everything else from the earlier Rates Desk updates stays as it is (`parse.js`, `fetchBoard.js` and the rest). Nothing needs to be set up again.

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
   - **"page came back but it does not contain the rates board"** (what you saw: a tiny page): NCDEX is showing the server its browser-check page (a spinner). Use the one-click browser route below.
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
4. **Execution schedule**: choose **Custom**. Time zone: **Asia/Kolkata**. Hours: `10, 12, 14, 16, 17`. Minutes: `0` and `8` (the second try, at 8 minutes past, is a safety net; if the first try worked, the second does nothing). Days of week: Monday to Friday.
5. Save. In cron-job.org, use **Test run** once and then look at the Rates Desk page.
6. Notes: the app ignores repeats, so the same update is never sent twice. On exchange holidays it says "market closed today" once at 10 AM and stays quiet for the rest of the day.

## If NCDEX does not show the board to the server: send it from your own browser

Do this once, then each update takes one click.

**Computer (Brave or Chrome):**
1. In the app, **Rates Desk > Automatic updates**, press **Copy the bookmark**.
2. In Brave: Bookmarks > **Add bookmark** (or press Cmd+D). Name it `Send rates`. Replace the address with what you copied (paste) and save. (Tip: show the bookmarks bar with Shift+Cmd+B so it is always one click away.)
3. Whenever you want an update (or after the app's "needs you" notification): open **ncdex.com > Market Watch > Live Quotes**, check the board shows today's time (reload if not), click **Send rates**.
4. A small message appears: "✅ Update ready in your Rates Desk ..." or the reason it was not accepted (for example "board is 40 minutes old, refresh the NCDEX page"). Open the Rates Desk and press **Send on WhatsApp**. Your phone and other devices also get the "ready" notification.
5. If your browser or NCDEX blocks the bookmark from sending, it copies the page text instead and tells you. Then use **Paste board text > Paste from clipboard and read** in the Rates Desk.

**iPhone (Share-sheet Shortcut), about 5 minutes, once:**
1. In the app copy the address (**Copy the address**) and send it to your iPhone (for example in your own Notes or WhatsApp chat with yourself).
2. iPhone **Settings > Shortcuts > Advanced > Allow Running Scripts** switch on (if you do not see it, it appears the first time you run the Shortcut).
3. Open the **Shortcuts** app, tap **+**, name it `Send rates`. Tap the **(i)** button and switch on **Show in Share Sheet**, with **Safari web pages** as the accepted type.
4. Add action **Run JavaScript on Web Page**. In the script box type exactly: `completion(document.body.innerText);`
5. Add action **Get Contents of URL**. URL: the address you copied. Tap **Show More**: Method **POST**, Request Body **JSON**. Add a field of type **Text**, name `text`, and as its value choose **JavaScript Result**.
6. Add action **Get Dictionary Value**: Get **Value** for `message` in **Contents of URL**. Then add **Show Result**.
7. To use it: open the NCDEX Live Quotes page in Safari, check it shows today's time, tap **Share**, choose **Send rates**. It shows "✅ Update ready ..." or the reason.

I could not try the iPhone steps on your phone, so test them once and tell me exactly what the result says if it fails. Android works similarly with an app such as "HTTP Shortcuts"; tell me if you need that.

**Why this is allowed to work:** you open the page yourself in a normal browser and the app only reads what is on your screen, the same as copy and paste, only faster. Please keep the address private: it contains your secret key (anyone who has it can send a rates page to your app, but cannot read anything).

**If the server is ever let in again** (for example after a licence from NCDEX), the automatic fetch simply starts working and you do nothing different.

**No setup at all (always works):** Rates Desk > **Get rates now** > **Paste board text** > open NCDEX Live Quotes, select all, copy, then **Paste from clipboard and read**, check, **Prepare message**. About 30 seconds.

## How the message is built

- **Contract chosen**: nearest expiry that has not expired (Jeera and Dhaniya; Turmeric can be switched on in **Message settings**). Option rows (CE / PE) are ignored.
- **Numbers**: LTP, change and change % are checked against each other (previous close + change must equal LTP, change % must match). A number that does not add up is refused, not sent.
- **Movement Since Previous Update**: compared with the latest earlier scheduled update of the same day (for example 2 PM against 12 PM). The first update of the day has no earlier update, so it shows the change against yesterday's close and says "(vs prev close)". You can edit these numbers, leave the section out, or go back to automatic on each update (see Update 3 above).
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
| Check says "does not contain the rates board" | NCDEX is showing the server its browser-check page. Use the **Send rates** bookmark (or Paste from clipboard) from your own browser. |
| "Not today" on a normal trading day | NCDEX page copy is old or the board is not updating yet. Use **Paste board text**. |
| Message shows a number that looks wrong | Do not send. Tell me and send the **Copy details** text. |

## Quick test after upload
1. Rates Desk opens, no setup panel (after Step 2).
2. **Check the NCDEX connection** (market hours).
3. **Turn on notifications**, then **Send a test notification**.
4. **Fetch from NCDEX** (or Paste board text). A message appears; tap **Send on WhatsApp**.
5. Create the cron-job.org job and use **Test run**.

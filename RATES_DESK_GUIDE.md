# Rates Desk guide (live rates message, phone notifications, one-tap WhatsApp)

## Update 7: the Quick Outlook is now Hinglish (read this first)

The text under each commodity in **QUICK OUTLOOK** is now **mostly Hindi with the everyday English words traders use** (market, open, close, level, support, trend, buying, selling, pressure, profit booking, range, volatility, expiry, rollover, settlement, demand, supply, stock, export, weather, season). It is no longer textbook Hindi. Month names stay in Hindi ("नवंबर contract"). Example:

> कल के close के पास open होने के बाद जीरा के भाव धीरे-धीरे ऊपर सरके हैं। अक्टूबर contract expiry के करीब है (5 दिन शेष), इसलिए traders की नजर सौदे settle करने या आगे बढ़ाने पर रहती है।

Everything else from Update 6 is unchanged (3 or 4 sentences, different for every update of the day, nothing about the previous update, no buy/sell advice, no targets, one-star headings, movement line without "(vs ...)"). On average about 1 word in 6 is English, never more than about 1 in 4 in a paragraph. The list of allowed English words is at the top of `server/rates/hindi.js`; tell me if you want more or less English.

Only `server/rates/hindi.js` and `server/rates/message.js` changed for this. Upload them the same way as before, wait for Vercel to show **Ready**, and the next update uses the new wording.

## Update 6: longer Hindi outlook, one-star headings, cleaner movement line (read this first)

**What changed in the WhatsApp message**

1. **Quick Outlook is longer and different every time.** Each commodity now gets 3 or 4 sentences instead of one. The wording changes with every update of the day and from day to day, so the five messages of one day do not read the same. It no longer says anything about the movement since the previous update (the Movement section already shows that). It is written from the NCDEX board alone:
   - *the day against its opening*: opened above or below yesterday's close, and whether the price is still above or below the opening level (a gap up that is fading reads very differently from a gap up that is holding);
   - *how big the move is*: quiet, normal, fast or sharp;
   - *the two spices against each other*: moving together or in opposite directions;
   - *the contract*: how close it is to expiry, with settlement and roll-over talk when it is within 10 days or is the running month;
   - *general background for the time of the year* (sowing, new-crop arrival, stock, festival and wedding demand). These lines are always worded as "आमतौर पर" (usually) because they are general background, **not today's news**. The app cannot know live news, so it never says things like "export demand rose today".
   It never gives a buy or sell call, a target or a prediction, and (from Update 7) the English in the lines is only a short list of everyday market words. The first word of each heading (Strong, Weak, Steady) still follows the board's own change against yesterday's close.
2. **Headings use one star on each side**, like `*QUICK OUTLOOK*`, which is what WhatsApp needs to make them bold. The doubled stars are gone from every heading, and the invisible double spaces at the ends of the company lines are removed.
3. **The Movement line has no "(vs 10 AM)"** or any other time. It now reads, for example: `🟩 Jeera +₹40 | 🟥 Dhaniya −₹20`.

**On the Rates Desk page.** The **Edit the numbers** box for the movement no longer asks "Compared with" (it is not written in the message any more). For your own information the line above it still says what the automatic numbers were compared with, for example "Worked out automatically (compared with 12 PM; this is not written in the message)". Changing, hiding or restoring the movement does **not** change the Hindi outlook any more.

**What you need to do.** Upload the files listed at the bottom and let Vercel build. Nothing to set up again. The next update that is made uses the new format; updates already made keep the text they were made with.

---

## Update 5: one method at a time, and a log that shows what really happened

**What your last screenshots meant.**

- Grok's plain **"OK"** is Grok's own last word (your automation says to reply OK). It is **not** the app's answer. When the app accepts numbers, it answers `OK: saved...`. The app showed *"Nothing has arrived from the feed yet"*, so, as far as the app could tell, no numbers from Grok ever reached it. Before this update the app kept **no record at all** of some failed calls (for example a call with a wrong or old key), and no list of the calls that did arrive, so nobody could tell what had happened. That is fixed below.
- The red **"10 AM: NCDEX did not show the rates board"** card came from the *server* method (pressing **Try again** or **Fetch from NCDEX**, or the scheduler while the app was still set to read NCDEX itself). NCDEX always shows servers its "checking your browser" page, so that method cannot work, and it should never have been the thing shown while you use Grok. **Try again** now only appears when you have chosen the server method.
- **No alert ever came** because of the scheduler minutes. With the Grok feed on, the app waits 10 minutes after the hour before it complains, but the scheduler on cron-job.org was still calling at minute 0 and minute 8, both *before* the 10 minutes were over. So it waited both times and never alerted. The page now notices this by itself and fixes it with one tap (see "Is everything working?").
- The **test notification** worked because it does not depend on any of that. A real alert is only sent when something happens (rates ready, rates late, market closed).

**What is new on the Rates Desk page**

1. **One method at a time.** The card **How the rates arrive** has three choices: **Grok feed** (recommended), **My browser**, **Server reads NCDEX**. Only the steps of the method you pick are shown, and the app only watches that one. The others are not deleted, just hidden. Grok feed is already the one to use.
2. **Is everything working?** (top of the page). One sentence in plain words, today's five times with a status each (Ready, Waiting, Not arrived ...), and a list of what is wrong with a one-tap fix where possible. It also shows when Grok last sent numbers, when the scheduler last checked, the last notification and what happened to it, and whether **this** device has notifications on (with a **Turn on here** button).
3. **Activity** (a list under the method card). Every call from Grok, the scheduler or your browser, and every notification, newest first: the time, who it was, and what happened ("Saved", "Refused: numbers do not add up", "Waiting for the feed (8 of 10 minutes)", "Sent to 2 of 2 devices", "Nobody was notified"...). Tap **Show what was received** to see exactly which numbers Grok sent and who called. Calls with a wrong key are not listed one by one (so nobody can fill your database); the page just says "opened with a WRONG key at 10:05" once.
4. **Notifications tell you what happened.** Every alert is recorded with how many devices got it and, if one failed, why (for example "the device unsubscribed, turn notifications on again there"). **Send a test notification** now shows its result under the button. On **Brave** the page reminds you of the one setting Brave needs (Settings, Privacy and security, **Use Google services for push messaging**).
5. **If Grok is late, nothing to press.** When late numbers arrive, the "did not arrive" card turns into the finished message by itself, the page shows "10 AM update arrived from Grok (late)", and you get the normal "update ready" notification. The page looks again by itself (every 20 seconds around update times, every minute otherwise) and **Check now** looks at once.
6. **Entering numbers by hand** moved into one box at the bottom of the page: **If an update is missing: enter it by hand**.

**Where Grok's data is stored.** In your own Firebase database, nothing else:

- `rateUpdates`: every update the app made or tried (ready, needs you, skipped), with its text, numbers, how it arrived (Grok feed, scheduler, your browser, pasted, typed) and when. This is the **Recent updates** list. Open any earlier one by tapping it.
- `rateDays`: the reading of each update, used to work out "Movement Since Previous Update".
- `rateLog`: the **Activity** list (kept for 3 weeks, older lines are removed automatically).
- A refused delivery keeps the raw numbers in Activity (**Show what was received**), so you can see what Grok really sent.

**Set up, in this order (about 10 minutes)**

1. Upload the files of this zip (list at the bottom) and let Vercel build. Open **Rates Desk**. The top panel will probably say something is not working; that is the new panel doing its job.
2. In **How the rates arrive** choose **Grok feed**.
3. Press **Show the Grok instructions**, then **Copy the instructions**. Open your Grok automation, **delete everything in its prompt**, paste the new text and save. Keep the hourly schedule: the new text starts with the same "if the hour is not 10, 12, 14, 16 or 17, stop" check you already use. (Please replace the whole prompt. A mixture of old and new instructions is the usual reason Grok does not call the address.)
4. **Test that Grok can reach your app** (10 seconds): press **Copy the 10-second Grok test**, paste it into a normal Grok chat. Grok must answer *OK: the feed address works and the key is accepted. Nothing was saved.* Then press **Check now** on the page: the Activity list shows a line **Address check**. If Grok says it cannot open web addresses, or no line appears, then Grok cannot call your app at all and the Grok feed cannot work; tell me and we will use **My browser** instead.
5. Look at the **Scheduler on cron-job.org** box on the page. It shows the exact minutes to use for your alert time (with 10 minutes: `10, 20`). In cron-job.org open your job, set **Minutes** to those, keep hours `10, 12, 14, 16, 17`, Monday to Friday, time zone Asia/Kolkata, and save. (Or leave cron-job.org as it is (`0, 8`) and set the alert time on the page to `8`: the page offers this as one tap.)
6. Turn on notifications on **every** device (phone and computer) with **Turn on notifications** (or **Turn on here** in the top panel), then press **Send a test notification**.
7. At the next update time watch the top panel. A green "Everything is working" with the update marked Ready is the proof. If not, the panel and the Activity list say where it stopped.

**If something is wrong, read the Activity list from the top**

| You see in Activity or in the top panel | What it means | What to do |
|---|---|---|
| Nothing from Grok at all, and the panel says "Grok has not contacted the app today" | Grok did not run, cannot open web addresses, or its prompt does not contain the address | Do the 10-second test (step 4). Replace the whole prompt (step 3). |
| "opened with a WRONG key" | Something called the address with an old or mistyped key (usually Grok with an old prompt) | Copy the instructions again and replace the whole Grok prompt. Do not press **Make a new key** unless you will paste the new instructions into Grok right after. |
| Grok feed, **Refused**: "do not add up" or "board time ... not live" | Grok read a number wrong or read an old board | Grok sees the same sentence in its reply and should try again. Tap **Show what was received** to see what it sent. |
| Scheduler **Waiting** only, and the panel says "never alerted" | Scheduler minutes are before your alert time | Press the one-tap fix, or change the minutes on cron-job.org. |
| The panel says the scheduler did not contact the app | The cron-job.org job is switched off, has the wrong address, or the wrong days/hours | Open the job on cron-job.org, check it is enabled and press **Test run**. |
| Notification **Nobody notified** | No device has notifications on | **Turn on notifications** on your phone and computer. |
| Notification **Sent to 0 of 2 devices** with a reason | The browser rejected or forgot the subscription | Turn notifications off and on again on that device. On Brave switch on **Use Google services for push messaging** first. |

**Honest limits.** The app cannot make Grok run, and it cannot see inside Grok. It can only tell you what reached it, and now it shows that clearly. If the 10-second test proves Grok cannot open web addresses, the Grok feed is not possible with your Grok plan, and the choices are **My browser** (one bookmark click per update) or paste/type. A fully automatic fetch from the NCDEX website is not possible while NCDEX shows servers a browser check, and I will not build anything that tries to get around it.

## Update 4: the Grok feed (background; the screen has changed, use the Update 5 steps above)

**The idea.** Your Grok automation already gets through the NCDEX browser check. So instead of the app trying to read NCDEX, **Grok sends the numbers to the app**. Nothing sits in between (no Google Drive, no database to poll): when Grok finishes reading the board it opens one web address that belongs to your app, with the numbers written in it. At that moment the app:

1. checks the board time Grok read ("As on ..."): it must be today and not older than the limit in Message settings (30 minutes),
2. checks that the numbers add up, for each commodity: previous close + change = LTP, and change % matches the change (this catches a mistyped or misread digit),
3. builds the message in your exact format (Hindi outlook, movement section and all),
4. sends a "📊 12 PM update ready" notification to your devices (and Telegram if set up),
5. replies to Grok with one line, `OK: saved...` or `ERROR: ...` saying which number to read again. Grok then reads that number again and opens the address once more.

**Why this is better than Drive or a database in between.** A Drive file or a database would still need something to *check* it every minute and would add a delay (and a second place that can fail). Here the app is the receiver, so the message is ready within a second of Grok finishing. The waiting you described (Grok sometimes needs 3 to 5 minutes) is handled by a **watchdog**: the free scheduler checks a few minutes after each update time. If the numbers are there, it stays silent. If not, you get "⚠️ 10 AM rates need you" and can use the bookmark, **Paste board text** or **Type the numbers**. If Grok arrives late (even after the alert) its numbers are still accepted and replace the alert.

**Set up:** use the steps in Update 5 above (the screen changed: there is now a method switch instead of a tick box, and the page shows the scheduler minutes for you).

**Good to know:**
- The feed key can **only** send rates. It cannot read your data, run updates or change settings. If the address ever leaks, press **Make a new key** and paste the new instructions into Grok (the old address stops working at once).
- A refused delivery (wrong digit, old board time) does not touch an update that is already ready. It only tells you, and Grok sees the reason in its reply.
- Holiday: Grok sends the board time it sees (yesterday's). The app says "market closed" once at 10 AM and the watchdog stays quiet.
- If Grok also runs at other hours (11, 1, 3 ...), each delivery becomes an **Extra update** with its own notification. Only the five update times are watched for lateness.
- "Fetch from NCDEX", the browser bookmark and Paste board text all still work, even with the feed on.
- Please be aware of the limits: this depends on Grok continuing to read the NCDEX page correctly. The app can catch stale boards and numbers that do not add up, but it cannot know if Grok read the wrong contract row consistently, so glance at the first few messages. And as noted at the end of this guide, sending exchange prices to clients can fall under NCDEX's data rules.

## Update 3 (earlier update, still applies)

**1. What your last screenshot means.** The check showed the same small page three times: `HTTP 200, 4212 bytes`, containing a loading spinner and "checking your browser" code. NCDEX puts a **browser check** in front of the Live Quotes page. A real browser (like your Brave) runs the check in a split second and then shows the board. A server cannot run it, so it only ever sees the spinner page. The app correctly refused to send anything.

I will **not** build anything that tries to get past that check (for example a hidden automated browser). It would be the kind of "bot" behaviour that gets a site to block you harder, and it may breach NCDEX's terms. Because of that, I cannot honestly promise a fully automatic fetch from the NCDEX website. What I built instead keeps you to **one click**:

**2. One-click "send what my browser is showing".** You open the NCDEX Live Quotes page in your own browser (you pass the check as usual), click a bookmark, and the app takes the text of that page, runs the same checks as before (today's board time, numbers must add up), makes the message, notifies all your devices and (if set) posts to Telegram. Details in the section "If NCDEX does not show the board to the server" below. The older **Paste from clipboard and read** button still works too.

(Update 2 had an iPhone Shortcut that *downloads* the page. It would receive the same spinner page, so it is replaced by the Share-sheet version below, which uses the page already open in Safari.)

**3. The "Movement Since Previous Update" section is now optional and editable.** It is still worked out automatically. Under the message, in **Movement since previous update**, you can:
- **Edit the numbers**: choose Up or Down and type the rupees for each commodity (Update 6: the "compared with" box is gone; the message shows only the rupee amounts). The message is rebuilt with your numbers. Nothing else in the message changes.
- **Leave it out of the message**: the whole section disappears (the rates and outlook stay). Hindi outlook then uses today's change against yesterday's close.
- **Back to automatic** / **Show it again**: returns to the automatically calculated numbers (they are always kept).
- In **Message settings**, untick "Include the Movement section in new messages" if you want new messages to start without it.

**4. Earlier fixes still apply:** the reader picks each row's product from the name printed right before it (so Pepper can never be read as Dhaniya), and the connection check shows what kind of page came back (**Copy details**).

## What is new

A new page called **Rates Desk** (left menu, below Products). It does the job your Grok automation does, inside your own app:

1. **Builds the rates message** in exactly your Grok format: Jeera and Dhaniya (nearest expiry) with LTP, change, change % and OI, 🟩 🟥 ➖ icons, "Movement Since Previous Update", the Hinglish Quick Outlook (3 or 4 sentences per commodity) and your company footer.
2. **Runs by itself at 10 AM, 12 PM, 2 PM, 4 PM and 5 PM (Indian time, Monday to Friday)** and does nothing outside those times (the same as your "SKIP" rule).
3. **Sends a notification to your phone** when an update is ready ("📊 2 PM update ready"). Tap it and the message opens in the app, ready to send.
4. **One-tap WhatsApp**: "Send on WhatsApp" opens WhatsApp with the whole message already typed. "Send to my client lists" hands the message to your existing WhatsApp Broadcast page.
5. **If NCDEX does not give fresh numbers, the app never sends old numbers as if they were live.** It sends you a "⚠️ rates need you" notification instead, and you can fix it in 30 seconds with **Paste board text** (copy the board from the NCDEX site on your phone and paste) or **Type the numbers**. The message is built the same way from either.

Also fixed on the way: the "WhatsApp Broadcast" menu item had a wrong icon name, so it showed no icon. It now shows a proper icon.

## Files in this zip (upload all, same folders, replace when asked)

This is **update 6**. These 4 files replace the older ones:

```
RATES_DESK_GUIDE.md                    (this guide)
server/rates/hindi.js                  (the new Hindi outlook)
server/rates/message.js                (one-star headings, movement line without "(vs ...)")
src/pages/RatesDesk.tsx                (no "Compared with" box in the movement editor)
```

Everything from update 5 (the health panel, the activity list, the single-method switch) and the earlier updates stays as it is. Nothing needs to be set up again. If you have not uploaded update 5 yet, upload that zip first.

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
4. **Execution schedule**: choose **Custom**. Time zone: **Asia/Kolkata**. Hours: `10, 12, 14, 16, 17`. Minutes: `0` and `8` (the second try, at 8 minutes past, is a safety net; if the first try worked, the second does nothing). Days of week: Monday to Friday. (If you use the Grok feed, the Rates Desk page shows the exact minutes to use, for example `10` and `20`.)
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
- **Movement Since Previous Update**: compared with the latest earlier scheduled update of the same day (for example 2 PM against 12 PM). The first update of the day has no earlier update, so it shows the change against yesterday's close. The message never says what it is compared with. You can edit these numbers, leave the section out, or go back to automatic on each update (see Update 3 above).
- **Quick Outlook (Hinglish)**: 3 or 4 sentences per commodity, written from fixed Hindi-with-English-market-words sentences chosen by the board's own numbers (opening against yesterday's close, price against the opening level, size of the day's move, the other spice, days left before expiry, and general background for the time of year). The heading word follows the change against yesterday's close: under 0.10% "Steady", under 0.40% "Mild", more than that "Strong" or "Weak". It does not mention the previous update, never gives a buy or sell call, and the wording is different from update to update. It is not AI-generated, so it cannot make anything up; the time-of-year lines are general background, not live news.
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
| "10 AM rates have not arrived from your feed" | Grok did not open the feed address in time. Open Grok's automation and see why it did not run or what it answered (the reply line starts with ERROR when a number was refused). Meanwhile use the bookmark, Paste board text or Type the numbers. A late delivery from Grok is still accepted. |
| Grok's reply says ERROR | The reply names the number or the time that was refused. Grok should read it again and open the address once more. If it keeps failing, copy the instructions again from Rates Desk (the key may have been changed). |
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

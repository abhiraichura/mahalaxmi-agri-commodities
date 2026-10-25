# Update 7: contract reminders, the two new boxes, and the redesigned app

Read this first. It is written in plain words, step by step.

---

## 1. What you get

**A. The app now reminds you about every confirmed contract.**

| When | What the notification asks |
|---|---|
| Half way through the loading time (10 days → on day 5) | "Loading check: is it loaded yet?" |
| One day before the loading deadline | "Loaded yet? Loading deadline is tomorrow." |
| On the deadline day | "Today is the last day to load. Is it loaded?" |
| After the deadline, if you have not answered | A gentle nudge on day 1, 2 and 3 late, then every 3rd day (up to 15 days) |
| After you say **Yes, loaded** and pick the loading date | The app works out the payment window from the contract (for example **3 to 4 days** after loading) and reminds you on the first day of the window and again on the last day: "Ask the buyer for the payment update" |
| After the payment window, if payment is not confirmed | A gentle nudge until you confirm payment |

**B. When you tap a notification** the app opens straight on that contract, on a card that asks the question ("Is it loaded?" or "Has the payment come?"). You answer with one tap:

- **Yes, loaded** → pick the loading date (today is pre-selected) → you see the payment window it calculated before you confirm.
- **Not yet** → pick the day the seller promised (or leave it blank). The app will ask again on that day instead of nagging you every day.
- **Payment received** → pick the date → the contract moves to *Completed*.
- Every answer is written into the contract's **diary** (timeline) with the date and time, and the last answer has an **Undo**.

**C. Two small boxes on the contract form** (see section 4).

**D. The whole app is redesigned** (see section 5).

**E. Rates Desk outlook is now Hinglish** (see section 6).

---

## 2. How to put it on the live app

1. Unzip `Mahalaxmi-Update-7-Reminders-Redesign.zip`. The folders inside match your project exactly.
2. On GitHub, open the repository, press **Add file → Upload files**, and drag the **contents** of the unzipped folder in (the folders `api`, `server`, `src`, plus `vercel.json` and the `.md` guide files). GitHub keeps the folder structure. Commit to `main`.
3. Vercel builds it by itself in about 2 minutes. When the deployment shows **Ready**, open the app and refresh once (on a phone, close and reopen it).

You do not need to add any new key or setting. The notification system uses the same keys the Rates Desk already uses.

**Optional, for a little more safety:** in Vercel → Project → Settings → Environment Variables, add `CRON_SECRET` with any long random text (30+ characters), then redeploy. Vercel then proves itself to the app with this secret on its daily call. If you skip this, everything still works.

---

## 3. Turn notifications on (once per device)

1. Open the app → **Settings** → the **Reminders** section is at the very top.
2. Press **Turn on reminders** and allow notifications when the phone or browser asks.
3. Press **Send a test notification**. It should appear within a few seconds.

Do this on each device you want reminders on (phone and computer are separate).

**iPhone:** notifications only work if the app is added to the Home Screen (Safari → Share → **Add to Home Screen**) and opened from that icon. iPhone notifications cannot show Yes/No buttons, so tapping the notification opens the app on the question card. That is an Apple rule, not a missing feature.

### When do reminders actually arrive?
- **Once a day, around 9 AM India time.** (The Vercel free plan runs a daily job somewhere between about 8:30 and 9:30 AM.) Reminders are by calendar day, "10 days" means 10 calendar days. They do not arrive at an exact minute.
- Nothing is sent between 9 PM and 8 AM.
- **Whenever you open the app**, it also checks (at most every 3 hours). So if you open the app at noon and something is due, you will see it on the Today screen straight away.
- If more than 3 things are due the same morning, you get **one** notification, "📋 N contracts need you today", instead of a flood. Open it and the Today screen lists them all.
- Each reminder is sent only once. Nothing repeats unless it is one of the gentle late nudges above.

### Check that it is working
**Settings → Reminders** shows when the last check ran and what it found, and lists the recent reminders. **Check now** runs the check immediately (ignoring the quiet hours), which is useful for testing.

### Optional backup scheduler
At the bottom of the Reminders section, the fold-out **"Optional: a second daily scheduler"** shows a web address. If you ever want a second trigger, create a job on cron-job.org (the same site you use for the Rates Desk) that opens that address once a day at 9:00 AM, time zone Asia/Kolkata. It only runs the check; it can never read your contracts.

### The first morning
Old contracts that are still open will all be due for a question at once. You will receive **one** grouped notification. Answer them from the Today screen, or stop reminders on any contract you do not want tracked (see below). After that it is quiet.

### Stop reminders for one contract
Open the contract → at the bottom of the **Next step** card press **Stop reminders for this contract**. That contract never sends anything. The same place shows **Turn reminders on** to bring them back.

---

## 4. The two new boxes on the contract form

On **New contract / Edit contract**, in the loading and payment part, there are two small number boxes:

- **Loading within ___ days of the contract date**
- **Payment ___ to ___ days after loading**

How they work:
- They fill themselves in from what you type in the printed sentences ("Goods to be loaded within 10 days", "3 to 4 days payment with 1% discount"). If you type a number in the box yourself, the box stops following the sentence and your number wins.
- The loading deadline is calculated for you (contract date + loading days) and shown as a preview: *"Load by Sat 7 Nov (10 days). I will ask you 'is it loaded?' on 2 Nov (half way) and 6 Nov (the day before)."* You can still type a different deadline date by hand.
- If the box and the printed sentence disagree (for example the box says 7 and the sentence says 10), the form warns you and gives you a one-tap fix either way.
- If you enter 4 to 3 by mistake, they are swapped for you.
- **Old contracts** that only have the printed text keep working: the app reads the number from the text.
- Contracts without any number (for example "ready payment") get a 1-day window.

---

## 5. The redesigned app

Everything was redone on one design system, so every screen behaves the same way on phone and computer.

- **Phone:** a bottom bar with **Today · Contracts · ＋ · Parties · More**. The big ＋ opens a sheet with New contract, New party, Rates update, Message a party and Quick note. Forms hide the bar so the Save button is never in the way. **More** holds everything else.
- **Computer:** a grouped left menu, and a top bar with **Search**. Press `/` or `Ctrl + K` (`Cmd + K` on a Mac) to search any contract, party or page from anywhere.
- **Today screen:** the first thing you see is **"Needs you today"**, with one big button per item (Is it loaded? / Ask for payment), then **Coming up · next 7 days**, **Open contracts** and **Rates**.
- **Contract page:** a **Next step** card on top (the question the app is asking), the deal details, the diary, and the Reminders block.
- **Parties, Ledger, Products, Messages, Rates Desk, Brokerage bills, Notes, To-dos, Gulf Food directory, NCDEX, Settings:** same look, bigger tap targets on phone, tables become cards on a small screen, dialogs become bottom sheets.
- **Settings:** Reminders at the top, a Save bar that stays visible.

Nothing about your data changed. Contracts, parties, bills, notes, to-dos and settings are exactly as they were. The only new things stored are the extra fields on a contract (loading days, payment days, loaded date, payment received date, the diary, and the reminders-off and promised-day flags).

---

## 6. Rates Desk: Hinglish Quick Outlook

The outlook under each commodity is now **mostly Hindi with the everyday English words traders use**, not textbook Hindi. Example:

> ऊपर open होने के बाद भी जीरा के भाव open level के ऊपर टिके हैं, जिससे buyers की पकड़ मजबूत दिखती है। नवंबर contract की expiry दूर है, इसलिए rollover की हलचल अभी नहीं दिख रही और market demand-supply के हिसाब से चल रहा है।

- The sentence is Hindi; the market words are English (market, open, close, level, support, trend, buying, selling, pressure, profit booking, range, volatility, expiry, rollover, settlement, demand, supply, stock, export, weather, season and a few similar ones). Month names stay in Hindi ("नवंबर contract").
- Across the whole message, about 1 word in 6 is English on average, and never more than about 1 in 4 in any paragraph.
- Everything else stays as in Update 6: 3 or 4 sentences per commodity, different wording for each update of the day, nothing about the previous update, no buy/sell advice, no targets or predictions, single-star headings, movement line without "(vs ...)".
- To change which English words are used, or to make it more or less English, tell me and I will adjust it. The word list is at the top of `server/rates/hindi.js`.

---

## 7. Honest limits

- Reminders come **once a day** (about 9 AM), by calendar days, not at an exact minute.
- Notifications cannot hold Yes/No buttons on iPhone. You tap, then answer on the card.
- If a contract's loading terms are free text with no number the app can find ("as per seller's convenience"), it has no loading reminders for that contract until you type the days into the box.
- The app can only remind. It cannot know by itself whether goods are loaded or money has come in. That is why every reminder is a question for you.
- Reminders only exist for contracts whose status is **Confirmed**. Drafts and cancelled contracts never send anything.

---

## 8. If something does not work

| What you see | Do this |
|---|---|
| No test notification | Settings → Reminders → Turn on reminders. On iPhone, open the app from the Home Screen icon, not from Safari. |
| Test works, no reminders | Check the contract is **Confirmed**, reminders are not stopped for it, and has days in the two boxes (or a number in the printed text). Press **Check now** and read the line it shows. |
| "Not set up" message | The server keys from the Rates Desk setup are missing. Open the Rates Desk page and make sure notifications work there first. |
| Reminders at the wrong hour | Vercel's free daily job runs somewhere in the 9 o'clock hour. Add the optional cron-job.org job for an exact time. |
| Too many notifications on day one | Normal for old open contracts. You get one grouped notification. Stop reminders on the contracts you do not want tracked. |

## 9. Files in this update

```
api/reminders.js                         (new: the reminder endpoint)
server/reminders/*                       (new: rules, sending, storage, scheduler handler)
server/rates/hindi.js, message.js        (Hinglish outlook)
vercel.json                              (daily reminder job added)
src/reminders/*                          (new: Today logic, Next step card, Settings section, notifications)
src/ui/*                                 (new: shared design system)
src/components/Layout.tsx, nav.ts, GlobalSearch.tsx
src/pages/*                              (every screen restyled; contract form and contract page rebuilt)
src/types/index.ts, src/index.css
```

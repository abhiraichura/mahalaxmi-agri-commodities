# Update 9: what is new and where to find it

Everything you asked for on 27 October, in plain words. Nothing was taken away: every old page address still opens
(it now lands on the new combined page), and your existing contracts, parties, bills and notes are untouched.

## Where things moved

Fewer pages, grouped the way you work:

| Group | What is in it |
|---|---|
| **Work** | Contracts, Parties (buyers, sellers and the Gulfood directory), Products |
| **Money** | **Bills & ledger**: Brokerage bills and Party ledger as two tabs on one page |
| **Market** | Rates Desk, and **Messages**: WhatsApp broadcast, Rate message, Message a party and Custom message as four tabs |
| **Organise** | **Tasks & notes**: Tasks and Notes as two tabs |

The top search finds any page, party or contract number. Typing a party name now opens its **profile** (details, deals,
money owed, tasks, notes), not the edit form. Edit is one tap away from the profile.

Moving between pages always starts at the top.

## Contracts

- **Change the loading date or the payment date** after you have set it: open the contract, then Edit dates (or tap the
  date in the "Next step" card).
- **Files on a contract**: add photos or PDFs (bills, loading slips, truck photos) in the Files card. Photos are shrunk
  before saving. Each file can carry a short note.
- **Loading in parts**: when a deal goes truck by truck, add each truck in the Loading card (date, quantity, vehicle).
  You see a progress bar. When the full quantity is loaded the app offers "Yes, mark loaded".
- **Contract note and Documents > Preview and edit now stay in step.** Change a date, price, quantity or party in either
  place and the other shows it. Wording that only exists on the note stays on the note.
- **Pick parties by searching** in the contract form (buyer and seller), and add a new party on the spot without leaving the form.
- **Repeat this deal**: one tap on a contract opens a new one with the same parties, product, quality and terms.
- **You dealt with them before**: when you choose the same buyer and seller again the form offers "Use these details".
- **Heads-up while writing a contract** (it warns, it never blocks, except one party on both sides): price far from
  recent deals of that product, a likely duplicate, no brokerage set, a buyer who has not paid earlier deals, a seller who
  is usually late.
- **NCDEX price for reference** under the price box for Jeera, Dhaniya and Turmeric (latest ready rate update, per quintal and per kg).
  It is for information only and is never copied into the contract.
- **Note sent**: sharing, printing or downloading a contract note marks that copy as sent. You can also tap "Mark as sent"
  (and Undo). Deals from the last week whose notes are not sent show up on Today.

## Parties

- One searchable list from A to Z (filter All, Buyers or Sellers). The Gulfood directory is searched too while you type.
  Each party has a proper **profile** page.
- Old parties with a missing phone, city or legal name no longer break the page (this fixes the blank screen).
- The same safety now covers the Gulfood directory and the contact-file export.

## Brokerage bills

- **Edit bill** (on each party's bill): change the brokerage of any contract line, leave a line off the bill, add a
  discount or an extra charge with the reason that gets printed, change the invoice number and the bill date, and set GST %
  for that bill only. Nothing is saved until you press Save changes, and what you save is what the PDFs and totals use.
- Payments received against a bill can be changed or corrected afterwards too.

## Products

A new look, built for speed: type a name, pick the usual brokerage and press Add, so a product exists in two taps.
Qualities and specs (with one-tap spec suggestions) can be added afterwards by tapping the product.

## WhatsApp broadcast

- **Add contact** is back (it had been lost in the redesign). Add one person, or paste a list with a name and a number on
  each line. These contacts are for broadcasts only and do not become parties. They can go straight into a broadcast list.

## Tasks and notes

**Tasks**
- Type one line and it is planned: *Call Patel about payment tomorrow !!* understands tomorrow, weekdays, dates, `!!` for
  high priority and "every month".
- Views: Today, Week, Later, Done. Steps inside a task, a time, a repeat, and a link to a contract or party.
- **Repeating reminders**: one tap adds the monthly dates a broker needs (GST and similar) and they come back by themselves.
  Check the dates against your own filing schedule.
- Due tasks appear on Today and in the bell count.

**Notes**
- Pin, tags and tag filter, checklists, a link to a contract or party, autosave, make-a-task-from-a-note, export to Excel/CSV.
- Wide screens show the list and the note side by side. On a phone the note opens full screen.

**On contracts and parties**: a Tasks and Notes card lets you add a task or note about that deal or party in two taps.

## Today ("Worth a look")

A short list of things worth doing, each with Open, WhatsApp or Add task, and **Not now** to hide it for a while:

- brokerage bills for last month that are not made yet,
- brokerage bills that are issued but unpaid for 30+ days (with a ready WhatsApp reminder),
- contracts with no brokerage set (they would never appear on a bill),
- contract notes not sent yet,
- parties who usually deal every few weeks and have gone quiet,
- a backup reminder.

## Backup

Settings > Backup downloads one file with all your contracts, parties, products, notes and bills, and a Contracts file for
Excel. The app reminds you when the last backup is more than 45 days old.

## The new look

A lighter, glass-style design: large titles, grouped lists, a floating tab bar on phone, a sidebar on desktop. Spacing was
tightened where it was loose and kept comfortable where taps need room. There is no dark mode.

## Not included (so you are not surprised)

- Suggestions when the market moves, price alerts, a one-page deal-file PDF, a status link for clients, and discount-window
  reminders were thought through but **not built**.
- Share, Print and Download marking a note as "sent" was written and unit-checked, but could not be exercised in my test
  browser (it needs the Verdana font file). Mark as sent by hand was tested. Please try Share once on a real contract.
- The Mandi page was never linked from the menu and was left alone. Settings and a few older inner screens keep their older
  inner styling.

## Putting it live

Upload the files from the zip to GitHub, keeping the folders (src/..., server/..., and so on). Vercel then builds the app.
The build was run here with the same command Vercel uses and passed.

One file is no longer used: `src/pages/PartyDirectory.tsx` (its job moved into the new Parties page). A zip cannot delete
files, so you can delete it on GitHub yourself. Leaving it does no harm; the app still builds with it there.

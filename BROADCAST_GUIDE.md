# WhatsApp Broadcast guide (faster sending, no Business account)

## The honest part first

WhatsApp does **not** let any app send bulk messages by itself unless you use its official Business API (which needs a Business account and costs money per message). Programs that "drive" WhatsApp Web or fake a phone to send automatically do exist, but they break WhatsApp's rules and the usual result is that **the sending number gets banned**. Your main business number is not something to risk, so I did not build that.

What I built instead uses only your normal WhatsApp, and makes each way of sending as fast as WhatsApp allows:

| Way | Best for | Effort per update |
|---|---|---|
| **Broadcast list** (WhatsApp's own feature) | Clients who have your number saved | **One paste, one send** for up to 256 clients |
| **Channel** (WhatsApp's one-way feed) | Public rate updates, no numbers needed | **One post** for unlimited followers |
| **One by one** | Anyone, and messages with the client's name | About 2 taps per client; the app ticks and moves on by itself |

## What is new on the WhatsApp Broadcast page

- **Three ways to send** (tabs on the right: One by one, Broadcast list, Channel).
- **One by one now moves on by itself.** Press the big green **Open WhatsApp for <client>** button, send in WhatsApp, come back: the client is ticked automatically and the next one is ready. Not sent? Press **Undo**. Not now? **Skip for now**. On a computer press **Enter** to open the next client. All clients open in the same WhatsApp Web tab, so tabs do not pile up.
- **Ticks belong to the message.** A new message (for example the 12 PM rates after the 10 AM rates) starts with everyone unticked, so you no longer have to press Reset between updates. If you only fixed a typo in the same message, press "keep the old ticks".
- **Name merging.** Use `{name}` (contact person, or the firm if there is none), `{firm}`, `{date}`, `{time}` in the message. Each client gets their own filled-in copy (in One by one). In a Broadcast list or Channel everybody gets the same text, so the names become "Sir/Madam".
- **Latest rates** button: loads the newest ready message from the Rates Desk into the box in one tap, and tells you if it is not from today.
- **Saved messages**: keep your usual messages (good morning, holiday notice ...) and insert them in one tap.
- **Smarter phone numbers**: understands `99099 71301`, `+91 99099 71301`, `09909971301`, `99099 71301, 90330 00032`, numbers in the "other numbers" and contact-person fields, and foreign numbers. Landline-only and invalid numbers are marked so you can fix them. A number used by two clients is flagged.
- **Recent broadcasts**: a short log of finished rounds (when, which list, how many).
- **Manage Lists**: filters (Buyers / Sellers / Both, In list / Not in list / No WhatsApp number), **Add all shown** / **Remove all shown**, rename a list, and each list shows how many of its clients can really receive WhatsApp.
- Your message draft is kept when the phone switches to WhatsApp and back, and if the phone closes the page while WhatsApp is open, the client you opened is ticked when the page opens again (with an Undo).

## Setting up the Broadcast list (once)

1. **Clients must have your number saved**, otherwise WhatsApp silently does not deliver a broadcast to them. In the app: Broadcast list tab, step 1, **Share my contact card** sends your contact card with a short request to save it. Send it to everyone once using One by one (or in your groups).
2. **Save your clients in your phone** (only needed for clients not saved yet): step 2, **Download contacts**. Open the file on your phone (Android: tap it and choose Contacts; iPhone: tap it, Add All Contacts). A list of more than 256 clients is split into parts, because WhatsApp lists hold 256.
3. **Make the list in WhatsApp**: Android: three dots, New broadcast. iPhone: Chats, Broadcast Lists, New List. Tick the clients (WhatsApp has no "select all"; the page can show you the names to tick) and name the list.
4. **Every update**: step 4, **Copy and open WhatsApp**, choose the broadcast list, press send. If the list is not offered in WhatsApp's chooser, open it yourself and paste (the message is already copied).

Good to know: each client receives it as a normal private message from you, replies come to you privately, and it counts as a "sent" only for those who have your number saved.

## Using the Channel (optional)

WhatsApp, Updates tab, + , New channel. Open it, tap the name, Share link, and paste the link on the page (Channel tab). Use **Put the invite message in the box** and send the invite to your clients once with One by one. After that each update is: **Copy and open my channel**, paste, send. Channel posts are visible to all followers, can be forwarded and disappear after 30 days, so use it for public rates only.

## The fast daily routine with the Rates Desk

1. The Rates Desk notification arrives ("📊 12 PM update ready").
2. Tap it, check the message, press **Send to my client lists** (or open WhatsApp Broadcast and press **Latest rates**).
3. Broadcast list tab: **Copy and open WhatsApp**, choose the list, send. Done in about 10 seconds.
4. For clients who do not have your number: One by one, or the Channel.

## Where things are saved

Lists and ticks stay in the same Firebase collection as before (`whatsapp_lists`). Saved messages, recent broadcasts, the channel link and your last choice are in a new collection `whatsapp_extras`, and also in the browser as a backup. If you restricted your Firestore rules to certain collections, add `whatsapp_extras` (signed-in users may read and write). Without it everything still works; those small items are then kept on that device only.

## Files in this zip (upload all, same folders, replace when asked)

```
BROADCAST_GUIDE.md                     (this guide)
src/pages/WhatsAppBroadcast.tsx        (the page, rebuilt)
src/broadcast/phone.ts                 (new: phone numbers, contact files, name merging)
src/broadcast/storage.ts               (new: saved messages, recent broadcasts)
```

Nothing else changes, and nothing needs to be set up in Firebase or Vercel.

## Limits and honesty

- **Only message people who expect it.** WhatsApp restricts numbers that many people report as spam, even when sent by hand. Keep the lists to your own clients.
- The page cannot see whether a message was really delivered or read. In One by one, "sent" means "you opened WhatsApp for that client and came back" (use Undo when you did not send).
- A broadcast reaches only people who saved your number. If someone says they did not receive it, ask them to save your number.
- This page does not use the WhatsApp Business API. If one day you want fully automatic sending with delivery reports, that is the official route and it needs a Business account; tell me and I can prepare the page for it.

## Troubleshooting

| What you see | What to do |
|---|---|
| The client is not ticked after I come back | The app ticks only if you were away from the page for more than about 2 seconds. Tick with the small check button on the client, or press Undo/Open again. |
| A client was ticked but I did not send | Press **Not sent? Undo** (or the check button on the client). |
| "Landline only" / "Not a valid number" | Open Parties and correct the phone number, or add a mobile number in the other numbers field. |
| Everyone shows unticked after I edited the message | That is on purpose (a new message). Press "keep the old ticks" if it is the same message. |
| The broadcast did not reach some clients | They do not have your number saved. |
| Latest rates says "not from today" | Open the Rates Desk and fetch or paste the latest board first. |

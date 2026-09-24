# The Coin Bag — classroom bidding game

A small web app for the blind-bid auction game: sir shows a bag of coins, everyone
bids privately from their phone, the highest bid wins — and pays or receives the
difference once the bag's real value is revealed.

- `index.html` — landing page, choose a role
- `student.html` — where students enter their name and bid
- `sir.html` — the teacher dashboard: QR code, live standings, close/reveal, history
- `firebase-config.js` — **you fill this in** (step 2 below)
- `db.js` — all the Firestore read/write logic, shared by both pages
- `firestore.rules`, `firebase.json` — deployment config

No build step, no framework — plain HTML/JS, synced live through a free Firebase
project.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   create a new project (the free **Spark** plan is enough — no credit card).
2. In the project, go to **Build → Firestore Database → Create database**.
   Choose any nearby region and start in the default (locked) mode — the rules
   file in this project overwrites whatever you pick in step 4.
3. Go to **Project settings → General**, scroll to "Your apps," and add a
   **Web app** (the `</>` icon). Give it any nickname — you don't need
   Firebase Hosting set up through that wizard.

## 2. Add your config

Firebase will show you a `firebaseConfig` object. Copy it into
`firebase-config.js`, replacing the placeholder values:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

While you're in that file, set `CURRENCY` if you're not using ₹.

## 3. Set your teacher PIN

Open `sir.html`, find this line near the top of the `<script>` block, and
change it:

```js
const SIR_PIN = "2468";
```

This just keeps casual visitors off the teacher dashboard — see the security
note below.

## 4. Install the Firebase CLI and deploy

```bash
npm install -g firebase-tools
firebase login
```

From inside this folder:

```bash
firebase use --add        # pick your project, e.g. give it the alias "default"
firebase deploy --only firestore:rules,hosting
```

The CLI prints a Hosting URL when it's done, e.g. `https://your-project.web.app`.

- Give students: `https://your-project.web.app/student.html`
- Open yourself: `https://your-project.web.app/sir.html` (enter your PIN)

`sir.html` generates a QR code pointing at `student.html` automatically —
print it once, reuse it every round, no need to regenerate.

## Testing locally first

You can open the files directly in a browser, or serve them with any static
file server (`npx serve .`, VS Code's Live Server, etc.) — they'll still talk
to your real Firebase project, so it's a fine way to test with a couple of
tabs before deploying. You don't need to deploy to try it out.

## How a round works

1. Sir clicks **Start new round** — this is the only round "open" at a time.
2. Students open the link, enter their name and a bid, and can change it
   any time while the round is open.
3. Sir clicks **Close bidding** once everyone's in — no more bids accepted.
4. Sir enters what the bag is actually worth and clicks **Reveal to the
   class** — everyone's screen updates with the result at once:
   - Bid higher than the bag's worth → the winner pays the difference.
   - Bid lower → the winner still gets the bag, and receives the difference.
   - Bid exactly right → no money changes hands.
5. Past rounds stay listed under **Past rounds** on the teacher dashboard.

## Security note

There's no login system here — that's what keeps setup to "paste a config
and deploy." Two consequences worth knowing:

- The teacher PIN is a soft deterrent (checked in the browser), not real
  access control. Anyone who really wanted to could open `sir.html`'s code
  and read it, or write directly to Firestore. Don't share the `sir.html`
  link with students, and treat it the way you'd treat leaving an answer
  key visible on a desk — fine for a classroom game, not for anything
  sensitive.
- `firestore.rules` stops students from submitting a bid after a round
  closes, but doesn't lock round management to "sir" specifically, since
  there's no account system to check against.

If you ever want real access control, the standard upgrade path is Firebase
Authentication (e.g. a single teacher email/password) with the rules
checking `request.auth.token.email == "your@email.com"` — happy to help wire
that up if you get there.

## Free tier

Firestore's free quota (Spark plan) is roughly 50k reads and 20k writes a
day — a class of 40 playing several rounds uses a tiny fraction of that.

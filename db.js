// db.js — all Firestore reads/writes for the Coin Bag game live here,
// so student.html and sir.html both import from this one place.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig, CURRENCY } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const roundsCol = collection(db, "rounds");
const bidsCol = collection(db, "bids");

export { CURRENCY };

export function formatCurrency(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return CURRENCY + Number(n).toLocaleString("en-IN");
}

export function slugify(name) {
  return (
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player"
  );
}

// ---------------- Rounds ----------------

// Creates a new round, closing off any round still marked "open" first
// so there's only ever one live round at a time.
export async function startNewRound(label) {
  const openSnap = await getDocs(query(roundsCol, where("status", "==", "open")));
  await Promise.all(
    openSnap.docs.map((d) => updateDoc(d.ref, { status: "closed", closedAt: serverTimestamp() }))
  );

  const ref = doc(roundsCol);
  await setDoc(ref, {
    label: (label || "").trim(),
    status: "open",
    actualValue: null,
    winnerName: null,
    winnerBid: null,
    bidCount: 0,
    createdAt: serverTimestamp(),
    closedAt: null,
    revealedAt: null,
  });
  return ref.id;
}

export function closeRound(roundId) {
  return updateDoc(doc(roundsCol, roundId), { status: "closed", closedAt: serverTimestamp() });
}

// Reads every bid placed this round, works out the winner, and stores the
// result on the round document so no one needs a live bids listener afterwards.
export async function revealRound(roundId, actualValue) {
  const snap = await getDocs(query(bidsCol, where("roundId", "==", roundId)));
  let winner = null;
  snap.forEach((d) => {
    const b = d.data();
    if (!winner || b.amount > winner.amount) winner = b;
  });
  await updateDoc(doc(roundsCol, roundId), {
    status: "revealed",
    actualValue,
    winnerName: winner ? winner.name : null,
    winnerBid: winner ? winner.amount : null,
    bidCount: snap.size,
    revealedAt: serverTimestamp(),
  });
}

// The single most recent round, whatever its status — this is all either
// page needs to know what to show right now.
export function subscribeLatestRound(cb) {
  const q = query(roundsCol, orderBy("createdAt", "desc"), limit(1));
  return onSnapshot(q, (snap) => cb(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }));
}

export function subscribeRecentRounds(cb, take = 25) {
  const q = query(roundsCol, orderBy("createdAt", "desc"), limit(take));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// ---------------- Bids ----------------

// Deterministic doc id (round + slugified name) means submitting again
// with the same name just updates the existing bid — no duplicates.
export function submitBid(roundId, name, amount) {
  const id = `${roundId}__${slugify(name)}`;
  return setDoc(doc(bidsCol, id), {
    roundId,
    name: name.trim(),
    amount,
    submittedAt: serverTimestamp(),
  });
}

export function subscribeMyBid(roundId, name, cb) {
  const id = `${roundId}__${slugify(name)}`;
  return onSnapshot(doc(bidsCol, id), (snap) => cb(snap.exists() ? snap.data() : null));
}

// Live standings for the round currently on screen (used by sir's dashboard).
export function subscribeBids(roundId, cb) {
  const q = query(bidsCol, where("roundId", "==", roundId));
  return onSnapshot(q, (snap) => {
    const bids = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    bids.sort((a, b) => b.amount - a.amount);
    cb(bids);
  });
}

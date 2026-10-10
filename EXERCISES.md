# SplitPot exercises

You are joining the SplitPot team this week. You have never seen this code
before. Use AI tools (Claude, ChatGPT, Copilot, Cursor, anything you like)
the way you would at work.

What we care about is **how** you work with AI, not how fast you finish:

- what context you give the tool,
- whether you check what it tells you before you believe it,
- when you disagree with it,
- and whether you can explain the result in your own words.

Your interviewer will tell you which exercises to do. You probably won't
finish everything. That's expected. Say what you skipped and why.

## Before you start

```bash
git clone https://github.com/tiennguyentony/splitpot.git
cd splitpot
npm install
npm test            # should be green
npm run typecheck   # should be clean
npm run dev         # API on http://localhost:3000, demo data loaded
```

You need Node 24 (`node -v`). Nothing else needs to be installed.

To try the API, log in as a demo user and use the token:

```bash
curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com"}'
curl -s localhost:3000/groups -H "authorization: Bearer <token>"
```

**Ground rules**

1. Share your screen, including your AI chat window.
2. Keep your AI conversation. At the end, export or copy it into
   `session/ai-transcript.md` (or share a link).
3. For each piece of AI output you use, be ready to say whether you
   **accepted**, **edited** or **rejected** it, and why.
4. You may run anything, add files and change code. Commit to a branch
   named `session/<your-name>`.

---

## Warm-up: explore and explain (10–15 min)

Use AI however you like to understand the codebase. Then write
`session/NOTES.md` answering:

1. In two or three sentences: what does SplitPot do, and who uses it?
2. Alice sends `POST /groups/:id/expenses` for a €100 dinner split equally
   between three people. Trace it step by step until the response, naming the
   files and functions. Where is the amount converted, where are the shares
   computed, and where do the balances get updated?
3. `GET /groups/:id/balances` returns a number per member. Where does that
   number come from at the moment of the request?

Then **close the AI window** and walk your interviewer through your notes.

# Part 1: When AI gets it wrong

The tasks below are in areas where AI tools often give confident, wrong
answers: rounding, currency direction, caching, authorisation and time zones.
Your job is not to get an answer from the AI. It is to find out what is
actually true, prove it (a failing test, a `curl`, a query), and be able to
say which parts of the AI's answer you threw away.

## 1.1 Support queue (20 min)

Three messages came in from the Lisbon trip group (log in as Alice, Bea or
Chen and look at group `grp_1` to see the same data they see).

> **Alice:** We split a €100 dinner three ways. Settle-up tells Bea to pay
> people, and afterwards someone is *still* owed €0.01. Where did that cent
> go? It's driving my accountant brain crazy.

> **Bea:** I paid the airport taxi, **$54.00**. In the app it counts as
> **€58.32**. The dollar is weaker than the euro, so how did my taxi get
> *more* expensive?

> **Chen:** Yesterday I fixed the EUR/USD rate in the rates table, but Bea's
> taxi from last week still uses the old rate. The app is using stale rates!

For each message:

1. Is it a bug? Answer **bug / not a bug / need more info**, with one
   sentence of reasoning that points at code or docs.
2. For each real bug, prove it with a failing test (a test that fails now
   and will pass once fixed).
3. Fix one of them. Say why you chose that one, and what the AI suggested
   that you did **not** do.

## 1.2 Write the missing tests for settle-up (15 min)

`tests/unit/settle.test.ts` is short and ends with an `it.todo`. Use AI to
write real tests for `suggestTransfers` in `src/domain/settle.ts`, including
that todo.

Then answer: **is the implementation correct?** Show your evidence. If your
tests all pass on the first try, explain why you believe them.

## 1.3 Review the money routes (15 min)

Ask an AI tool to review `src/routes/expenses.ts`, `src/routes/payments.ts`
and the services they call, for security and data-integrity problems.

1. Triage every finding in `session/review.md`: **real / not real / not worth
   fixing now**, one sentence each. "Not real" needs a reason you checked,
   not a feeling.
2. Prove the most serious real one with a test or a `curl` command.
3. Name one thing the AI flagged that turned out to be fine, and one real
   problem it missed (if any).

## 1.4 Do the docs tell the truth? (10 min)

Ask AI to update `README.md` so it matches the code: stack, database,
environment variables, how to run it, and the features list. Then list every
claim the AI got wrong or left wrong, and how you checked each one.

## 1.5 Review an AI answer (10 min)

A teammate asked an AI assistant about a support ticket and is about to close
it. Read `review/date-filter-ai-answer.md`.

1. Is the AI right? Which of its numbered claims are true, and which
   conclusion doesn't follow?
2. The AI's regression test passes. Why does that not settle it? Make it a
   test that would actually catch the problem the customer describes.
3. Write the two-line reply you would post on the ticket.

# Part 2: Build a new feature with AI

Before your first prompt, write `session/context.md`: what you will tell the
AI about this codebase (conventions, invariants that must not break, things
it should not trust, and your "definition of done"), and a short plan.
Then use it. Keep commits small. You will be asked how you verified each
part, so keep track of what you actually ran.

## 2.1 Small feature: expense categories (15 min)

- An expense can have a `category`: one of `food`, `transport`, `lodging`,
  `activities`, `other`. Missing means `other`.
- The category is returned with the expense.
- `GET /groups/:id/totals` returns the total per category for the group, in
  the group's base currency, as decimal strings.
- Deleted expenses don't count. Only members can see totals.
- Tests for the new behaviour.

## 2.2 Medium feature: itemised receipt split (25 min)

Add a fourth split type, `items`, for restaurant receipts:

```json
{
  "type": "items",
  "items": [
    { "description": "Pizza",    "amount": "18.00", "members": ["usr_alice", "usr_bea"] },
    { "description": "Wine",     "amount": "24.00", "members": ["usr_alice", "usr_bea", "usr_chen"] },
    { "description": "Lemonade", "amount": "3.50",  "members": ["usr_chen"] }
  ],
  "tax": "4.55",
  "tip": "7.00"
}
```

- Each item is split equally between its members.
- Tax and tip are shared in proportion to what each person ordered.
- The expense `amount` must equal items + tax + tip; otherwise reject it.
- Shares must add up to exactly the expense amount, to the cent.
- Works for expenses in a foreign currency.
- Tests, including amounts that don't divide evenly.

## 2.3 Larger feature: recurring monthly expenses (40 min, or design-only in 15 min)

Flatshares pay rent and bills every month. Add recurring expenses:

- `POST /groups/:id/recurring` creates a template: description, amount,
  currency, payer, split, and the day of the month it is due (1–31).
- A job (a function you can call from a test, plus a way to run it) creates
  the real expense for every template that is due, up to "now".
- Running the job twice must never create the same month's expense twice.
- Members can list and stop a recurring expense.
- If the server was down for two months, the job catches up.

If you choose design-only: write `session/design.md` with the schema change,
the job's algorithm, the edge cases you'd test, and what you'd ask the
product owner. Then ask an AI to critique it and say what you changed.

## 2.4 Teach the next AI (10 min)

Write an `AGENTS.md` (or `CLAUDE.md`) at the repo root, so the next
engineer's AI tool doesn't repeat the mistakes you saw today. Keep it under
40 lines. Only include things that are true and useful.

## 2.5 Pull request description (5 min)

Write the PR description for your branch, for a busy senior engineer who has
five minutes:

- what changed,
- how you verified it (exactly what you ran),
- what you did **not** verify,
- which part of the diff they should review most carefully,
- which parts were AI-written.

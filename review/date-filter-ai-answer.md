# Support ticket #318 and the AI answer we got

## The ticket

> From: Priya (group "NYC offsite", base currency USD)
>
> I exported April to send to my manager using
> `GET /groups/grp_7c1f.../expenses?from=2026-04-01&to=2026-04-30`.
> The red-eye flight Sam booked on the night of **31 March → 1 April**
> (entered as `2026-04-01T02:10:00Z`) is missing from April. When I filter
> March it's there instead, but our travel budget closed on 31 March, so
> April is short by $412 and March is over.

(Internal note from ops: the production VM is in `us-east-1` and its system
clock is set to Eastern time.)

## What our teammate asked the assistant

> Here is `src/lib/dates.ts`, `ExpenseService.list` and
> `ExpenseRepo.listByGroup`. A user says an expense from 1 April UTC is
> missing from the April filter. Is the date filter time-zone safe? If yes,
> write a regression test so we can close the ticket.

## The assistant's answer (pasted as-is)

> Yes. The date filter is time-zone safe. Here's why:
>
> 1. `ExpenseRepo.listByGroup` converts both boundaries with
>    `toISOString()`, which **always** produces UTC (`...Z`). The stored
>    `spent_at` values are also UTC ISO strings, so the SQL comparison
>    `spent_at >= ? AND spent_at < ?` compares like with like.
> 2. ISO-8601 strings in the same format sort lexicographically in time
>    order, so string comparison in SQLite is correct.
> 3. The `to` day is made inclusive by adding one day and using `<`, which
>    correctly handles expenses late in the evening on the last day.
>
> The most likely cause is on the client: the mobile app probably sent the
> flight's **local** time without an offset, or Priya's export tool applied
> her local time zone when displaying the list. I'd suggest asking her to
> re-check the export and closing the ticket as "cannot reproduce".
>
> Here's a regression test that proves the boundary works:
>
> ```ts
> it('includes an expense at 02:10 UTC on the first day of the range', async () => {
>   const { get, post, tripId } = createTestApp();
>   await post(`/groups/${tripId}/expenses`, ALICE, {
>     description: 'Red-eye flight',
>     amount: '412.00',
>     paidBy: ALICE,
>     spentAt: '2026-04-01T02:10:00Z',
>     split: { type: 'equal', members: [ALICE, BEA, CHEN] },
>   });
>   const res = await get(`/groups/${tripId}/expenses?from=2026-04-01&to=2026-04-30`, ALICE);
>   expect(res.body.expenses.map((e: { description: string }) => e.description)).toEqual(['Red-eye flight']);
> });
> ```
>
> This test passes, confirming the filter is correct.

The teammate added the test to `tests/integration/expenses.test.ts`, it went
green, and they are about to reply to Priya and close the ticket.

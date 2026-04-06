# Discussion Page Next Steps

## Priorities

1. [x] Proposal navigation inside the left panel
   A long amendment is still hard to scan. It needs collapse/expand, a sticky mini table of contents, or at least `Current text` / `Proposed text` jump links.

2. [x] Better chat ergonomics in the debate panel
   It should auto-scroll intelligently, show a `new messages` jump when you've scrolled up, and keep the composer pinned cleanly at the bottom.

3. [x] Stronger speaker-state cues
   The queue works, but the page should make it instantly obvious who has the floor, who is next, and whether you are waiting, recognized, nudged, or locked out.

4. [x] Chair action history polish
   The procedural lines work, but they would be better with filtering or grouping so a burst of chair actions does not drown out real debate messages.

5. [x] Presence clarity
   Show which delegations are actually present in chamber, not just queued. That matters for quorum and helps the page feel live.

6. [x] Empty-state cleanup
   When there is no recognized speaker and no queue, the top-right controls area still feels heavier than the state warrants. The idle chamber view should be even calmer.

7. [x] Input quality-of-life
   The composer should support drafts, keyboard submit, maybe markdown-lite formatting, and clearer disabled-state explanations.

8. [x] Mobile layout pass
   The desktop structure is improving, but this page needs a deliberate mobile arrangement so the proposal remains accessible without crushing the debate thread.

9. [x] Error/reconnect handling
   Realtime disconnects should be more explicit, and recovering from a dropped PartySocket connection should feel reliable.

10. [x] Audit/source clarity
    Each intervention should eventually support linking, quoting, and maybe replying to a specific earlier message or proposal clause.

## Recommended Next Steps

- Make the proposal panel easier to navigate.
- Improve the chat and live-thread behavior.
- Polish the speaker and presence state so the chamber status is obvious at a glance.

1. [DONE] Create Treaty Backend -> Update Frontend
2. [DONE] Create Amendment Backend
3. [DONE] Create Amendment Frontend
4. [DONE] Create Voting Backend
5. [DONE] Create Voting Frontend
6. [TODO] Connect voting to treaty
7. [TODO] Fix the websocket connection for live council sessions

## UI/UX Improvements

- [X] Revamp the members page
- [X] Show each country's flag in the list and profile pages
- [X] Hide the raw slug from the default members list UI
- [X] Show date joined, veto power, and current chair status
- [X] Add sort and filter controls for members: alphabetical, delegates count, veto holders, chair only
- [X] Add clearer empty states and zero-result messages on treaty search and amendments filtering
- [X] Show active filter chips on the amendments page with a one-click "clear filters" action
- [X] Add amendment countdown timers and more prominent "voting closes" messaging
- [X] Improve the amendment detail layout on mobile so the vote tab and diff preview do not compete for space
- [X] Add deep links from amendment targets to the exact treaty article being changed
- [X] Restore strong home-page calls to action for reading the treaty, viewing amendments, and joining discussion
- [X] Add a persistent section indicator or scroll spy in the treaty table of contents
- [X] Improve accessibility: keyboard focus states, panel semantics, reduced-motion handling, and higher contrast on muted text
- [X] Normalize copy and encoding issues in UI text

## New Features

- Treaty article history with a timeline of passed amendments per article
- Full-text search across treaty articles, amendments, and discussion threads
- "Watch" or subscribe to an amendment for status updates
- Amendment discussion feed with inline references to article text and proposed changes
- Country activity pages showing proposals, votes, and discussion participation
- Dashboard for delegates: open amendments, uncast votes, recent discussions, and chair notices
- Quorum tracker and live attendance for council sessions
- Chair controls for opening sessions, recognizing speakers, managing the queue, and publishing rulings
- Amendment comparison mode that shows current text, proposed text, and final adopted text side by side
- Vote explanations so countries can attach a short public statement to a vote
- Notifications for voting deadlines, passed amendments, veto events, and session starts
- Public API expansion for motions, vote totals, and article change history
- Export options for treaty text and amendment history as PDF or printable pages
- Audit log for moderator and chair actions

## Notes

- The current council session page looks partly stubbed and would benefit from a clearer MVP definition
- The members pages already expose useful country data, but the presentation is still closer to admin output than a polished public-facing directory






IMPORTANT AS FUCK
Continue work on the discussions page
The chair still needs the power to:
- Nudge a delegate to finish speaking
- Stop a delegate from speaking
- Chair keeps chair until the session is over (if France starts the debate as chair, the debate shall also be ended by them, even if their term is over)

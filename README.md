# HuskyConnect

A responsive event discovery app for University of Connecticut students. Find events by major, interests, and campus; understand why an event is recommended; and bookmark the ones you want to revisit.

Independent student hackathon project. **Not affiliated with or endorsed by UConn.** The branding, campus illustration, and event artwork are original, with no UConn logos or protected assets.

## Run locally

Requires **Node.js 22.12+** and npm (tested with Node 22.16.0).

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. This one command starts both the React frontend and Express backend. Press Ctrl+C to stop them.

Alternatively, use two terminals:

```bash
npm run dev:server
npm run dev:client
```

The backend listens on **http://127.0.0.1:3001**. Vite forwards `/api` requests to that port, so the frontend needs no CORS configuration or secret keys. Both servers bind to loopback for local development. The Vite port is strict: stop an existing process if 5173 is occupied.

To build and serve the production version locally:

```bash
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves the built `client/dist` files and the API together. Stop the development API first to free port 3001. `PORT=3002 npm start` selects another production port; the development proxy remains configured for 3001.

## What you can do

- Browse a landing page with featured events and shortcuts to all five campuses.
- Select any of 11 majors, six campus choices (including All Campuses), and 10 interests.
- Search titles, descriptions, hosts, locations, and categories.
- Filter by campus, category, today, next seven days, or next 30 days.
- Sort by keyword relevance or soonest first. Zero-score events remain available.
- Open event details with time, location, host, recommendation explanation, and original source link.
- Save or unsave events; visit the Saved Events page.
- Switch between a predictable demo collection and **live UConn calendar events** using the collection selector.
- Use keyboard navigation, focus indicators, native accessible dialogs, mobile navigation, and reduced-motion support.

Preferences, bookmark IDs, and collection choice live in this browser's `localStorage`. There is no authentication, account, database, or cross-device synchronization. If browser storage is blocked, choices work for the current session and the app reports that they could not be persisted.

## Technologies

React, Vite, JavaScript/JSX, HTML, CSS, Node.js, Express, JSON files, and browser localStorage. Tests use Node's built-in test runner. No TypeScript, Python, paid APIs, database, or authentication library is used. Google Fonts provides DM Sans and Manrope when online; system sans-serif is the fallback.

## Project structure

```text
Hack/
  client/
    public/favicon.svg
    src/
      components/           # Event cards, dialogs, preferences, original icons
      pages/                # Landing and event dashboard (also used for saved events)
      services/api.js       # API requests, browser storage, filtering, date formatting
      App.jsx               # Shared state and hash-based navigation
      main.jsx
      styles.css
    index.html
    vite.config.js
    package.json
  server/
    data/
      events.json           # 25 explicitly fictional demo events
      keywords.json         # Major and interest keyword dictionaries
    routes/events.js        # API routes and validation
    services/
      recommendations.js    # Scoring, explanations, server filters
      eventProvider.js      # Demo provider, live adapter, normalization, caching
    test/                   # Unit, provider, frontend-filter, and HTTP API tests
    app.js                  # Express setup, error handling, production static files
    server.js               # Local HTTP listener
    package.json
  docs/preview.jpg          # Browser screenshot of the completed app
  scripts/dev.js            # Starts and stops both development servers
  package.json              # npm workspace scripts
  package-lock.json
  README.md
```

The pre-existing empty `main.py` was left untouched; the application does not use it. No new Git repository was initialized.

## Architecture, in plain language

Think of React as the storefront and Express as the back office.

1. The **React frontend** displays the cards and controls. It loads the available major/interest options from Express and remembers the student's choices in their browser.
2. When preferences or the event collection change, React sends a **POST `/api/recommendations`** request to Express.
3. The **event provider** supplies either demo JSON or public UConn calendar data. Both become the same event shape, so the rest of the app does not need to know how they were fetched.
4. The **recommendation service** reads the keyword dictionaries, assigns a score to each event, and adds a readable explanation.
5. Express returns JSON. React displays it and applies search/filter/sort controls instantly without refetching on every keystroke. Server-side filters are also available to API clients.
6. Bookmarking updates browser storage. The Saved Events page filters the current collection by those IDs.

Hash routes (`/#explore`, `/#saved`) work on refresh without a routing dependency or special server rewrite rules. In development Vite serves React and proxies API requests; after a production build Express serves both.

## Recommendation scoring

The algorithm examines event **titles and descriptions** using case-insensitive, Unicode-aware word boundaries. For example, `AI` matches `AI workshop` or `AI-powered`, but does not match `chair`, `email`, or `AItools`. Multiword phrases allow whitespace between words.

| Match | Points |
| --- | ---: |
| Major keyword in title | +5 |
| Major keyword in description | +2 |
| Interest keyword in title | +4 |
| Interest keyword in description | +2 |
| Event category is a selected interest | +3 |

Duplicate protections:

- Repeating a keyword in the same field does not earn more points.
- When a major and interest share a keyword, that field receives the **higher weight once**, rather than both weights.
- `AI` and `artificial intelligence` are treated as one concept when tallying points.
- A keyword may score once in the title and once in the description, since those are deliberately separate signals.
- Duplicate selected interests are removed. The API accepts `AI` as an alias for `Artificial Intelligence`.
- Category points are added at most once.

The displayed score is `min(100, round(rawScore / 30 * 100))`. The fixed 30-point threshold is a transparent hackathon heuristic: adding unrelated preferences does not dilute existing matches, and adding/removing other events does not change an event's score. **It is a relevance indicator, not a probability or a measure of event quality.**

Example: `Coding evening` in the title (+5), `software` in the description (+2), and category `Technology` (+3) produces 10 raw points, or 33%. Relevance ties use event date, then event ID. Undecided contributes no major keywords, but interests still work. No relevance threshold hides events.

Campus is a filter, not a score bonus. The recommendation API defaults to the selected campus; the UI requests all campuses and applies the selected campus locally, so students can easily broaden their search.

## API

All routes return JSON. Invalid inputs return HTTP 400 with `{ "error": "..." }`; unknown API routes return 404. JSON bodies are limited to 16 KB.

| Method | Route | Response |
| --- | --- | --- |
| GET | `/api/health` | Status, service name, timestamp |
| GET | `/api/events` | Upcoming events and source metadata |
| GET | `/api/majors` | Major names and campus choices |
| GET | `/api/interests` | Interest names |
| POST | `/api/recommendations` | Scored, ordered events, metadata, normalized preferences |

Example:

```bash
curl http://127.0.0.1:3001/api/health

curl 'http://127.0.0.1:3001/api/events?campus=Stamford&search=hackathon&sort=date'

curl http://127.0.0.1:3001/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{"major":"Computer Science","campus":"Stamford","interests":["AI","Technology"]}'

curl 'http://127.0.0.1:3001/api/events?source=live'
```

Optional `source`: `demo` (default) or `live`.

Optional GET query filters, or the `filters` object in the recommendation POST body:

- `search`: up to 200 characters
- `campus`: one of the campus options
- `category`: an interest category, `Campus Life`, or `All categories`
- `date`: `any`, `today`, `week`, `month`
- `sort`: `relevance`, `date`

Dates are ISO timestamps; the UI presents Eastern time. `today` means the Eastern calendar day, while week/month mean the next 7/30 days. Ongoing events remain visible until their known end time; an event with no end time is excluded after its start. All-day events with no end date remain visible until the next midnight Eastern.

## Event sources and investigation

Public endpoints were tested on **October 9, 2026**, without authentication or access bypasses.

| Source | Endpoint tested | Result / use |
| --- | --- | --- |
| UConn Events | [Public JSON v2 feed](https://events.uconn.edu/live/json/v2/events/response_fields/description,summary,location,group_title,tags,event_types) | HTTP 200; integrated. Returned JSON with event metadata, dates, descriptions, locations, campus tags, and source URLs. |
| UConn Events | [RSS](https://events.uconn.edu/live/rss/events) | HTTP 200; RSS XML verified. |
| UConn Events | [iCal](https://events.uconn.edu/live/ical/events) | HTTP 200; VCALENDAR verified. |
| UConntact | [Event discovery page](https://uconntact.uconn.edu/events) | Public JavaScript application; its visible page links to RSS and iCal. No private API or login used. |
| UConntact | [RSS](https://uconntact.uconn.edu/events.rss) / [iCal](https://uconntact.uconn.edu/events.ics) | Both returned HTTP 200; RSS XML and VCALENDAR content verified. |

The UConn JSON provider was selected because its structured fields avoid introducing an XML/iCalendar parsing dependency. UConntact remains an alternative source, not an integrated second feed; results are not merged between the two systems.

Documentation:

- [UConn: RSS & iCal feeds](https://uconn.atlassian.net/wiki/spaces/IKB/pages/26493911096/RSS%2BiCal%2BFeeds)
- [LiveWhale: JSON API](https://support.livewhale.com/live/blurbs/json-api)
- [LiveWhale: displaying event data on your website](https://support.livewhale.com/calendar-onboarding/widgets-and-api/)

Live provider behavior:

- Fetches up to the first **three pages / 300 source listings**; results may contain fewer usable/upcoming events. During verification the provider returned 299 upcoming events out of 1,508 source listings. These numbers change over time.
- Uses an eight-second timeout per page, a five-minute in-memory cache, and shared in-flight requests to avoid repeated source calls. Failures are cached for 30 seconds.
- Normalizes and deduplicates events by source ID plus occurrence timestamp; skips canceled or invalid records.
- Converts description HTML to plain text. React renders strings; it never injects source HTML. Source links must use HTTP(S).
- Uses explicit campus tags where available, then campus names in location/host fields. Unknown campuses are labeled instead of fabricated. Multi-campus events appear under each tagged campus.
- Maps event types and keywords to the app's categories. These category labels are heuristics, not official UConn categorization.
- If the live feed fails, shows a prominent message and clearly labeled demo events. Fictional listings are never relabeled as live.

### Demo collection

`server/data/events.json` contains exactly **25 fictional events**, including fictional hosts and locations. They are not registration opportunities and have no invented original-event URLs. Each event and detail dialog is marked as demo data. The original-calendar link leads to the actual UConn calendar.

For repeatable presentations, demo event dates are anchored to **tomorrow in America/New_York** plus each record's `dayOffset`. Their wall-clock times handle daylight saving time. This keeps the sample collection upcoming every time the project is opened. Demo mode is the initial default; the student's collection choice is then remembered.

## Testing and verification

```bash
npm test
npm run build
```

The 28 automated tests cover word boundaries, duplicate protection, exact weights, 0–100 normalization, aliases, explanations, campus filtering, missing descriptions, search, ordering, dates, Eastern daylight saving, demo labeling, live normalization, caching, pagination limits, network/schema fallback, API responses, invalid inputs, malformed JSON, and unknown routes. HTTP tests bind a temporary loopback port. Provider tests stub fetch and do not depend on UConn being online.

Verified during implementation:

- 28 tests passed with Node's built-in runner.
- Vite production build completed.
- Both development servers ran; the frontend reached Express through Vite's proxy.
- Live Express integration returned real UConn records.
- Chrome: preference selection, recommendation results, search, bookmark saving, persistence after reload, event details, live collection, mobile menu, empty search state, filter reset, and date sorting.
- Responsive layout checked at the available 750px browser viewport and a 390px mobile viewport; mobile dashboard had no horizontal overflow and no browser console errors were observed in the tested flow.

## Known limitations

- Keyword matching cannot infer deep meaning, prerequisites, suitability, or whether an event is open to a specific student. Confirm audience, eligibility, costs, cancellations, and registration at the original source.
- The live feed is capped to its first 300 listings, not the full calendar. Some records lack locations, campus tags, or end times. Use All Campuses to see unclassified locations and use the official calendar for complete coverage.
- Bookmarks store IDs and show events from the **selected collection's current listings**. An event outside the feed window or already ended will no longer display, although its stored ID remains. Switch collections to see bookmarks for that collection.
- Browser-local preferences and bookmarks do not sync across browsers, devices, or between the development and production origins. Clearing site data resets them.
- Demo dates intentionally move forward each day; they are not stable appointments.
- No authentication, RSVP, notifications, calendar export, or event creation. Original-event links provide the next step for real events.
- Live feed availability depends on UConn and network access. No historical snapshots or persistent server cache are stored.
- This is a local hackathon application, not a deployed production service. It has not been load-tested or comprehensively audited for accessibility.

## 90-second hackathon demo script

**0–15 seconds — The problem**

“Campus has so much going on, but discovering the right event can feel like another assignment. HuskyConnect helps UConn students find events connected to their major, interests, and campus.” Show the landing page and campus shortcuts. Point out the demo label.

**15–35 seconds — Make it personal**

Click **Get started**. Choose **Computer Science**, **Stamford**, **Technology**, and **Artificial Intelligence**. Click **Find my events**. “No account needed. These choices stay in my browser.”

**35–55 seconds — Explain the recommendations**

Show the AI hack night and its explanation. “A JavaScript algorithm checks words in the title and description, weights the strongest matches, and explains the result. It avoids matching AI inside unrelated words and doesn't reward repeated keywords.” Open details to show time, campus, host, and the score. “This is a keyword relevance score, not an AI probability.”

**55–70 seconds — Find and save**

Search **hackathon**, bookmark the event, then open **Saved events**. “I can keep the events I care about, and they stay saved when I refresh.” Reset filters to show all campuses or sort by date.

**70–85 seconds — Real data**

Return to Explore, reset filters, and switch to **Live UConn events**. Open a real listing and show its **Original event** link. “We tested a documented public calendar feed. Live data is normalized into the same format as our demo data, and outages trigger a clearly labeled fallback.”

**85–90 seconds — Close**

“React is the interface, Express serves the events, and JavaScript makes the recommendations. Less scrolling, more connecting.”

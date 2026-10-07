# Cookie Lens — Safari ITP Cookies Validator

A Node.js web app with a browser tracking audit and a response-header audit.

## Setup and run

Requires Node.js 22+, npm, curl, and Chromium. The Codex machine provides `/usr/bin/chromium`, used automatically. Else install Playwright's browser:

```sh
npm ci
npx playwright install chromium
npm test
npm start
```

Set `BROWSER_EXECUTABLE_PATH` for another compatible Chromium binary. On Linux browser system libraries may require `npx playwright install-deps chromium`. The server listens on port 3000; `PORT` and `HOST` override this. `npm run dev` reloads server changes.

## Scan modes

**Browser scan (default UI):** a fresh Chromium session executes the supplied page, captures network attempts and outcomes, detects known analytics/ad providers and candidate pixel paths, inventories script elements, records JavaScript cookie writes, and snapshots browser cookie metadata and local/session storage keys in accessible frames. Supply an optional CSS selector for the consent button (e.g. `#hs-eu-confirmation-button`) to click it and take a second snapshot. No selector means no automated consent interaction; it does not establish that consent was rejected or not already granted by the site's defaults. Cookie values, storage values, query strings, and request payloads are excluded from reports. Names and URL paths can still contain identifiers.

**Header scan:** makes GET requests, follows up to five redirects and checks Set-Cookie attributes. It does not execute scripts.

Both modes export JSON. Browser captures are bounded to 250 requests, 20 frames, 200 script/storage/write entries per frame, a 40-second request-admission window, eight concurrent resource fetches, 10-second fetch timeouts and 5 MB responses. Snapshots can precede delayed trackers; pending and blocked requests make results partial. Service workers, WebSockets, downloads, and popups are blocked. Document redirects are rechecked and replayed as fresh navigations because Chromium routing does not re-intercept HTTP redirect destinations. Subresource HTTP redirects are blocked for destination safety. These changes can affect website behavior and are disclosed in reports.

## Safari interpretation

This is Chromium evidence, not Safari ITP simulation or a compliance certificate. Matching a known provider or pixel URL is a heuristic; tag managers do not prove that an analytics pixel fired. Tracking requests can send information without cookies. Safari generally blocks third-party cookies, but ITP does not categorically block all tracking requests. Script-writable storage may be purged after seven days without interaction, measured in Safari-use days. Tracking classification, decorated links, cloaked tracking and conditional shorter lifetimes need actual Safari tests. Reference: https://webkit.org/tracking-prevention/.

## Network and deployment

Each HTTP(S) browser request uses an intercepted curl transport with normal TLS verification. Only ports 80/443 are accepted. Direct mode resolves all addresses, rejects nonpublic destinations, and pins a validated address per request. Header mode uses the same destination restrictions with its own transport.

With HTTP_PROXY/HTTPS_PROXY present, the managed egress proxy resolves destinations. **Only exact operator-trusted hostnames in SCAN_ALLOWED_HOSTS may load**, including redirects, scripts, images, API and pixel endpoints. The default is `github.com`. Additional public hosts must also be allowed in environment network settings. Blocked attempts remain in the report, but unavailable scripts cannot generate their downstream requests or cookies. Do not trust private hosts. Proxy mode relies on operator configuration and proxy egress controls for destination safety; do not expose it publicly without an egress policy excluding private networks.

Add authentication and per-user quotas before public deployment. The server's two-scan concurrency cap is not per-user rate limiting. Headless page execution consumes significant resources; use container/process isolation for an untrusted public service.

## API

POST `/api/scan` with JSON:

```json
{"url":"https://example.com","mode":"browser","consentSelector":"#accept-cookies"}
```

`mode` defaults to `header` for compatibility. Browser reports include `requests`, `trackers`, `snapshots`, response `cookies`, `consent`, `warnings`, and `limitations`.

## Validation

`npm test` includes real Chromium execution against deterministic intercepted fixtures: script and server cookies, pixel requests, local/session storage, before/after consent, value/query redaction, provider/site boundaries, redirect handling, and private-destination rejection. A live Garage Living scan also exercised page rendering and discovered blocked Hotjar/HubSpot requests under cloud restrictions. Full downstream tracking needs those resource hosts enabled.

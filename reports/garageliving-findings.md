# Garage Living tracking audit — expanded allowlist

Scan: 2026-10-07T20:37:48.443Z (October 7, 2026, 4:37:48 PM America/New_York).

## Findings

This fresh Chromium run observed HubSpot analytics, a successful HubSpot image beacon response, and a same-site tag/collection endpoint at data.garageliving.com. JavaScript wrote HubSpot and Google analytics/advertising cookies before any successful automated consent interaction. This is browser evidence, not a Safari ITP compliance certification or a determination of legal consent compliance.

Compared with the previous run: 95 network attempts (previously 66), 18 stored cookie entries (previously 11), and 51 main-frame script elements (previously 29). The six previously discovered hosts were included in the scanner trusted-host list for this run.

## Coverage and outcomes

| Metric | Count |
|---|---:|
| Network attempts | 95 |
| loaded | 65 |
| http-error | 2 |
| blocked | 28 |

An eight-second observation window was used after initial DOM navigation. The selector #hs-eu-confirmation-button could not be clicked within the allotted time. There is no post-consent comparison; this does not prove the site lacks a banner. Geography, configuration, timing and resource availability can affect consent controls. “Loaded” means a response below HTTP 400 was fetched and delivered, not proof of event ingestion or script execution.

## Requests that now succeed

| Endpoint | Observed result |
|---|---|
| https://track.hubspot.com/__ptq.gif | loaded, HTTP 200 |
| https://data.garageliving.com/gtm.js | loaded, HTTP 200 |
| https://data.garageliving.com/gtag/js | loaded, HTTP 200 |
| https://data.garageliving.com/g/collect | loaded, HTTP 200 |
| https://perf-na1.hsforms.com/embed/v3/counters.gif | loaded, HTTP 200 |
| https://sa.searchatlas.com/api/v2/otto-url-details/ | loaded, HTTP 200 |

Hotjar and HubSpot analytics/ad-loader/consent scripts also returned HTTP 200. A g/collect response does not prove what the receiving service does with the data. The same-site tag and collection paths plus FP-prefixed cookies are consistent with a first-party analytics setup; DNS/CNAME topology and server-side onward destinations were not inspected.

## Browser cookies

Cookie values are omitted. Lifetimes below are remaining requested expirations at scan time, not measured Safari retention.

| Cookie | Domain | Approximate lifetime | Secure | HttpOnly | SameSite |
|---|---|---|---|---|---|
| __cf_bm | .garageliving.com | 30 minutes | Yes | Yes | None |
| _cfuvid | .garageliving.com | session | Yes | Yes | None |
| __cf_bm | .hubspotusercontent-na1.net | 30 minutes | Yes | Yes | None |
| __cf_bm | .hubspot.com | 30 minutes | Yes | Yes | None |
| __cf_bm | .hs-banner.com | 30 minutes | Yes | Yes | None |
| __cf_bm | .hsadspixel.net | 30 minutes | Yes | Yes | None |
| __cf_bm | .hs-analytics.net | 30 minutes | Yes | Yes | None |
| __hstc | .garageliving.com | 180 days | No | No | Lax |
| hubspotutk | .garageliving.com | 180 days | No | No | Lax |
| __hssrc | .garageliving.com | session | No | No | Lax |
| __hssc | .garageliving.com | 30 minutes | No | No | Lax |
| __cf_bm | .hsforms.com | 30 minutes | Yes | Yes | None |
| _gcl_au | .garageliving.com | 90 days | No | No | Lax |
| _ga_JZR8VW68BR | .garageliving.com | 400 days | No | No | Lax |
| _ga | .garageliving.com | 400 days | No | No | Lax |
| FPID | .garageliving.com | 400 days | Yes | Yes | Lax |
| FPLC | .garageliving.com | 1200 minutes | Yes | No | Lax |
| FPGSID | .garageliving.com | 30 minutes | Yes | No | Strict |

Script-write instrumentation recorded __hstc, hubspotutk, __hssrc, __hssc, _gcl_au, _ga_JZR8VW68BR and _ga. A temporary cookietest cookie was created and expired. FPID, FPLC and FPGSID were observed in response headers from data.garageliving.com/g/collect; they must not be treated as JavaScript-created cookies.

## Storage

The main frame had localStorage key `_gcl_ls`. Session storage was empty in accessible snapshots. A same-site frame at data.garageliving.com/_/service_worker/6a60/sw_iframe.html loaded; the scanner blocks actual service workers, so this is not proof that a worker ran. Storage values are omitted.

## Safari ITP interpretation

- The script-created HubSpot identifiers requested approximately 180 days; _ga cookies approximately 400 days and _gcl_au approximately 90 days. Safari may remove script-writable storage after seven days without interaction, measured in days of Safari use. The same conditional concern applies to localStorage. This run does not establish shorter link-decoration or tracking-classification conditions.
- FPID is Secure and HttpOnly and was set by a server response. Do not automatically apply the script-cookie seven-day rule to it. Cloaked-tracking restrictions can affect some server responses; DNS/classification evidence is needed.
- Chromium stored cross-site Cloudflare cookies on HubSpot-related domains. Safari generally blocks third-party cookies regardless of SameSite=None/Secure; Chromium acceptance does not prove Safari acceptance.
- ITP is not a blanket block on analytics network requests. The successful same-site collection response and HubSpot image beacon are separate from cookie acceptance and identifier persistence. Actual Safari requests and lifetimes must be tested.
- Observed script-created analytics cookies lack Secure. Review supported vendor settings; HttpOnly cannot simply be added to JavaScript cookies without changing their design.

## New blocked downstream hosts

These requests were attempted but blocked by the scanner allowlist, not shown to be blocked by Safari. Script-loader presence does not prove a downstream pixel fired. Both scanner trust and environment egress must allow each destination before further testing.

- www.googletagmanager.com
- connect.facebook.net
- s.pinimg.com
- 132140.tctm.co
- towntag.co
- cdn.searchkings.ca
- www.clickcease.com
- www.google.com
- ad.doubleclick.net
- cnv.event.prod.bidr.io
- www.clarity.ms
- analytics.google.com
- stats.g.doubleclick.net

This includes attempted Meta fbevents.js, Google gtag/GTM scripts and collection endpoints, Clarity, Pinterest script URL, ClickCease, and additional unclassified scripts/beacons. Provider labels are heuristic; do not assign purposes to every unmatched host without inspecting it.

## Other failures and limitations

- https://20164216.fs1.hubspotusercontent-na1.net/hubfs/2016%20%20%204216/GarageLiving_June2021/fonts/jakmedia.woff2: HTTP 403.
- https://www.garageliving.com/hubfs/GL_WEB_INTRO_Gen_v8k2_1.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/GL_WEB_INTRO_Gen_v8k_vertical4_1.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/Garage_Living_Collected%20Testimonials.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/hub_generated/template_assets/1/99808782353/1791316482985/ajax-loader.gif: HTTP 404.

The combined network/TLS/size/timeout error does not identify the exact media failure cause. HTTP 403 can originate at the site or an intermediary.

- Chromium observations do not reproduce Safari ITP.
- Provider and pixel matching are heuristic; tag managers are not proof of a fired tracking pixel.
- The initial snapshot has no automated consent interaction; consent defaults may already permit tracking.
- Document redirects are validated and replayed as fresh navigations; subresource redirects are blocked for destination safety.
- Only the supplied page and optional selected consent interaction are scanned. Service workers, WebSockets and popups are blocked.
- Cookie/storage values and URL query strings are excluded; names and URL paths can still contain identifiers.

Next: allow and review the newly discovered public hosts; identify visible consent controls in the intended geography and compare fresh accept/reject sessions; run actual Safari tests; inspect the same-site endpoint DNS and onward processing before concluding whether ITP tracking cloaking rules apply.

Raw evidence: [garageliving-browser.json](garageliving-browser.json). Reference: https://webkit.org/tracking-prevention/.

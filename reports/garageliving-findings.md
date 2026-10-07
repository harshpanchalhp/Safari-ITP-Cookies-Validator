# Garage Living tracking audit — latest expanded access

Completed: 2026-10-07T20:44:22.065Z (October 7, 2026, 4:44:22 PM America/New_York).

## Findings

The newly allowed endpoints exposed additional Google advertising, Meta pixel-loader, Clarity bootstrap, and call-tracking activity. This fresh Chromium run captured 139 requests, 24 stored cookie entries, and 64 main-frame script elements (previous run: 95 requests, 18 cookie entries, 51 script elements).

Cookie and storage observations substantiate script initialization, but fetching a script or receiving HTTP 200 does not prove event ingestion, recording, or profiling. This audit does not simulate Safari or certify ITP/consent compliance.

## Method and results

Fresh Chromium session; homepage only, eight-second observation window following initial DOM navigation. Existing approved hosts and the thirteen newly approved downstream hosts were included in the scanner process allowlist. Cookie/storage values, request bodies, and URL queries are not included in reports.

| Outcome | Count |
|---|---:|
| loaded | 109 |
| http-error | 2 |
| blocked | 28 |

The HubSpot selector #hs-eu-confirmation-button could not be clicked within the allotted time. No post-consent snapshot was captured. All observations precede a successful automated consent interaction; site defaults, geography, timing and resource availability prevent inferring whether consent was required, rejected or granted.

## Observed tracking evidence

| Evidence | Observation |
|---|---|
| HubSpot analytics and beacon | Scripts fetched; track.hubspot.com/__ptq.gif returned HTTP 200. Four script-created HubSpot analytics cookies persisted. |
| First-party analytics | data.garageliving.com/gtm.js, /gtag/js and /g/collect returned HTTP 200. Google _ga cookies and server-set FPID/FPLC/FPGSID were stored. Server-side onward forwarding and DNS topology were not inspected. |
| Google tagging/advertising | www.googletagmanager.com/gtag/js and /gtm.js fetched. www.google.com collection/remarketing endpoints returned HTTP 200, and ad.doubleclick.net/ccm/s/collect returned HTTP 204. Responses do not prove conversion attribution. |
| Meta | connect.facebook.net/en_US/fbevents.js and /signals/config/... returned HTTP 200; JavaScript wrote _fbp. This does not establish a successful Meta event transmission. |
| Hotjar | Loader returned HTTP 200. No successful session-recording upload was established. |
| Clarity | Bootstrap returned HTTP 200 and server-set CLID was stored. scripts.clarity.ms and c.clarity.ms requests were blocked, so complete Clarity execution/collection was not established. |
| Call-tracking signals | 132140.tctm.co/t.js and /p.js returned HTTP 200; two /x.json requests returned HTTP 201. __ctmid and ct132140 cookies plus CTM-named storage keys were observed. Attribution/call records were not inspected. |
| Additional loaders | towntag.co, SearchKings galaxy script and ClickCease monitor script returned HTTP 200. Provider purposes and downstream processing are not independently verified. |
| Pinterest | Requests to ct.pinterest.com/user/ and /v3/ were attempted and blocked. |
| Conversion endpoint | cnv.event.prod.bidr.io/log/cnv returned HTTP 303; the scanner blocked its subresource redirect. This is a scanner restriction, not an observed Safari block. |

## Cookies

The table reports stored browser expiration relative to scan time, not measured retention in Safari. Cookie values are omitted.

| Cookie | Domain | Approximate stored lifetime | Secure | HttpOnly | SameSite |
|---|---|---|---|---|---|
| __cf_bm | .garageliving.com | 30 minutes | Yes | Yes | None |
| _cfuvid | .garageliving.com | session | Yes | Yes | None |
| __cf_bm | .hubspotusercontent-na1.net | 30 minutes | Yes | Yes | None |
| __cf_bm | .hs-analytics.net | 30 minutes | Yes | Yes | None |
| __cf_bm | .hsadspixel.net | 30 minutes | Yes | Yes | None |
| __cf_bm | .hs-banner.com | 30 minutes | Yes | Yes | None |
| __cf_bm | .www.garageliving.com | 30 minutes | Yes | Yes | None |
| __cf_bm | .hsforms.com | 30 minutes | Yes | Yes | None |
| _gcl_au | .garageliving.com | 90 days | No | No | Lax |
| CLID | www.clarity.ms | 365 days | Yes | Yes | None |
| __ctmid | .garageliving.com | 30 days | No | No | Lax |
| __ctmid | www.garageliving.com | 30 days | No | No | Lax |
| _ga_JZR8VW68BR | .garageliving.com | 400 days | No | No | Lax |
| _ga | .garageliving.com | 400 days | No | No | Lax |
| ct132140 | 132140.tctm.co | session | Yes | Yes | None |
| __hstc | .garageliving.com | 180 days | No | No | Lax |
| hubspotutk | .garageliving.com | 180 days | No | No | Lax |
| __hssrc | .garageliving.com | session | No | No | Lax |
| __hssc | .garageliving.com | 30 minutes | No | No | Lax |
| FPGSID | .garageliving.com | 30 minutes | Yes | No | Strict |
| FPLC | .garageliving.com | 1200 minutes | Yes | No | Lax |
| FPID | .garageliving.com | 400 days | Yes | Yes | Lax |
| __cf_bm | .hubspot.com | 30 minutes | Yes | Yes | None |
| _fbp | .garageliving.com | 90 days | No | No | Lax |

FPID requested Max-Age=63072000 (730 days), while Chromium stored an expiry of approximately 400 days. FPID/FPLC/FPGSID were set by the data.garageliving.com/g/collect response, not observed JavaScript writes. CLID was set by the Clarity bootstrap response, and ct132140 by the tctm.co/p.js response.

Distinct observed JavaScript cookie-write names: `cookietest`, `_gcl_au`, `__ctmid`, `_ga_JZR8VW68BR`, `_ga`, `__hstc`, `hubspotutk`, `__hssrc`, `__hssc`, `_fbp`. The temporary cookietest cookie was expired.

## Storage

Main-frame localStorage keys (values omitted):

- `__ctm_132140_ttl`
- `__ctmf_132140_ttl`
- `__ctm2_132140_ttl`
- `_ctm_132140_gid_`
- `lastExternalReferrerTime`
- `_ctm_1242605.1.877.850.8557`
- `__ctm_132140`
- `lastExternalReferrer`
- `_gcl_ls`
- `_ctm_132140_ttl_`
- `__ctmf_132140`
- `__ctm2_132140`

Accessible session storage snapshots were empty. A same-site data.garageliving.com service-worker iframe loaded, but actual service workers are blocked by the scanner; iframe presence is not proof of worker execution.

## Safari ITP implications

- Script-created HubSpot, Google, Meta and call-tracking cookies—and script-writable localStorage—can be affected by Safari removal after seven days without interaction, measured in Safari-use days. Declared multi-month lifetimes are not reliable Safari retention guarantees. Shorter decorated-link or classification-based limits were not established.
- FPID is server-set, Secure and HttpOnly. Do not apply the general script-cookie rule automatically. DNS, cloaked-tracking and classification evidence is needed to assess conditional server-cookie restrictions.
- Chromium accepted cross-site cookies including CLID and ct132140. Safari generally blocks third-party cookies regardless of SameSite=None/Secure; Chromium acceptance is not Safari acceptance.
- ITP does not blanket-block all tracking requests. Cookie availability, request transmission and successful attribution are separate questions. Test the same-site collection endpoint and third-party beacons in real Safari.
- Several script-created analytics cookies lack Secure. Review vendor-supported HTTPS-only settings. HttpOnly cannot simply be added to cookies that scripts create/read without changing their design.

## Remaining blocked hosts

The following six additional hosts were attempted but blocked by the scanner allowlist. Both scanner trust and environment egress need to permit them for fuller coverage:

- googleads.g.doubleclick.net
- scripts.clarity.ms
- fid.agkn.com
- d.agkn.com
- ct.pinterest.com
- c.clarity.ms

## Other failed resources

- https://20164216.fs1.hubspotusercontent-na1.net/hubfs/2016%20%20%204216/GarageLiving_June2021/fonts/jakmedia.woff2: HTTP 403.
- https://www.garageliving.com/hubfs/GL_WEB_INTRO_Gen_v8k2_1.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/GL_WEB_INTRO_Gen_v8k_vertical4_1.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/Garage_Living_Collected%20Testimonials.mp4: Network/TLS/size/timeout failure.
- https://www.garageliving.com/hubfs/hub_generated/template_assets/1/99808782353/1791316482985/ajax-loader.gif: HTTP 404.
- https://cnv.event.prod.bidr.io/log/cnv: Subresource redirect blocked for destination safety.

Combined network/TLS/size/timeout failures do not isolate a media failure cause. HTTP 403 can come from the origin or an intermediary; it is not attributed to the website without further evidence.

## Limits and next checks

- Chromium observations do not reproduce Safari ITP.
- Provider and pixel matching are heuristic; tag managers are not proof of a fired tracking pixel.
- The initial snapshot has no automated consent interaction; consent defaults may already permit tracking.
- Document redirects are validated and replayed as fresh navigations; subresource redirects are blocked for destination safety.
- Only the supplied page and optional selected consent interaction are scanned. Service workers, WebSockets and popups are blocked.
- Cookie/storage values and URL query strings are excluded; names and URL paths can still contain identifiers.

Next: review the six new public destinations, identify the visible consent controls for the intended geography, compare fresh accept/reject sessions, and test actual Safari cookie/storage retention and request behavior. Inspect the same-site collection endpoint DNS and onward processing before asserting ITP resistance.

Raw evidence: [garageliving-browser.json](garageliving-browser.json). Reference: https://webkit.org/tracking-prevention/.

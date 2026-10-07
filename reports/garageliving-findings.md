# Garage Living cookie and tracking audit

Scan completed October 7, 2026 at 4:32:56 PM America/New_York (20:32:56 UTC).

## Result

The homepage loads Hotjar and HubSpot scripts and creates HubSpot analytics cookies through JavaScript. This is substantially more tracking evidence than the original response-header scan, which only observed Cloudflare cookies. These observations do **not** establish Safari ITP compliance or that all tracking requests succeeded.

The expanded allowed-host list was applied to this run. Network permission changes alone had not updated the running scanner's separate SCAN_ALLOWED_HOSTS list; the scan explicitly supplied the previously approved hosts.

## Method and coverage

- Fresh Chromium session; GET navigation from `https://garageliving.com/` to `https://www.garageliving.com/`.
- Eight-second observation window following initial DOM navigation; no previous browser interaction/history.
- Recorded request URLs without queries, outcomes, script elements, cookie metadata, JavaScript cookie writes, and accessible frame storage keys. Values were omitted.
- Attempted to click the HubSpot consent selector `#hs-eu-confirmation-button`; it was not clickable within the allotted time. No post-consent snapshot was collected. This is not proof that the site lacks a consent banner: geography, configuration, timing, and page behavior can affect availability.
- A request recorded as `loaded` means an HTTP response below 400 was fetched and delivered to the browser. It does not prove script execution, CORS acceptance, data processing, or successful event ingestion.

| Observation | Count |
|---|---:|
| Captured network attempts | 66 |
| Responses below HTTP 400 | 55 |
| HTTP error responses | 2 |
| Scanner-blocked/failed requests | 9 |
| Script elements in main-frame snapshot | 29 (8 inline) |
| Stored cookie entries | 11 (6 distinct names across domains) |
| Known-provider request candidates | 9 |

## Tracking scripts and pixel evidence

| Resource | Observed result | Interpretation |
|---|---|---|
| `static.hotjar.com/c/hotjar-3779999.js` | HTTP 200 | Hotjar script fetched; session-recording activity not established by this alone. |
| `js.hs-analytics.net/analytics/.../20164216.js` | HTTP 200 | HubSpot analytics script fetched; JavaScript cookie writes corroborate analytics initialization. |
| `js.hsadspixel.net/pixels.js` | HTTP 200 | HubSpot advertising pixel loader fetched; individual ad-platform pixels cannot be inferred from the loader alone. |
| `js.hubspot.com/web-interactives-embed.js` | HTTP 200 | HubSpot marketing/interactive loader fetched. |
| `js.hs-banner.com/v2/20164216/banner.js` and `/v2/cf-location` | HTTP 200 | Consent/geolocation resources fetched, but the selected consent button could not be clicked. |
| `app.hubspot.com/.../has-permission-json` | HTTP 204 | HubSpot tools-menu request; not proof of an analytics event. |
| `track.hubspot.com/__ptq.gif` | Blocked by scanner allowlist | Actual image/pixel request attempted; transmission was prevented by the scanner, not shown to be blocked by Safari. |
| `perf-na1.hsforms.com/embed/v3/counters.gif` | Blocked by scanner allowlist | Image counter endpoint attempted; payload and purpose not fully inspected. |
| `data.garageliving.com/gtm.js` | Blocked by scanner allowlist | Same-site tag-loader path attempted. The filename suggests a tag manager; implementation and underlying infrastructure remain unverified. |

The requests above occurred before any successful automated consent interaction. This describes the observation sequence; it is **not** a legal compliance determination or proof that the site's consent defaults forbid tracking.

## Cookies

The script-write instrumentation directly recorded writes for the four HubSpot analytics cookies below, plus a temporary `cookietest` cookie that was subsequently expired.

| Cookie | Domain | Observed lifetime | Secure | HttpOnly | SameSite | Source evidence |
|---|---|---|---|---|---|---|
| `__hstc` | `.garageliving.com` | About 180 days requested | No | No | Lax | JavaScript write and browser storage |
| `hubspotutk` | `.garageliving.com` | About 180 days requested | No | No | Lax | JavaScript write and browser storage |
| `__hssc` | `.garageliving.com` | About 30 minutes requested | No | No | Lax | JavaScript write and browser storage |
| `__hssrc` | `.garageliving.com` | Session | No | No | Lax | JavaScript write and browser storage |
| `__cf_bm` | `.garageliving.com` plus five HubSpot-related domains | About 30 minutes | Yes | Yes | None | Response headers/browser storage |
| `_cfuvid` | `.garageliving.com` | Session | Yes | Yes | None | Response headers/browser storage |

The other `__cf_bm` domains were `.hubspotusercontent-na1.net`, `.hsadspixel.net`, `.hs-analytics.net`, `.hs-banner.com`, and `.hubspot.com`.

No localStorage or sessionStorage keys were present in the accessible main-frame snapshot. This only covers the observed window; blocked/delayed resources or subsequent interactions can change storage.

## Safari ITP implications

1. **The requested 180-day lifetimes are not reliable Safari lifetimes.** `__hstc` and `hubspotutk` were written through JavaScript. Safari can remove script-writable storage after seven days without user interaction, measured in days of Safari use. Shorter limits can apply in particular tracking contexts; this scan does not establish those conditions.
2. **Third-party cookies generally cannot be relied on in Safari.** Chromium stored cookies on HubSpot-related domains. Safari's default third-party cookie blocking can prevent their use regardless of `SameSite=None; Secure`. Actual embedded context and exceptions need Safari testing.
3. **Cookie restrictions do not automatically prevent pixel requests.** The HubSpot image beacon attempt is distinct from whether identifiers can be stored or sent. Verify what requests and identifiers Safari actually allows.
4. **A same-site tag-loader URL is not proof of ITP resistance.** `data.garageliving.com/gtm.js` needs DNS/CNAME, endpoint, and browser inspection before making claims about cloaked tracking or server-side tagging.
5. **Secure is absent from the observed HubSpot script cookies.** Consider supported vendor configuration to restrict transmission to HTTPS. HttpOnly would prevent JavaScript access and cannot simply be added to script-created analytics cookies without redesign.

## Remaining gaps and failed resources

Six new downstream hosts were discovered that are not in the scanner's trusted-host list:

- `cta-service-cms2.hubspot.com`
- `perf-na1.hsforms.com`
- `sa.searchatlas.com`
- `track.hubspot.com`
- `data.garageliving.com`
- `api.hubapi.com`

These prevented a complete downstream tracking inventory, including the HubSpot beacon and same-site tag loader. Each needs both explicit scanner trust and permitted environment egress before a fuller run.

Three homepage MP4 requests failed under the combined network/TLS/size/timeout error category; their exact cause was not isolated. A hosted font returned HTTP 403, and `ajax-loader.gif` returned HTTP 404. The 403 source could be the origin or intermediary; it is not attributed to the website without further evidence.

The scanner does not crawl other pages, submit forms, emulate geography, run Safari, wait through multi-day retention periods, execute service workers, or allow WebSockets/popups. Subresource HTTP redirects are blocked for safety; document redirects are replayed as validated navigations. Provider recognition is heuristic and incomplete; consult the full request list for unmatched endpoints.

## Recommended next checks

1. Permit the six newly discovered public hosts and repeat the scan, reviewing any additional downstream destinations.
2. Identify the visible consent controls in the target geography and test separate fresh sessions for no interaction, reject, and accept; compare cookie and beacon activity.
3. Repeat in actual Safari with third-party contexts and realistic interaction history. Check HubSpot identifier retention rather than relying on the declared 180-day expiry.
4. Investigate `data.garageliving.com` DNS and served script, and compare Safari's network/cookie behavior for that endpoint.
5. Review Secure-cookie configuration and the nontracking resource failures with the site owner/vendor.

Raw evidence: [garageliving-browser.json](garageliving-browser.json). Reference: [WebKit tracking prevention](https://webkit.org/tracking-prevention/).

# Controlled Mobile release — prepared, not executed

Manual workflow only. Never triggers from push or pull_request; default is prepare.
Requires workflow definition on default branch before Run workflow becomes visible.
Do not merge this or application PR without Max's final approval. Select the approved
candidate branch and supply its full SHA; checking out a mutable branch is forbidden.

Prepare uses no Netlify token, no Netlify calls and no deployment. It saves a seven-day
static artifact and SHA256 manifest with reviewed source commit; Functions are not
included in that static artifact and must never be uploaded to the static directory.

Publish must be approved by Max with exact SHA, target, 15-credit deployment base cost,
verified current balance and rollback. Two Mobile publications have 30-credit base
cost, plus requests/compute/traffic. Guard requires >=130 available and balance evidence
less than30 minutes old; this is an input confirmed by Max, NOT a billing API reading.
Runtime usage remains variable. No exploratory publishes or retries. No automatic builds
are activated. CLI bundles Functions with root production dependencies. No Drop upload.

Only publish step receives repository Actions secret NETLIFY_AUTH_TOKEN.
Max must enter those directly in GitHub; never chat, artifacts or repo files. Prefer token
with restricted team/site access when available and short expiration; revoke after release.
Destination is fixed separately in each policy by its existing Netlify domain (accepted by the API/CLI); no site-ID secret or new identifier is needed. Destination name is checked via GET API,
stop_builds must still be true, manual publishing must be allowed, and current production
must match the backed-up deploy in policy.json. Any mismatch aborts, never changes policy.
Personal also requires correct production Functions env values: PMS_DATA_MODE=private,
PMS_GOOGLE_CLIENT_ID, PMS_ALLOWED_EMAILS, PMS_PERSONAL_SPREADSHEET_ID,
PMS_GOOGLE_SERVICE_ACCOUNT. Values are read internally without output or artifacts.
That config check does not prove real Google login; approved installation needs real tests.
DEMO must not receive the personal Google reader or private-mode configuration.

After publication verify deploy ID, source manifest SHA, anonymous rejection and authorized
Google login (personal), navigation/calculations/offline behavior, and isolation. Record
these separately from CI green. Only after both personal consumers pass may public Sheet
access be removed with approval. Never reopen public permissions automatically as rollback.

Rollback IDs in policy.json correspond to downloaded deployed-file backups; actual Netlify
rollback permissions and availability still need account verification. Restore prior deploy
only with Max approval and recheck configuration; deploy rollback does not revert secrets.
Streamlit and Apps Script are separate, not installed by this workflow. No data/trigger writes.

Personal credential setup can be grouped: Max may save the JSON reader file directly as
repository Actions secret PMS_GOOGLE_SERVICE_ACCOUNT (only PERSONAL). After exact release
approval and destination/budget/rollback guards, publish sets missing production Functions
variables from this JSON and public policy; it never overwrites differing existing values.
Values and command output stay out of logs/artifacts. Failure may leave newly added variables:
record and review; rollback of deploy does not remove them. DEMO receives no reader JSON.
No OPENAI_API_KEY is created or copied; enabling paid advisor calls requires its own setup
and authorization. With absent advisor keys, keep unavailable UI truthful, not fake success.

Read-only audit runs after tests only for same-repository PRs. It uses the supplied
Netlify token for GET site/deploy metadata and, in PERSONAL only, Google readonly
spreadsheet metadata to verify the reader. It never deploys, writes data or updates
settings. Output contains only readiness, IDs/commits and worksheet count; no keys,
values, holdings or metadata response bodies. Missing credentials block the audit.

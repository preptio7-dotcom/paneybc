# Community phases 1 and 2

This change upgrades the existing community. It does not require new database tables or change the existing community migration. Search, saved posts, post flair, accepted answers, following, and reply notifications remain phase 3 work.

## Behavior

- Login and signup share a validated internal `returnTo`. The destination survives switching forms and the signup email verification steps. The server proxy no longer sends every auth cookie to the dashboard before the page validates the session.
- Discussion URLs remain compatible with `/community?thread=ID`. They now load directly through `/api/community/threads/ID`, regardless of feed position. Subject, sort, page and browser navigation are reflected in the URL.
- The feed has working page navigation. Hot and Top are ranked in PostgreSQL across the matching community, not an arbitrary 200-post sample. Existing votes hydrate on load; choosing the selected vote removes it.
- Comments load additional pages and include ancestors. Removed comments are redacted placeholders, preserving their replies. Removed discussions cannot expose comments or receive votes through the public APIs.
- Posting preserves line breaks and validates length instead of silently truncating. Markdown rendering escapes source HTML and supports paragraphs, lists, code, emphasis, headings, links, and block quotes.
- Post, comment and reply drafts survive failed submissions and refreshes in the same browser tab. Draft keys are scoped to the signed-in account. Drafts are not synchronized across devices.
- Moderation removal, audit logging and report resolution use one transaction. Both report update endpoints share the same implementation. Lock/unlock operations are restricted to threads.
- Community rate limiting uses the existing Upstash infrastructure, keyed by authenticated user. The local fallback is per process; configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared enforcement across production instances.

## Interface

Compact cards keep comments collapsed until requested. A Create post button opens a labeled composer with Markdown preview, including on mobile. Subject navigation, community guidance, loading/retry/empty/locked/removed states, accessible vote states and larger touch controls are included. Deep comment indentation is capped for mobile readability. The green Preptio identity is retained.

## Verification commands

```sh
npm ci
npm run test:community
npm run test:community:e2e
npm run build
```

On Windows with Edge installed, set `COMMUNITY_BROWSER_CHANNEL=msedge` for the browser suite. Otherwise install Playwright Chromium. Browser scenarios use mocked HTTP responses, not a production account or database, and cover authentication returns, signup verification, votes, draft failures, pagination, navigation, and desktop/mobile layout.

The application requires its existing database, JWT, and push-notification environment configuration for a full build. Do not deploy test-only environment values. The existing Next configuration skips TypeScript validation during builds, so TypeScript is also checked separately.

## Production smoke checks

With the existing community migration applied, verify one login and one signup from a real thread, load an older thread directly, move between feed pages, remove a vote, submit a multiline post/comment, and remove reported content through the moderator queue. Confirm the configured Redis limiter is shared across instances. No deployment or production database mutation is performed by this implementation task.

## Verification results (2026-09-17)

- Community regression suite: **52 passed** across seven test files.
- Browser suite: **7 passed**, including login, full signup/email verification, older discussion URLs, refresh/undo voting, draft retention after failure, removed-parent replies, pagination/history, mobile composition and no horizontal overflow at 390 px.
- Scoped ESLint: passed.
- Production build: passed, with test-only database/JWT configuration and temporary generated VAPID keys. Static generation completed for 247 pages. The optional sitemap database read could not connect to the deliberately unavailable test database and used its existing fallback.
- Separate TypeScript check: no diagnostics in the changed files; 56 diagnostics remain in unrelated existing code. The broader pre-existing test suite has five failing tests in public/admin settings, beta-feature UI and join-us behavior. These are outside the approved community scope.
- Screenshots and detailed logs are in `artifacts/community/`. Screenshots show fixture content and local development chrome, not live users or production data.

No live deployment, production signup, notification delivery, or production database writes were performed. Run the production smoke checks above after deployment with the site's real environment configuration.

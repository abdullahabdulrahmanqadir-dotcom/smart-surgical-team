# Project guardrails and architectural decisions

## Confirm major changes first

- Before making a major architectural, deployment, data-model, authentication,
  caching, routing, or repository-history change, stop and reassess the impact.
- Explain the proposed change, why it is needed, the important tradeoffs, and
  how it will be rolled back. Get the user's explicit confirmation before
  implementing or deploying it.
- Do not treat a performance problem as permission to change the site's core
  rendering or publishing model. Prefer the smallest reversible fix and verify
  the existing architecture first.

## Commit and push policy

- Commits do not authorize pushes. Do not push a commit unless the user
  explicitly asks for that push.
- When a major commit or several local commits are ready and would benefit from
  being published together, tell the user and ask whether to push them. Keep
  them local until approval is given.

## Rendering and caching decision

- The approved baseline is commit `d057b89` ("Prevent Worker CPU outages with
  layered caching"). The homepage and database-backed public pages remain
  dynamically rendered so Admin changes and newly published content can appear
  without a manual redeployment.
- Public anonymous document requests use the layered Worker/browser/service
  worker cache introduced by `d057b89`.
- Do not convert the homepage or database-backed content pages to build-time
  static output without first presenting the publishing-staleness consequence
  and receiving explicit user approval.
- Commits `9cea4cb`, `026186a`, and `8535dee` document the static-rendering
  experiment and its partial reversal. Treat them as historical context, not as
  authorization to reintroduce that architecture.

## Incident note

The site was changed to broad static pre-rendering to avoid Worker CPU limits.
Although that reduced Worker work, it made Admin edits and new content stale
until a manual deploy and contributed to homepage regressions. The repository
was restored to `d057b89` and force-pushed to `origin/main` on 2026-08-20.

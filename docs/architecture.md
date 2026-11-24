# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Use a shared React API client, route each capability to a dedicated component, and render accessible loading, success, empty, and error states. Keep API URL construction in `src/api/client.ts` and keep rendering logic in the capability components.
- Logic tier decision: Use explicit Express routes for the `/api` contract and service functions for validation and business behavior. Return JSON, pass unexpected errors to the shared error middleware, and return deliberate 4xx statuses for invalid or unknown resources rather than cast or server errors.
- Data tier decision: Define required fields and relationships in Mongoose schemas. Use ObjectIds for user/team references, arrays for team members and seed stable demo records with upserts. Reconcile demo users' team membership without deleting unrelated records.
- Activity tracking approach: Validate `userId`, `teamId`, `type`, and `minutes`; confirm that both referenced records exist and that the IDs are well formed. On success, store the user/team ObjectIds, minutes, a computed positive points value, and `occurredAt`, then return the created activity with string IDs.
- Team management approach: Validate a team name and mascot at the schema and service boundaries. Default `members` to an empty array, accept existing member ObjectIds, and return teams with their submitted name, mascot, and member IDs.
- Leaderboard approach: Aggregate activity `points` by team, join teams for display names, sort totals from highest to lowest, and assign 1-based ranks in the returned order.
- Workout suggestions approach: Find the user by its email address, match workouts to the user's fitness goal or most recent activity pattern, and return a matching first suggestion with a concise reason. Return a 4xx response when the email has no matching user.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Baseline: 5/5 tests failed.
  - Failures mean Mongoose validation is missing for users, teams, activities, and workouts. The seed test also reached MongoMemoryServer startup but timed out, so seed behavior could not yet be evaluated.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Baseline: 4/4 tests failed.
  - Failures mean activity/team creation still returns placeholder `501` responses, leaderboard aggregation returns no entries, and workout suggestions ignore the requested user's goal/activity.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Baseline: 15/15 tests failed.
  - Failures mean the capability components are still placeholders and do not yet show fetched data or accessible loading, empty, and error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Run after the data and API contracts pass. A failure means TypeScript compilation or route/service types need correction.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Run after the presentation contract passes. A failure means frontend TypeScript or Vite bundling needs correction.

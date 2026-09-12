# PatchMyCode Backend Technical Documentation

## 1. Purpose and Scope

PatchMyCode is a TypeScript/Node.js backend for an AI-assisted GitHub pull-request review and autofix product. It provides:

- An Express HTTP API for user registration, authentication, profiles, GitHub OAuth, GitHub App installation management, repository configuration, repository inspection, and applying suggested fixes.
- A GitHub webhook endpoint for pull-request reviews, installation synchronization, issue-comment `/fix` commands, and inline review-comment `/fix` commands.
- A code-analysis pipeline that parses a pull-request diff, resolves changed symbols, finds bounded caller relationships, sends structured context to Gemini, and publishes the result back to GitHub.
- MongoDB persistence for users, credentials, tokens, OTPs, and GitHub App installations.
- A namespaced, tier-based in-memory cache abstraction. Only the L1 LRU tier is currently configured.

The implementation is under `src/`. TypeScript source is compiled to `dist/` by the build pipeline.

## 2. Technology and Runtime

The service uses:

- Node.js with ECMAScript modules (`package.json` sets `type` to `module`).
- TypeScript, executed directly in development with `tsx`.
- Express 5 and Node's `http` server.
- Mongoose 9 for MongoDB.
- Octokit App and REST clients for GitHub App installation access.
- Google GenAI for structured Gemini responses.
- Tree-sitter grammars for symbol and scope resolution.
- `parse-diff` for GitHub unified diffs.
- Zod for request validation.
- `jsonwebtoken`, bcryptjs, nodemailer, LRU Cache, and express-rate-limit as supporting dependencies.

### Commands

```text
npm run dev      # tsx watch src/server/index.ts
npm run build    # inject/check env, run tsc, then tsc-alias
npm start        # node dist/src/server/index.js
npm run format   # prettier --write .
npm run seed     # references script/seed.ts; verify that file exists before use
```

The `build.js` pipeline runs these steps in order:

1. Executes `npx tsx src/configs/env.ts` to load and validate environment variables.
2. Runs `tsc` using `tsconfig.json`.
3. Runs `tsc-alias` to convert TypeScript path aliases into runtime-compatible paths.

## 3. Process Startup

The process entrypoint is `src/server/index.ts`.

Startup sequence:

1. Importing `src/configs/env.ts` loads `.env` through `dotenv/config` and validates all exported configuration values. Missing, empty, or undefined values cause the process to throw.
2. Importing `src/clients/index.ts` initializes MongoDB connection logic, cache tiers, email, HTTP, and OTP exports. The MongoDB module immediately calls `connectDB()`.
3. An Express app is created in `src/clients/express-http.ts` and wrapped in a Node HTTP server.
4. `trust proxy` is set to `1`.
5. Global middleware is registered in this order:
   - CORS middleware.
   - `express.json({ limit: "5mb" })`.
   - Request/response logger.
6. Public routes are registered:
   - `GET /` health-style process information.
   - `/api` application API.
   - `/webhook` webhook API.
   - `GET /docs.json` generated OpenAPI JSON.
   - `GET /docs` generated Swagger UI HTML.
7. The error handler is registered.
8. A final 404 handler returns `{ error: true, message: "Route not found" }`.
9. The HTTP server listens on `PORT`, defaulting to `8082`.

The root endpoint returns the application name and the process deployment timestamp. `deployedAt` is initialized once at process startup; it is not a release timestamp fetched from external infrastructure.

## 4. Global Request Behavior

### Response envelope

Most application responses use the following shape:

```json
{
  "error": false,
  "message": "Human-readable result",
  "data": {}
}
```

Errors use the same envelope with `error: true`. `createResponse` in `src/utils/response.ts` is the common constructor.

### Logging

`src/middlewares/logger.ts` logs every non-OPTIONS request when the response finishes. The log contains local India time, status code, duration, response size, method, URL, and client IP. Request bodies are also printed with unlimited object depth because `shouldLogBody` is currently `true`. This can expose credentials, OTP-related payloads, tokens, or other sensitive request data in logs.

### JSON parsing and errors

The global JSON body limit is 5 MB. Invalid JSON is converted by the error handler into HTTP 400 with `Invalid JSON in request body`. Other uncaught errors produce HTTP 500 with `Internal server error`.

### Validation

`validate(schema)` parses a combined object containing `body`, `query`, `params`, and `headers` with Zod. Parsed values replace the corresponding request data before the controller runs. Validation failures return HTTP 422 and a `data` object keyed by dotted Zod paths.

## 5. HTTP Routing

### Public and infrastructure routes

| Method | Path               | Behavior                                                 |
| ------ | ------------------ | -------------------------------------------------------- |
| GET    | `/`                | Returns process status, app name, and startup timestamp. |
| ALL    | `/api/health`      | Returns an `OK` response.                                |
| GET    | `/docs`            | Serves generated Swagger UI HTML.                        |
| GET    | `/docs.json`       | Serves generated OpenAPI JSON.                           |
| ALL    | `/webhook/github/` | Receives GitHub webhook events.                          |

### User API

All user API paths are under `/api/user`.

| Method | Path                                             | Auth     | Validation | Behavior                                                                    |
| ------ | ------------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------- |
| ALL    | `/api/user/health`                               | No       | No         | User-scoped health response.                                                |
| GET    | `/api/user/profile`                              | User     | No         | Fetches the authenticated user document.                                    |
| POST   | `/api/user/auth/sign-up/send-otp`                | No       | Yes        | Creates a signup OTP and sends it by email.                                 |
| POST   | `/api/user/auth/sign-up`                         | No       | Yes        | Verifies signup OTP, creates user and password credential.                  |
| POST   | `/api/user/auth/sign-in`                         | No       | Yes        | Verifies email/password and issues access and refresh tokens.               |
| POST   | `/api/user/auth/sign-out`                        | No       | No         | Deactivates the refresh token from the cookie and clears auth cookies.      |
| ALL    | `/api/user/auth/verify-token`                    | User     | No         | Validates token locals and confirms the user exists.                        |
| GET    | `/api/user/auth/github`                          | Optional | No         | Redirects to GitHub OAuth.                                                  |
| GET    | `/api/user/auth/callback/github`                 | No       | No         | Handles GitHub OAuth callback.                                              |
| GET    | `/api/user/auth/github/callback`                 | No       | No         | Alias for the OAuth callback.                                               |
| GET    | `/api/user/github/oauth-url`                     | Optional | No         | Returns a GitHub OAuth URL.                                                 |
| DELETE | `/api/user/github/disconnect`                    | User     | No         | Removes linked GitHub profile data.                                         |
| GET    | `/api/user/github/install-url`                   | User     | No         | Returns the GitHub App installation URL.                                    |
| POST   | `/api/user/github/installations/link`            | User     | Yes        | Links an installation and synchronizes its repositories.                    |
| GET    | `/api/user/github/installations`                 | User     | No         | Lists non-deleted installations owned by the user.                          |
| GET    | `/api/user/github/repositories`                  | User     | No         | Flattens repositories across installations; supports `search` and `status`. |
| POST   | `/api/user/github/sync`                          | User     | No         | Refreshes repositories from every linked installation.                      |
| PATCH  | `/api/user/github/repositories/:repoId/status`   | User     | Yes        | Enables or pauses review for a repository.                                  |
| GET    | `/api/user/github/repositories/:repoId`          | User     | Yes        | Fetches live repository metadata, branches, open PRs, and review comments.  |
| PATCH  | `/api/user/github/repositories/:repoId/branches` | User     | Yes        | Sets target base branches for automatic reviews.                            |
| POST   | `/api/user/github/repositories/:repoId/fix`      | User     | Yes        | Applies a supplied suggestion to a PR branch.                               |

`repoId` is validated as a numeric string and converted to a number in controllers. Repository-mutating services also scope queries by the authenticated user's ID, preventing a user from managing a repository stored under another user's installation.

### Admin API

The admin router is mounted at `/api/admin` and currently exposes only `ALL /api/admin/health`. The admin token factory exists, but no admin business routes are registered in the current source.

## 6. Authentication and Authorization

### User token flow

`src/middlewares/authenticate/factory.ts` implements a reusable access/refresh authentication strategy.

Token lookup order:

1. Access token from `Authorization: Bearer <token>`.
2. Access token from the configured access cookie.
3. Refresh token from `x-refresh-token` header.
4. Refresh token from the configured refresh cookie.

Behavior:

- No access or refresh token returns HTTP 401.
- A valid access token attaches `id`, `role`, and `exp` to `res.locals` and continues.
- An invalid/expired access token with no refresh token signs out and returns HTTP 401.
- A valid refresh token creates a new access token, writes it to the `Authorization` response header and access cookie, verifies the new token, attaches locals, and continues.
- An invalid refresh token signs out and returns HTTP 403.

User auth uses the `u_at`, `u_rt`, `u_ot`, `u_fpt`, and `u_oat` token names. Access tokens expire after 5 minutes and refresh tokens after 7 days. Admin has a parallel configuration with `a_*` cookie names, although admin authentication is not currently mounted on a business route.

### Password authentication

Sign-in lowercases the email, loads the user credential, verifies the bcrypt hash, rejects suspended users, creates access and refresh JWTs, persists refresh-token metadata, sets auth cookies, and returns both tokens in the response body.

Sign-out finds the refresh token in the cookie, marks its matching user refresh token inactive, and clears the auth cookies.

### Signup and OTP

Signup is two-step:

1. `send-signup-otp` confirms that the email is unused, creates an OTP request, and sends the generated code by email. Email delivery is intentionally fire-and-forget; delivery failure is logged but does not change the HTTP success response.
2. `sign-up` verifies the OTP request and code, checks the email again, creates the user, hashes the password, and creates a credential record.

OTP records are typed (`user_signup` or `user_forget`), count attempts, and have a MongoDB TTL index on `expiresAt`. The signup validation requires a valid email, ObjectId-shaped request ID, OTP code, name, and credential payload.

## 7. GitHub OAuth and App Installation

### OAuth URL and state

The OAuth service signs a short-lived JWT state token with the user's OAuth secret. The state contains an optional authenticated user ID, an action (`connect` or `signin`), and a timestamp. The URL requests GitHub `read:user,user:email` scopes.

The redirect URI is `GITHUB_APP_REDIRECT_URI` when configured, otherwise it is `${BASE_URL}/api/user/auth/callback/github`.

### OAuth callback

The callback exchanges the GitHub authorization code for an access token, fetches the GitHub user profile, and then:

- For an authenticated connection, stores GitHub identity on the existing user and links matching non-deleted installations by GitHub account ID or login.
- For unauthenticated access, finds a user by GitHub ID or email, creates a new active user when none exists, creates a random-password credential for new users, links installations, issues user auth tokens, sets cookies, and redirects to the application.

The controller redirects success and failure results to `APP_URL` rather than returning an API envelope.

### Installation linking and synchronization

`linkInstallation` retrieves the installation and the repositories visible to its installation token. It upserts a MongoDB installation document and preserves previous `isActive` values for repositories that remain selected. The webhook `installation` event provides a second synchronization path, and `installation_repositories` applies additions and removals incrementally.

Repository configuration fields include:

- `repoId`, `name`, `fullName`, and `private`.
- `isActive`, which controls whether automatic PR review is enabled.
- Optional metadata such as URL, description, default branch.
- `targetBranches`, an allowlist of PR base branches. An empty list means all base branches are accepted.

## 8. GitHub Webhook Entry and Dispatch

The public endpoint is `ALL /webhook/github/`, implemented by `src/server/webhook/github.ts` and `src/controllers/github/index.ts`.

The controller reads `x-github-event` and `req.body`, sends this response immediately:

```json
{
  "error": false,
  "message": "Webhook processed successfully",
  "data": {}
}
```

It then dispatches in a `try` block without awaiting the selected service promise:

| `x-github-event`              | Service                          |
| ----------------------------- | -------------------------------- |
| `pull_request`                | `handlePullRequest`              |
| `issue_comment`               | `handleIssueComment`             |
| `pull_request_review_comment` | `handlePullRequestReviewComment` |
| `installation`                | `handleInstallation`             |
| `installation_repositories`   | `handleInstallationRepositories` |

Unknown events are logged and ignored. Because the service calls are not awaited, asynchronous rejections occurring after dispatch are not caught by the controller's synchronous `try/catch`; the sender always receives the early 200 unless an earlier middleware rejects the request. The current controller also does not validate the GitHub webhook signature, so deployment-level protection or a future signature middleware is required if the endpoint is exposed directly to GitHub.

## 9. Pull Request Review Pipeline

The review service handles only `opened`, `synchronize`, and `reopened` pull-request actions. Other actions return a successful ignored response.

### Gate and safety checks

1. Require `installation.id`.
2. Load an active `Installation` document.
3. Find the repository by numeric GitHub ID or case-insensitive full name.
4. Require `repoConfig.isActive`.
5. If `targetBranches` is non-empty, require the PR base ref to be in that list.
6. Build an installation-scoped Octokit client.
7. Fetch App metadata to determine the bot slug.
8. Skip when the sender is a bot matching the app, or when the head commit has `[patchmycode-autofix]`, `[skip-review]`, a matching bot author/committer login, or a bot-like author name.

The commit loop check logs a warning and continues if fetching commit details fails. This means a GitHub API failure in the loop-prevention lookup does not itself skip the review.

### Analysis and publication sequence

For an eligible user commit:

1. Set GitHub commit status `patchmycode/review` to `pending`.
2. Fetch the PR as a raw unified diff with Octokit `pulls.get(..., mediaType: { format: "diff" })`.
3. Parse the diff with `parse-diff`.
4. Download the repository tarball at the exact PR head SHA.
5. Extract it with the system `tar` command into a temporary directory, stripping GitHub's root folder.
6. Analyze the blast radius of changed symbols.
7. Build the AI prompt from the PR title, base/head branches, raw diff, and blast-radius graph.
8. Call Gemini with JSON response mode and `prReviewResponseSchema`.
9. Publish one GitHub review containing a summary and inline comments.
10. Set the commit status to `success`, or `failure` if any issue is `CRITICAL`.
11. Delete the temporary repository directory in a `finally` block.

On pipeline failure, the service attempts to set commit status to `error` and returns a 500-shaped service response. Since the webhook controller has already responded, this service response is observable in logs rather than sent as the webhook HTTP response.

## 10. Repository Download and Cleanup

`downloadAndExtractRepo` creates:

```text
<os.tmpdir>/patchmycode/<owner>-<repo>-<sha>-<timestamp>/
  repo.tar.gz
  src/
```

It downloads the archive for the exact ref, writes it to disk, executes `tar -xzf` with `--strip-components=1`, deletes the archive, and returns the extracted `src` path. `cleanupRepo` removes the parent temporary directory recursively and logs cleanup failures without throwing.

The server therefore requires a working `tar` executable and sufficient temporary disk space. Repository extraction is isolated by a timestamped directory but is not a persistent workspace.

## 11. Diff Parsing and Code Analysis

### Changed-symbol extraction

`extractModifiedSymbols` processes each parsed diff file:

1. Uses the destination path, or source path for deletions.
2. Collects added line numbers and maps deleted lines to the new chunk anchor.
3. Reads the corresponding file from the extracted repository.
4. Parses the file with Tree-sitter based on extension.
5. Resolves the smallest enclosing supported symbol for each changed line.
6. Deduplicates symbols by file, name, and start line.
7. Stores symbol name, file, 1-based start/end lines, and full source text.

Purely changed files with no resolvable supported symbol do not contribute modified symbols.

### Supported language extensions

| Extensions     | Grammar    | Recognized symbol nodes                                                             |
| -------------- | ---------- | ----------------------------------------------------------------------------------- |
| `.ts`, `.tsx`  | TypeScript | Functions, methods, arrows, function expressions, classes, interfaces, type aliases |
| `.js`, `.jsx`  | JavaScript | Functions, methods, arrows, function expressions, classes                           |
| `.py`          | Python     | Functions and classes                                                               |
| `.go`          | Go         | Functions and methods                                                               |
| `.rs`          | Rust       | Functions, impl items, traits                                                       |
| `.java`        | Java       | Methods, constructors, classes, interfaces                                          |
| `.c`, `.h`     | C          | Function definitions                                                                |
| `.cpp`, `.hpp` | C++        | Function definitions and classes                                                    |
| `.rb`          | Ruby       | Methods, classes, modules                                                           |
| `.php`         | PHP        | Functions, methods, classes                                                         |

Parser instances are cached by extension. Symbol names are obtained from the syntax node's `name` field, with special handling for JavaScript/TypeScript variable-declared functions and object properties.

### Caller scanning

`findSymbolCallers` recursively walks the extracted repository while ignoring `node_modules`, VCS/build directories, common generated directories, lock files, maps, minified files, images, and archives. It uses a word-boundary regular expression for the symbol name, then uses Tree-sitter to discard matches inside comments or strings where possible.

Each match is represented by its file, line, enclosing symbol, and a short top-level snippet when no enclosing symbol exists. A caller function is captured once even if it references the symbol multiple times.

### Blast-radius limits

The caller graph in `analyzeBlastRadius` is deliberately bounded:

- Maximum graph depth: 2.
- Maximum total nodes: 100.
- Maximum callers per symbol at each scan: 15.

The graph begins with modified symbols at depth 0. For each node, callers become child nodes. Duplicate nodes are suppressed by file, symbol, and start line. Failures while finding callers are logged and leave the current node without callers.

## 12. AI Review Contract

The prompt combines:

- PR title.
- Base and head branch names.
- Raw unified diff.
- Blast-radius nodes containing symbols, files, line ranges, source, depth, and nested callers.

The system instruction directs Gemini to report only concrete production-relevant problems, emphasizing correctness, architecture, scalability, reliability, security, and downstream impact. It explicitly rejects style-only findings and defines `CRITICAL`, `WARNING`, and `NOTE` severity.

`generateStructuredAIResponse` calls model `gemini-3.5-flash-lite` with JSON MIME mode and the review response schema, then parses `response.text` with `JSON.parse`.

The required response is:

```text
{
  verdict: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  overallSummary: string,
  fileSummaries: [{ path: string, summary: string }],
  issues: [{
    path: string,
    line: number,
    severity: "CRITICAL" | "WARNING" | "NOTE",
    category: "BUG" | "BREAKING_CHANGE" | "SECURITY" | "PERFORMANCE" | "CODE_SMELL",
    comment: string,
    suggestion?: string
  }]
}
```

Suggestions are expected to contain only replacement code. The publisher places them inside GitHub `suggestion` fences.

## 13. Review Publication

`publishReview` constructs a top-level review body with the overall summary and changed-file summaries. Each issue becomes an inline review comment with:

- The issue severity in bold.
- The issue comment.
- Optional fenced suggestion code.
- Instructions to commit the suggestion or reply `/fix`.

The GitHub review event is `APPROVE` only for an `APPROVE` verdict; all other verdicts use `COMMENT`. A critical issue changes the commit status to `failure`; otherwise it becomes `success`.

## 14. Autofix Workflows

### Inline review comment `/fix`

`pull_request_review_comment` is processed only for newly created comments. A body beginning with `/fix` triggers `resolveCommentFix`.

The service:

1. Requires an installation ID.
2. Verifies the repository is active in the installation.
3. Extracts a suggestion from the current comment or, when replying to another comment, fetches the parent comment and extracts its first `suggestion` block.
4. Resolves the file path and target/start line from the comment metadata.
5. Fetches the PR head branch.
6. Fetches the current file content.
7. Replaces the selected line range, preserving CRLF versus LF when editing a range. With no valid target line, the supplied suggestion replaces the entire file.
8. Commits through `repos.createOrUpdateFileContents` with a `[patchmycode-autofix]` commit marker and bot author/committer metadata.
9. Replies to the review comment with the commit link or an error.

The suggestion regex is:

````text
/```suggestion\\r?\\n([\\s\\S]*?)\\r?\\n```/
````

### PR issue `/fix`

An `issue_comment` is processed only when it is a new comment on a pull request and begins with `/fix`. `resolvePullRequestFixes` lists up to 100 review comments, filters bot comments containing suggestions, applies each suggestion to the PR head branch, and posts a summary comment containing the number of fixes and commit links. It is designed to make several sequential file-content commits.

### Dashboard fix

The authenticated repository fix endpoint receives a repository ID, PR number, path, suggestion, optional target/start lines, and optional comment ID. It verifies repository ownership through the installation document, resolves the PR branch, applies the fix, and optionally replies to the referenced GitHub review comment.

## 15. MongoDB Persistence

### User

`User` stores name, unique lowercased email, active/suspended status, and optional GitHub identity (`id`, login, name, email, avatar, connection time). Timestamps are enabled and Mongoose version keys are disabled.

### Credential

Credentials are stored separately from users and contain the target user, role, MFA type, and password hash. Password hashes are selected explicitly during sign-in.

### Token

Refresh/session records contain token type, role, target ID, token value, device/IP/user-agent metadata, active flag, last-used timestamp, and expiry. The token value is unique and excluded from normal queries. A MongoDB TTL index removes records after `expiresAt`.

### OTP

OTP records contain target ID, code, numeric expiry, type, and attempts. A TTL index uses `expiresAt`.

### Installation

Installations are keyed by unique numeric `installationId` and store the owning user, GitHub account identity/type, status, and embedded repository configuration. Installation status is `active`, `suspended`, or `deleted`. Indexes cover installation ID, user/status, and embedded repository ID.

## 16. GitHub Client Boundaries

`src/clients/github.ts` centralizes:

- A GitHub App initialized from App ID and private key.
- Installation-scoped Octokit creation.
- Cached App metadata lookup with environment fallback.
- Installation lookup and repository listing.
- OAuth code exchange.
- GitHub user and fallback email lookup.

The review and repository services use installation-scoped Octokit so repository operations run with the permissions of the installed GitHub App.

## 17. Cache Architecture

`CacheLayerClient` provides a generic ordered tier abstraction with `get`, `set`, `delete`, `deleteByPattern`, and `clearAll`.

Reads check tiers in order. A hit backfills skipped earlier tiers. A miss calls the source query once per key using in-flight request deduplication, then writes to all tiers asynchronously. Options support default/per-tier TTLs, skipped tiers, background refresh, and a `shouldCache` predicate.

The current configuration contains one L1 `lru-cache` tier with a 50 MB size limit. Production TTL defaults to 300 seconds; development TTL defaults to 1 second. No cache use is currently required by the GitHub review flow shown in the source.

## 18. Environment Configuration

The runtime requires these configuration groups:

```text
NODE_ENV
PORT
DATABASE_URL
DATABASE_NAME
CORS_ORIGINS
APP_URL
BASE_URL
APP_DOMAIN
GMAIL_USER
GMAIL_APP_PASSWORD

ADMIN_ACCESS_TOKEN_SECRET
ADMIN_REFRESH_TOKEN_SECRET
ADMIN_OTP_TOKEN_SECRET
ADMIN_FORGET_PASSWORD_TOKEN_SECRET
ADMIN_OAUTH_TOKEN_SECRET

USER_ACCESS_TOKEN_SECRET
USER_REFRESH_TOKEN_SECRET
USER_OTP_TOKEN_SECRET
USER_FORGET_PASSWORD_TOKEN_SECRET
USER_OAUTH_TOKEN_SECRET

GITHUB_APP_WEBHOOK_SECRET
GITHUB_APP_ID
GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET
GITHUB_APP_PRIVATE_KEY
GITHUB_APP_REDIRECT_URI

# Optional: used as the GitHub App slug fallback by GitHub client code.
GITHUB_APP_SLUG

GEMINI_API_KEY
```

The environment validator walks the exported configuration object, so every value exported from `env.ts` must be populated even when a particular route is not currently registered.

## 19. Operational Limits and Failure Modes

- JSON request bodies are limited to 5 MB.
- Review graph traversal is limited to depth 2, 100 total nodes, and 15 callers per symbol.
- Repository branch listing is capped at 100 branches.
- Open PR listing is capped at 20 PRs.
- Review comments fetched for repository details and bulk fixes are capped at 50 and 100 respectively.
- GitHub installation repository listing is capped at 100 items.
- A failed MongoDB connection logs the failure and retries after 5 seconds.
- AI output parsing relies on valid JSON; malformed model output throws.
- GitHub review processing is started after the webhook response and is not represented by the webhook HTTP response.
- Webhook signature verification is not implemented in the current controller.
- Logger body output is enabled and should be treated as sensitive-data logging.
- Tar extraction depends on the host `tar` executable and temporary filesystem capacity.
- The GitHub review flow sets `pending` before analysis and `success`/`failure` or `error` afterward, but there is no durable job record or retry queue for an interrupted process.

## 20. OpenAPI Documentation

`src/docs/index.ts` builds an OpenAPI 3.0 document from the currently defined user path definitions. It normalizes missing operation responses to generic success/error JSON schemas. The document includes broader tag groups than the currently registered routes, so the generated tags should be treated as documentation metadata rather than proof that every listed capability is implemented.

## 21. Recommended Request Lifecycles

### Normal authenticated API request

```text
Client
  -> CORS
  -> JSON parser
  -> request logger
  -> route validation
  -> user auth middleware
  -> controller
  -> service
  -> MongoDB/GitHub/email
  -> response envelope
  -> logger finish event
```

### Pull-request webhook

```text
GitHub
  -> /webhook/github
  -> immediate HTTP 200
  -> event dispatch
  -> installation/repository/branch gates
  -> bot-loop check
  -> pending commit status
  -> fetch diff and exact-SHA archive
  -> parse changed symbols
  -> scan callers and build bounded blast radius
  -> Gemini structured review
  -> GitHub review comments and commit status
  -> temporary directory cleanup
```

### Suggested fix

```text
GitHub comment or dashboard
  -> verify active installation and repository ownership
  -> locate suggestion block and target lines
  -> fetch current PR-head file
  -> replace lines or entire file
  -> commit through GitHub Contents API
  -> reply with commit result
  -> subsequent pull_request webhook is ignored when bot markers are detected
```

## 22. Code Map

| Area                | Primary files                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Process/server      | `src/server/index.ts`, `src/clients/express-http.ts`                                                               |
| API routing         | `src/server/api/index.ts`, `src/routes/user/*`, `src/routes/admin/*`                                               |
| Webhook routing     | `src/server/webhook/index.ts`, `src/server/webhook/github.ts`                                                      |
| Webhook dispatch    | `src/controllers/github/index.ts`                                                                                  |
| PR review           | `src/services/github/webhook.ts`                                                                                   |
| Review publication  | `src/services/github/publisher.ts`                                                                                 |
| Autofix             | `src/services/github/fix.ts`                                                                                       |
| Archive handling    | `src/utils/archive.ts`                                                                                             |
| Diff/scope analysis | `src/utils/blast-radius.ts`, `src/utils/scanner.ts`, `src/utils/scope-resolver.ts`, `src/utils/parser-registry.ts` |
| AI integration      | `src/clients/ai/client.ts`, `src/clients/ai/prompt.ts`, `src/types/ai.ts`                                          |
| GitHub integration  | `src/clients/github.ts`                                                                                            |
| Auth                | `src/middlewares/authenticate/*`, `src/utils/jwt/*`, `src/services/user/auth.ts`                                   |
| User/GitHub API     | `src/controllers/user/*`, `src/services/user/*`, `src/validations/user/*`                                          |
| Persistence         | `src/models/mongo/*`, `src/clients/db/mongo.ts`                                                                    |
| Cache               | `src/clients/cache/*`                                                                                              |
| Configuration       | `src/configs/env.ts`, `src/lib/constant.ts`                                                                        |

# Test Plan (Chunked Execution)

## Step 1 – Core & Systems
- `npm run test:run -- tests/engine tests/systems tests/entities`
- `npm run test:run -- tests/movement tests/pathfinding`

## Step 2 – World Generation Focus
- `npm run test:run -- tests/world tests/testWorld`
- `npm run test:run -- tests/integration/graveyardChunk.integration.test.js`

## Step 3 – Gameplay Mechanics
- `npm run test:run -- tests/combat tests/items tests/status`
- `npm run test:run -- tests/quests tests/vendors`

## Step 4 – Social & UI
- `npm run test:run -- tests/social tests/ui tests/cursor`
- `npm run test:run -- tests/data tests/helpers`

## Step 5 – Misc & Remaining
- `npm run test:run -- tests/sprites tests/execution`
- `npm run test:run -- tests/graveyardChunk.test.js tests/graveyardChunk.async.test.js tests/starchy.fail.test.js tests/starchy.spawn.test.js`

## Manual HTML Harnesses (after CLI batches)
- `test-world*.html`, `test-quest-*.html`, `test-social.html`, `test-movement-responsiveness.html`, `test-terrain-passability.js`, etc.

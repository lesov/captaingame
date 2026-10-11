# Agent Workflow Instructions

These instructions govern all agentic LLM work in this repository. Every agent must read, reference, and follow this document before making changes. Deviations are not permitted unless a human approver explicitly updates this document or gives written, task-specific approval.

## Core Requirements

1. Agents must use strict GitFlow-style workflows.
2. Agents must work on separate branches and, where practical, separate worktrees from other agents.
3. Agents must never merge into `main` without explicit approval from a human approver.
4. Agents must maintain a shared change and coordination log for cross-agent collaboration.
5. UI changes must be human tested and explicitly approved before they are considered complete.
6. Non-UI and UI-adjacent behavior must be covered by appropriate unit or regression tests added during development.
7. A human approver determines when the project has reached a stable state. Only after that approval may work be merged into `main` and tagged appropriately.

## Branch And Worktree Rules

1. Do not work directly on `main`.
2. Create a dedicated branch for each unit of work.
3. Use a branch name that identifies the agent and task, such as:

   ```text
   feature/<agent-id>/<short-task-name>
   fix/<agent-id>/<short-task-name>
   test/<agent-id>/<short-task-name>
   docs/<agent-id>/<short-task-name>
   ```

4. Use a separate git worktree when concurrent agent work is active or expected.
5. Before starting work, check the current branch and worktree state.
6. Before editing files, check for existing uncommitted changes. Treat uncommitted changes as potentially belonging to another agent or the human user.
7. Do not overwrite, revert, delete, or reformat work owned by another agent unless explicitly instructed by a human approver.
8. Keep commits scoped to the active task.

## Main Branch Protection

1. Agents must never merge, rebase, fast-forward, reset, force-push, or otherwise alter `main` without explicit human approval.
2. Agents must never tag a release without explicit human approval.
3. A human approver must state that the project is stable before any merge to `main` or release tag is created.
4. If approval is ambiguous, agents must stop and ask for clarification.

## Shared Agent Log

All agents must maintain a shared coordination log named `AGENT_CHANGELOG.md` at the repository root.

Each meaningful update must include:

```text
## <YYYY-MM-DD HH:MM TZ> - <agent-id> - <branch>

- Status: <started | in-progress | blocked | ready-for-review | approved | merged>
- Summary: <brief description of the work>
- Files changed: <paths>
- Tests run: <commands and results>
- UI review: <not-applicable | pending-human-test | approved-by-human>
- Blockers or coordination notes: <notes for other agents>
```

Agents must update this log when:

1. Starting a task.
2. Changing branch or worktree context.
3. Making a meaningful code, test, documentation, or configuration change.
4. Discovering a blocker or conflict.
5. Completing implementation.
6. Completing tests.
7. Receiving human UI approval.
8. Receiving human stable-state or merge approval.

The log must be factual and concise. It must not replace commit messages, pull request descriptions, or test output, but it must give other agents enough context to coordinate safely.

## Testing Requirements

1. Agents must add or update tests for all non-trivial behavior changes.
2. Non-UI functionality must be verified with unit or regression tests.
3. UI-adjacent functionality, such as state management, validation, routing, data formatting, accessibility helpers, or API integration behavior, must be covered by automated tests where feasible.
4. Existing relevant tests must be run before work is considered complete.
5. If tests cannot be run, the agent must record the reason in `AGENT_CHANGELOG.md` and report it to the human user.
6. Agents must not claim a change is verified unless the relevant tests have actually been run and passed.

## UI Change Requirements

1. UI changes must be human tested.
2. UI changes must receive explicit human approval before being marked complete.
3. Automated checks may support UI validation, but they do not replace human approval.
4. Agents must record UI review status in `AGENT_CHANGELOG.md`.
5. Until human approval is recorded, UI work must remain in a pending review state.

## Stable State, Merge, And Tagging

1. Only a human approver may declare the project stable.
2. Agents must not infer stable state from passing tests, successful builds, or lack of reported issues.
3. Once stable state is explicitly declared, an agent may merge to `main` only if the human approver also explicitly authorizes the merge.
4. Tags must be created only after explicit human approval.
5. Tag names and release notes must follow project conventions. If no convention exists, the agent must ask for approval before creating a tag.

## Conflict And Coordination Rules

1. If another agent is editing the same files, coordinate through `AGENT_CHANGELOG.md` before proceeding.
2. If a conflict is found, do not resolve by discarding another agent's work unless explicitly approved by a human.
3. Prefer small, isolated changes that minimize overlap with other active work.
4. Document assumptions and coordination concerns in `AGENT_CHANGELOG.md`.
5. When blocked, record the blocker clearly and wait for human or agent coordination as needed.

## Required Pre-Work Checklist

Before making repository changes, every agent must:

1. Read this file.
2. Check the current branch.
3. Check worktree status.
4. Confirm they are not working directly on `main`.
5. Create or switch to an appropriate task branch and worktree when needed.
6. Review `AGENT_CHANGELOG.md` if it exists.
7. Add a task start entry to `AGENT_CHANGELOG.md`.

## Required Completion Checklist

Before reporting work complete, every agent must:

1. Confirm changed files are intentional.
2. Run relevant tests and record the results.
3. Update `AGENT_CHANGELOG.md`.
4. Report any tests that were not run and why.
5. For UI changes, confirm human approval has been received and recorded.
6. Leave work on the task branch unless explicitly approved to merge.

## Absolute Prohibitions

Agents must never:

1. Work directly on `main` for implementation changes.
2. Merge into `main` without explicit human approval.
3. Create release tags without explicit human approval.
4. Delete or overwrite another agent's work without explicit human approval.
5. Mark UI work complete before human testing and approval.
6. Claim tests passed without running them.
7. Ignore this instruction file.


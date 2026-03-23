# GitHub CLI Project Management Guide

> Reusable guide for managing projects via `gh` CLI. Covers issues, PRs, branches, reviews, and workflows.

---

## Table of Contents

- [Setup](#setup)
- [Issues](#issues)
- [Branches](#branches)
- [Pull Requests](#pull-requests)
- [Code Review](#code-review)
- [Merging](#merging)
- [Labels](#labels)
- [Workflow: Feature / Bug Fix](#workflow-feature--bug-fix)
- [Workflow: Copilot Review Cycle](#workflow-copilot-review-cycle)
- [Workflow: Hotfix](#workflow-hotfix)
- [Best Practices](#best-practices)
- [Quick Reference](#quick-reference)

---

## Setup

### Authenticate

```powershell
gh auth login
gh auth status          # verify
```

### Clone & configure

```powershell
gh repo clone owner/repo
cd repo
git config pull.rebase true   # keep linear history
```

---

## Issues

### Create

```powershell
# Interactive
gh issue create

# Inline (simple)
gh issue create --title "Bug: description" --label bug

# From file (complex body with code blocks)
gh issue create --title "Title" --body-file issue_body.md --label bug,security
```

> **Tip:** For bodies with special characters or code blocks, always use `--body-file` to avoid shell escaping issues.

### View & list

```powershell
gh issue list                          # open issues
gh issue list --state all --limit 20   # all issues
gh issue list --label bug              # filter by label
gh issue view 37                       # view specific issue
gh issue view 37 --comments            # with comments
```

### Update

```powershell
gh issue edit 37 --add-label security
gh issue edit 37 --title "New title"
gh issue close 37 -c "Fixed in PR #38"
gh issue reopen 37
```

---

## Branches

### Naming conventions

| Type        | Pattern                          | Example                             |
|-------------|----------------------------------|-------------------------------------|
| Feature     | `feature/description`            | `feature/email-templates`           |
| Bug fix     | `fix/issue-X-description`        | `fix/issue-33-slurm-truncation`     |
| Refactor    | `refactor-description`           | `refactor-ssh-config`               |
| Docs        | `docs/description`               | `docs/api-consistency`              |
| Cleanup     | `cleanup/description`            | `cleanup/remove-unused-files`       |

### Commands

```powershell
# Create and switch
git checkout -b fix/issue-37-ssh-leaks

# Push new branch
git push -u origin fix/issue-37-ssh-leaks

# List branches
git branch -a

# Delete merged branch (local + remote)
git branch -d fix/issue-37-ssh-leaks
git push origin --delete fix/issue-37-ssh-leaks
```

---

## Pull Requests

### Create

```powershell
# Interactive (opens editor)
gh pr create

# Inline
gh pr create \
  --title "Fix: SSH credential leaks - closes #37" \
  --body "## Summary\nFix description\n\n## Testing\n- Test 1\n- Test 2\n\nCloses #37"

# From file (recommended for complex descriptions)
gh pr create --title "Title" --body-file pr_body.md
```

### PR description template

```markdown
## Summary
What changed and why.

## Changes
- Change 1
- Change 2

## Testing
- [ ] Test case 1
- [ ] Test case 2
- [ ] All existing tests pass

Closes #XX
```

### View & list

```powershell
gh pr list                             # open PRs
gh pr list --state all --limit 10      # all PRs
gh pr view 36                          # view specific PR
gh pr view 36 --comments               # with review comments
gh pr diff 36                          # view diff
```

### Update

```powershell
# Push more commits to update the PR (just push to the branch)
git add -A
git commit -m "Address review comments"
git push origin branch-name

# Edit PR metadata
gh pr edit 36 --title "New title"
gh pr edit 36 --add-label security

# Close without merging
gh pr close 36 -c "Closing: reason"
```

---

## Code Review

### Request Copilot review

Copilot reviews PRs automatically when enabled. To re-request after pushing fixes:

```powershell
# Re-request review via GitHub API
gh api repos/{owner}/{repo}/pulls/{pr}/requested_reviewers \
  --method POST \
  --field "reviewers[]=copilot-pull-request-reviewer[bot]"
```

### Fetch review comments

```powershell
# Overview (in PR view)
gh pr view 36 --comments

# Detailed inline comments (full JSON)
gh api repos/{owner}/{repo}/pulls/36/comments

# Reviews summary
gh api repos/{owner}/{repo}/pulls/36/reviews
```

### Respond to comments

Options for each comment:

1. **Fix it** - Make the change, commit, push to same branch
2. **Defer it** - Create a new issue, reference it in a reply
3. **Dismiss it** - Reply explaining why it's not needed

```powershell
# Reply to a review comment
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies \
  --method POST \
  --field "body=Fixed in latest commit"
```

---

## Merging

### Strategies

| Strategy        | When to use                             | Command flag |
|-----------------|-----------------------------------------|--------------|
| **Squash merge**| Multiple messy commits, feature branches| `--squash`   |
| **Merge commit**| Clean history worth preserving          | `--merge`    |
| **Rebase**      | Linear history, few clean commits       | `--rebase`   |

### Commands

```powershell
# Squash merge (recommended - clean single commit)
gh pr merge 36 --squash \
  --subject "Refactor SSH config to hide credentials" \
  --body "Closes #31. Centralizes SSH config for all MCP tools."

# Regular merge
gh pr merge 36 --merge

# After merge: update local main
git checkout main
git pull origin main

# Clean up merged branch
git branch -d branch-name
```

---

## Labels

### Standard labels

| Label           | Color   | Use for                                   |
|-----------------|---------|-------------------------------------------|
| `bug`           | red     | Something broken                          |
| `security`      | blue    | Security vulnerabilities or improvements  |
| `enhancement`   | teal    | New features or requests                  |
| `documentation` | blue    | Docs improvements                         |
| `cleanup`       | blue    | Code cleanup, refactoring                 |
| `critical`      | green   | Urgent, blocks other work                 |
| `planning`      | purple  | Planning and design discussions           |

### Manage labels

```powershell
gh label list
gh label create "performance" --color "#ff9900" --description "Performance improvements"
```

---

## Workflow: Feature / Bug Fix

Standard workflow for any code change:

```
1. Issue          Create or pick an issue
2. Branch         Create feature branch from main
3. Develop        Make changes, test locally
4. Test           Run tests BEFORE committing
5. Commit         Clear commit messages referencing issue
6. Push           Push branch to origin
7. PR             Create PR with description and "Closes #X"
8. Review         Wait for Copilot / peer review
9. Fix            Address review comments, push fixes
10. Merge         Squash merge when approved
11. Cleanup       Delete branch, verify issue closed
```

### Step by step

```powershell
# 1. Check issue
gh issue view 37

# 2. Branch
git checkout main
git pull origin main
git checkout -b fix/issue-37-ssh-leaks

# 3-4. Develop and test
#   ... make changes ...
python -m py_compile file.py              # syntax check
python .tests/manual/test_something.py    # run tests

# 5. Commit
git add -A
git commit -m "Fix SSH credential leaks in error messages

- Sanitize firewall block messages returned to agent
- Use generic stderr messages in exception handlers
- Keep detailed info in server-side logs only

Closes #37"

# 6. Push
git push -u origin fix/issue-37-ssh-leaks

# 7. Create PR
gh pr create --title "Fix: SSH credential leaks - closes #37" --body-file pr_body.md

# 8-9. Review cycle (see below)

# 10. Merge
gh pr merge XX --squash --subject "Fix: SSH credential leaks" --body "Closes #37"

# 11. Cleanup
git checkout main
git pull origin main
git branch -d fix/issue-37-ssh-leaks
```

---

## Workflow: Copilot Review Cycle

Iterative cycle for addressing Copilot feedback:

```
Fetch comments  -->  Categorize  -->  Fix / Defer / Dismiss  -->  Push  -->  Re-review
```

### Categorize comments

For each Copilot comment, decide:

| Action     | When                                        | How                              |
|------------|---------------------------------------------|----------------------------------|
| **Fix now**| Valid, in scope, easy                       | Edit code, commit, push          |
| **Defer**  | Valid, but out of scope or complex          | Create new issue, reference it   |
| **Dismiss**| False positive or low value                 | Reply with reasoning             |

### Example cycle

```powershell
# 1. Fetch comments
gh pr view 36 --comments                      # overview
gh api repos/{owner}/{repo}/pulls/36/comments  # full details

# 2. Fix what's in scope
#    ... edit files ...

# 3. Defer out-of-scope items
gh issue create --title "Follow-up: description" --body-file body.md --label bug

# 4. Commit and push
git add -A
git commit -m "Address Copilot review: fix X, Y. Deferred Z to #38"
git push origin branch-name

# 5. Copilot will re-review automatically on push
# 6. Repeat until clean
```

---

## Workflow: Hotfix

For urgent fixes directly on main (use sparingly):

```powershell
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# Fix, test, commit
git push -u origin hotfix/critical-fix
gh pr create --title "Hotfix: critical description" --label critical
gh pr merge XX --squash
```

---

## Best Practices

### Commits

- **Reference issues**: `Fix #37`, `Closes #31`, `Related to #25`
- **Clear messages**: First line = summary, blank line, details
- **Atomic commits**: One logical change per commit
- **Test before commit**: Always verify changes work before `git commit`

### PRs

- **One PR per issue**: Keep changes focused
- **Small PRs**: Easier to review, less conflict risk
- **Squash merge**: Keeps main history clean
- **Close stale PRs**: Don't leave dead PRs open
- **Description matters**: Future you will thank present you

### Branches

- **Branch from latest main**: Always `git pull` before branching
- **Delete after merge**: Keep branch list clean
- **Rebase if needed**: `git rebase main` to resolve conflicts before PR

### Reviews

- **Don't ignore Copilot**: Address or consciously defer each comment
- **Create issues for deferred items**: Don't lose track of valid feedback
- **Push fixes to same branch**: Updates the existing PR automatically

### General

- **Never force push to main**: Only to feature branches if needed
- **Use `--body-file`** for complex PR/issue descriptions (avoids shell escaping)
- **Pull before push**: Avoid unnecessary merge commits
- **Tag releases**: `git tag -a v1.0 -m "Release 1.0"` when appropriate

---

## Quick Reference

```powershell
# === Issues ===
gh issue create --title "T" --body-file body.md --label bug
gh issue list
gh issue view 37 --comments
gh issue close 37 -c "Fixed in #38"

# === Branches ===
git checkout -b fix/issue-37-description
git push -u origin fix/issue-37-description
git branch -d fix/issue-37-description         # delete local

# === PRs ===
gh pr create --title "T" --body-file body.md
gh pr view 36 --comments
gh pr merge 36 --squash --subject "Title" --body "Closes #X"

# === Reviews ===
gh api repos/{owner}/{repo}/pulls/36/comments  # get review comments
gh pr view 36 --comments                       # overview

# === Sync ===
git checkout main
git pull origin main

# === Status ===
gh pr list
gh issue list
git status
git log --oneline -10
```

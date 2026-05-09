# Issue tracker

Issues for this repository are tracked in GitHub Issues for `hueyexe/ratecheck-au`.

## Access

Use the GitHub CLI from the repository root:

```sh
gh issue view <number> --repo hueyexe/ratecheck-au
gh issue list --repo hueyexe/ratecheck-au
gh issue create --repo hueyexe/ratecheck-au
gh issue comment <number> --repo hueyexe/ratecheck-au --body "..."
gh issue edit <number> --repo hueyexe/ratecheck-au --add-label "..."
gh issue close <number> --repo hueyexe/ratecheck-au --comment "..."
```

## Working rules

- Read the issue body, comments, labels, and linked pull requests before changing labels or status.
- Prefer adding a concise public comment when triage changes are non-obvious.
- Do not close issues unless the decision is explicit or the fix has been verified.
- If GitHub is unavailable, stop and report the blocker instead of creating local shadow issues.

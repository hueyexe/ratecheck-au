# Triage labels

This repository uses the default triage label vocabulary.

| Role | GitHub label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | A maintainer needs to evaluate the issue. |
| `needs-info` | `needs-info` | Waiting on the reporter for missing details or reproduction steps. |
| `ready-for-agent` | `ready-for-agent` | Fully specified and suitable for an AFK coding agent. |
| `ready-for-human` | `ready-for-human` | Valid work, but needs human judgement or manual intervention. |
| `wontfix` | `wontfix` | The repo will not action this issue. |

## Working rules

- Apply one triage-state label at a time unless the issue tracker already uses a different convention.
- When moving an issue to `needs-info`, ask a specific question that would unblock investigation.
- Use `ready-for-agent` only when the issue has enough context, expected behaviour, and verification guidance for an agent to complete it without more human input.
- Use `ready-for-human` when the work is valid but depends on product judgement, credentials, external coordination, or a risky migration.

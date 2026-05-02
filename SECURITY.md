# Security policy

Thanks for taking the time to look. We're a small open-source project, but we take security seriously — the platform handles user-entered data on official forms.

## Reporting a vulnerability

**Please don't open a public issue or PR for a security report.**

Use GitHub's private vulnerability reporting instead:

> **[Report a vulnerability →](../../security/advisories/new)**

(GitHub → repo → Security tab → *Report a vulnerability*.) This opens a private advisory only the maintainers can see, and lets us coordinate a fix and disclosure with you.

## What's in scope

- The web app at [tipizatul.eu](https://tipizatul.eu)
- The source code in this repo (frontend, Vercel functions in `api/`, scripts in `scripts/edirect/`)
- Firestore security rules (`firestore.rules`)
- Authentication / admin authorization flows

## What's out of scope

- The upstream eDirect portal at [edirect.e-guvernare.ro](https://edirect.e-guvernare.ro). We mirror documents from there but don't operate it. Report issues to its operator.
- Vulnerabilities in third-party services (Firebase, Google Drive, Vercel). Report those directly to the vendor.
- Reports based on outdated dependencies without a known exploit affecting this project.
- Social-engineering, physical security, or phishing.

## What we'd like to know

Whatever helps us reproduce and assess severity:

- Affected URL, file, or function
- Steps to reproduce (curl commands, request bodies, screenshots — whatever fits)
- Impact: what can an attacker do?
- Suggested fix, if you have one

## Response expectations

This is a side-project, so we can't promise a 24-hour SLA, but:

- Acknowledgement within **5 working days**
- Triage + initial assessment within **10 working days**
- Coordinated disclosure once a fix ships

Critical issues (full account takeover, arbitrary code execution, data exfiltration) get bumped to the top.

## Recognition

We're happy to credit reporters in release notes and the advisory itself, with your permission. No bug-bounty program — we have neither the budget nor the user base to justify one yet.

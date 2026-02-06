# Security Policy

## Supported Versions

| Version | Supported |
|:--------|:----------|
| latest  | Yes       |
| < latest | No       |

Only the latest release receives security updates. Please keep your app up to date — ZooDB includes automatic updates.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email **[security@zoodb.app](mailto:security@zoodb.app)** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive an acknowledgment within **48 hours**
4. A fix will be prioritized and released as soon as possible

## Scope

The following are in scope:

- ZooDB desktop application (Tauri)
- Authentication and session handling
- Local database (PGlite) data integrity
- Convex backend API endpoints
- Auto-updater supply chain (signing, manifest)

Out of scope:

- Third-party dependencies (report upstream)
- Social engineering attacks
- Denial of service

## Security Measures

- All releases are **code-signed** and **notarized** by Apple
- Auto-update bundles are **cryptographically signed** and verified before install
- Authentication via Better Auth with secure session management
- CSP (Content Security Policy) enforced in the desktop app
- No sensitive data stored in plain text

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
2. Email **[onlyhpleft@gmail.com](mailto:onlyhpleft@gmail.com)** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fix (optional)
3. You will receive an acknowledgment within **48 hours**
4. A fix will be prioritized based on severity:
   - **Critical** (RCE, auth bypass, data leak) — patch within **72 hours**
   - **High** (privilege escalation, XSS) — patch within **7 days**
   - **Medium/Low** — included in the next scheduled release
5. You will be credited in the release notes (unless you prefer anonymity)

## Scope

The following are **in scope**:

- ZooDB desktop application (Tauri) — macOS and Windows
- Authentication and session handling (Better Auth)
- Local database (PGlite) data integrity
- Convex backend API endpoints
- Auto-updater supply chain (signing, manifest verification)
- IPC (Inter-Process Communication) between frontend and Tauri backend
- Content Security Policy bypasses

**Out of scope:**

- Third-party dependencies (report upstream)
- Social engineering attacks
- Denial of service
- Attacks requiring physical access to the device
- Issues in outdated versions (only latest is supported)

## Security Measures

### Code Signing & Distribution
- **macOS**: All releases are code-signed and notarized by Apple
- **Windows**: All releases are code-signed with a trusted certificate
- Auto-update bundles are cryptographically signed and verified before install

### Application Security
- Authentication via Better Auth with secure session management
- CSP (Content Security Policy) enforced in the desktop app
- Tauri IPC permissions are scoped to minimum required capabilities
- No sensitive data stored in plain text
- HTTPS enforced for all network communication

### Supply Chain
- Dependencies are reviewed and pinned
- Automated dependency updates via Dependabot
- Build artifacts are reproducible from source

## Disclosure Policy

We follow **coordinated disclosure**:
- We ask that you give us reasonable time to fix the issue before public disclosure
- We will coordinate with you on a disclosure timeline
- We will not take legal action against researchers acting in good faith

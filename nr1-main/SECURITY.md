# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by opening a private issue or contacting the maintainers directly. We will respond promptly and coordinate a fix.

## Best Practices

- All secrets and credentials must be stored in environment variables (never in code or repo)
- All dependencies are regularly audited (`npm audit`)
- All user input is validated and sanitized
- CORS, Helmet, and rate limiting are enforced
- Sensitive data is never logged
- All endpoints are protected against common web vulnerabilities (XSS, CSRF, SSRF, etc.)

## Responsible Disclosure

We appreciate responsible disclosure and will credit security researchers who help keep this project safe.

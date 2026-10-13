# Operator responsibilities

The service-information pages are an implementation-aligned starting point, not
an attestation of legal compliance. They deliberately do not invent a legal name,
postal address, corporate identity, retention schedule, or unimplemented tools.
The contact address is the operator's public GitHub-profile email. The presence
of a mailto link does not verify inbox monitoring or the handling of a request.

## Confirmed application facts

The public service uses HTTPS through the Coder entrypoint. Account passwords use
password hashing, sign-in cookies have native expiry and sign-out invalidation,
state-changing forms check exact origin and CSRF, and file access is derived from
current ownership and readable references. Working-copy retention is separate
from publication. Original-file metadata is not stripped. Data history and
operational recovery copies may retain previously deleted information.

The application exposes About, Privacy policy, Terms of service, Community
guidelines, and Contact without sign-in. It links the relevant documents at
registration. Privacy/account-closure/reporting requests are directed to the
operator; no automated export, account-closure workflow, or consent-recording
system is claimed by this release.

## Decisions and operations that remain with the operator

Confirm the legal identity and address disclosures appropriate to the actual
operator and applicable law. A public handle plus email must not be represented
as a determination that every required identity disclosure is satisfied. Do not
publish private identity or address details in source without explicit authority.
Where an on-request disclosure route is applicable, the operator must actually
be able to supply the required information through that route.

Confirm the actual infrastructure providers, log handling, locations, backup
retention, access practices, and any cross-border handling. Keep the privacy copy
consistent with them. Define and follow a practical process for identity-checked
access, correction, removal, and account-closure requests, complaints, security
incidents, and notifying users of material changes. A generated policy cannot
create these operational processes by itself.

Do not claim complete physical erasure while retained data history or recovery
copies remain. When fulfilling a request, record its scope, identity verification,
action taken, and any lawful retention limits without collecting unnecessary
additional identity material. Do not request passwords or live sign-in tokens
by email. Keep request records and any private operator details out of Git.

## Primary guidance consulted on October 13, 2026

The Personal Information Protection Commission's general guidelines, section
3-8-1, describe information to make available concerning retained personal data,
including operator identity/address, purposes, request procedures, safeguards,
and a complaint contact where the relevant provisions apply. Sections 3-8-7 and
3-9 address request procedures and complaints. The guidelines allow certain
information to be provided without delay on request; merely publishing a generic
policy does not establish that such a process is operating.

<https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/>

Confirm applicability and operator-specific requirements with qualified advice
before treating these pages as a complete compliance review. This document does
not require disabling the existing invitation-only experiment, and no broader
legal compliance claim is part of the technical release acceptance.

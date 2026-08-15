# Eclipse Scheduler: public pattern review

Date reviewed: 2026-08-15

## Public sources reviewed

1. https://eclipsescheduler.com/
2. https://apps.apple.com/us/app/eclipse-scheduler-bookings/id6768153807

## Publicly described patterns

- A booking flow presents a service/date choice followed by available times, then an appointment request.
- The owner view prioritizes today's calendar, upcoming appointments, pending approval requests, and fast acceptance or decline actions.
- Availability, services, branding, confirmation emails, reminder emails, and review follow-ups are treated as connected parts of one operating flow.
- The product also promotes payments, invoices, no-show fees, client outreach for empty slots, and a mobile owner view.

## Safe implications for Hairstyle Laboratory

- Preserve the existing branded public booking page and owner approval flow rather than borrowing any visual UI.
- Keep the dashboard's operational focus on the next visit, pending decision, and client context before a visit.
- The most relevant future enhancements are: a clear no-show/cancellation policy surfaced before booking, a manual or automated empty-slot outreach flow, and an owner-focused "today" summary. Payments are a separate decision because they require a payment provider.

## Excluded from implementation

No proprietary layouts, copy, product screens, names, or visual components are to be copied. This review records only broad scheduling patterns described in public product materials.

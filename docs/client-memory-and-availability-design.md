# Availability and Client Memory — Design

## Product principle

> «Я хочу, чтобы система работала как моя идеальная память о клиенте, чтобы перед каждым визитом я сразу видел всё важное».

The public booking flow will offer only dates and times explicitly opened by Isaac. The admin workspace will remain the only place that exposes private client information, notes, visit photos, and commercial statistics.

## Availability model

| Entity | Purpose |
| --- | --- |
| `availabilityWindows` | One or more open working ranges for a date, with start time, end time, and a 30-minute slot interval. Batch actions create or remove these windows across selected dates. |
| `blockedDates` | A hard override for vacation, holidays, or days off. A blocked date is never shown to clients, even if it has an availability window. |
| Slot query | Produces only start times that fully fit the selected service duration inside an open window and do not overlap a pending or confirmed booking. |

The default public state is unavailable. Isaac opens only the dates and times he intends to work. For example, a window from 10:00 to 11:00 exposes a 10:00 slot for a 45-minute haircut and a 10:00 or 10:30 slot for a 30-minute beard service, subject to existing bookings.

## Client memory model

| Entity | Purpose |
| --- | --- |
| `clients` | Private profile keyed by a client identity, with name, phone, email, birthday, Instagram, preferences, and free-form stylist notes. |
| `bookings` | The current appointment state. Each booking links to one client. An admin marks an actual visit complete after it happens. |
| `bookingEvents` | Immutable audit trail for creation, confirmation, rescheduling, completion, and other important changes. A move never erases the original appointment information. |
| `visitMedia` | Private before/after image metadata stored in S3, linked to a completed booking. |
| `reviewRequestHistory` | An auditable record of manual review-request emails. |

The client profile is the briefing screen: last visit and time since it, visit count, total spend, average check, popular services, latest services, preferences, photos, reminders, reviews, and private notes such as “shorter sides next time” or “growing length.”

## Privacy and data handling

All client profiles, visit media, preferences, notes, metrics, and history are admin-only. Public booking fields collect only the information needed for the appointment; birthday and Instagram are optional. Image bytes are stored privately in S3, while the database stores only references and metadata.

## Open decisions

The exact vacation end date is pending confirmation because the stated two-week duration conflicts with the written date range. The exact external product referenced as “Eclise” is also pending a link, screenshot, or exact spelling before any public patterns are reviewed.

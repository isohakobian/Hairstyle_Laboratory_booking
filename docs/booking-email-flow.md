# Booking Email Flow

## Client journey

| Moment | What happens |
|---|---|
| Client submits a booking | Isaac receives the new-booking details in Gmail; the client receives a pending-request confirmation. |
| Isaac confirms the booking | The client receives a confirmation email with an `.ics` calendar invitation. |
| The visit has taken place | Isaac opens **Admin → Bookings → Confirmed booking → Send review request**. |
| Client opens the email | The review link is personal, expires after 30 days, and becomes unusable after the review is submitted. |

## Why the review request is manual

The website does not send a review request purely by time. A client can be late, reschedule, cancel, or not attend. The one-click action in the admin panel lets Isaac send the personal review email only after a real visit has happened.

## Isaac's review email

**Subject:** Thank you for your visit — Isaac

> Hi, Alex.
>
> Thank you for trusting me with your appointment. If you have a minute, I’d love your honest feedback. It really helps me.
>
> Thank you again,  
> Isaac

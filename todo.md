# Isaac's Barber Booking - Project TODO

## Database & Backend Setup
- [x] Create services table with bilingual names, descriptions, duration, price
- [x] Create bookings table with all required fields (id, service_id, date, time, client_name, phone, email, comment, status, created_at)
- [x] Implement services API (list all services)
- [x] Implement bookings API (create, list, get by id/reference)
- [x] Implement admin API (confirm/decline bookings)
- [x] Add booking reference number generation

## Frontend - Landing Page
- [x] Create elegant landing page design
- [x] Add bilingual RU/EN support with language switcher
- [x] Display barber information and branding
- [x] Add services overview section
- [x] Add prominent "Book Now" CTA button
- [x] Ensure responsive mobile/desktop layout

## Frontend - Service Catalog
- [x] Create service catalog page/section (integrated in landing page)
- [x] Display all services with name, description, duration, price
- [x] Add service cards with elegant styling
- [x] Link to booking form

## Frontend - Booking Form
- [x] Create booking form page
- [x] Add service selector dropdown
- [x] Add date picker
- [x] Add time slot selector (prevent double booking)
- [x] Add client name input
- [x] Add phone/email input
- [x] Add optional comment field
- [x] Add submit button
- [x] Show pending confirmation message after submit
- [x] Generate and display booking reference number

## Frontend - Booking Status Page
- [x] Create booking status lookup page
- [x] Add search by reference number or email
- [x] Display booking details and current status
- [x] Show status badge (pending, confirmed, declined)

## Frontend - Admin Dashboard
- [x] Create admin-only dashboard (protected route)
- [x] Display all booking requests in a table/list
- [x] Show booking details: client name, contact, service, date, time, status
- [x] Add confirm button for pending bookings
- [x] Add decline button for pending bookings
- [x] Update status display in real-time

## UI/UX Polish
- [x] Ensure elegant, premium aesthetic throughout
- [x] Test responsive design on mobile and desktop
- [x] Fix React context import duplication issue
- [x] Implement bilingual language switcher (EN/РУ)
- [x] Create elegant CSS styling with premium feel
- [x] Verify bilingual text rendering and spacing
- [x] Polish animations and transitions
- [x] Test all booking flows end-to-end

## Testing & Delivery
- [x] Write vitest tests for backend procedures
- [x] Test booking creation and status updates
- [x] Test admin confirm/decline functionality
- [x] Manual testing of all user flows
- [x] Verify bilingual text rendering and spacing
- [x] Polish animations and transitions
- [x] Test all booking flows end-to-end

## Future Enhancements (Optional)
- [x] Owner push notifications for new bookings
- [x] Implement real Gmail email notifications for new bookings
- [x] Admin dashboard filters/sorting by status
- [ ] SMS notifications
- [x] Schedule calendar for opening and closing booking dates
- [x] Add a booking calendar that displays appointment entries
- [x] Add loading and error states to the booking calendar tab
- [x] Verify published public-site accessibility and resolve admin render error
- [ ] Recurring appointments
- [x] Fix and verify RU/EN language switcher visibility on mobile header
- [x] Stabilize booking tests when dates are blocked in the live calendar
- [x] Support multiple distinct services in one booking while preventing duplicate services
- [x] Calculate combined duration and price details for multi-service bookings
- [x] Send Gmail confirmation email with booking details to the client
- [x] Add an iCalendar attachment or link so clients can save the booking to their calendar
- [x] Send a manual post-visit review request email with a secure review link
- [x] Add one-time, hashed database-backed review tokens with a 30-day expiry
- [x] Test rejection of an expired review token
- [x] Rewrite the review request email in Isaac's warm first-person voice
- [x] Verify the real authenticated calendar, availability, and reviews sections on desktop and mobile
- [ ] Test real booking-card navigation and review-request action when a client booking is available
- [x] Support direct links to admin sections for verification and daily use
- [x] Prevent automated tests from leaving booking reviews in the live admin panel
- [x] Evaluate and implement direct Gmail delivery for new form submissions without a custom domain
- [x] Configure Gmail App Password SMTP delivery for booking notifications
- [x] Restore and validate client email in the booking form so client confirmations are delivered
- [x] Test the visible Booking form payload and backend email-delivery contract with clientEmail
- [x] Add loading, error, and empty states to the service selector
- [x] Verify the complete multi-service booking flow in the client interface

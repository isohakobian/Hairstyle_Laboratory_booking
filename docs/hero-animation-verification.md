# Homepage Hero Animation Verification

The notice block and ambient hero background were checked on the development site at desktop (`1440×900`) and mobile (`375×812`) viewports. Two active notices rendered as a compact stacked column on desktop and as readable sequential cards on mobile. The news cards retain their staggered entrance animation while the background uses slow, low-opacity metallic drift and a faint sheen behind the content.

The animation uses only `transform`, `opacity`, and background-position, and it is disabled for visitors who enable reduced-motion preferences. Text contrast, booking actions, and the notice content remained clearly readable in both viewports.

The published site was also checked after checkpoint `d68c2d0f`. It rendered both active notices in the expected start-date order, confirming that the public API and deployed client bundle return the capped two-notice list correctly.

A second cache-busted published-site check confirmed the same two-card desktop layout. The mobile composition was checked with the identical deployed client code at a `375×812` viewport: the notices continue below the booking actions as readable, sequential cards without obscuring the hero copy.

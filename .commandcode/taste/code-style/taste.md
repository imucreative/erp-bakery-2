# Code Style

- Dislikes large single-file components and asks for them to be split into smaller, reusable components (e.g. extracting child components plus a shared composable). Confidence: 0.7
- Prefers related settings/sections consolidated into the existing component that already owns that area, rather than extracted into a separate sibling card/component (e.g. 2FA belongs inside `Security.vue`, not a new `TwoFactorCard.vue`). Confidence: 0.55
- Prefers reusable CSS classes to live in a shared stylesheet (`main.css` and its imported style files) rather than being written inline in components, leaving only truly dynamic values (changing widths/translates) at the call site; adding new utility classes to the stylesheet is acceptable. Confidence: 0.7
- Prefers using the project's existing base/shared UI components (BaseButton, BaseTable*, BaseSelect, etc.) instead of raw HTML elements with long Tailwind class lists; when a needed base component doesn't exist yet, creating a new one is expected. Confidence: 0.7

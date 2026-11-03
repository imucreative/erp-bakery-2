# Code Style

- Dislikes large single-file components and asks for them to be split into smaller, reusable components (e.g. extracting child components plus a shared composable). Confidence: 0.7
- Prefers reusable CSS classes to live in a shared stylesheet (`main.css` and its imported style files) rather than being written inline in components, leaving only truly dynamic values (changing widths/translates) at the call site; adding new utility classes to the stylesheet is acceptable. Confidence: 0.7

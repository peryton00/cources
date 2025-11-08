# Open Source – Digital Course & Document Storefront

## Project overview
"Open Source" is a static, frontend-only prototype for selling digital courses and downloadable documents. It showcases a professional storefront experience with a mock PhonePe checkout flow, fixed pricing, and cloud-hosted (Terabox) download links revealed post-payment simulation. All catalog data lives in standalone JSON files for easy maintenance and future integration with live backends.

## Completed features
- **Responsive marketing hero** with pricing highlight, trust indicators, and visual mock receipt.
- **Catalog sections fed by JSON resources** (`data/courses.json`, `data/documents.json`) rendered dynamically via JavaScript.
- **Item cards** with badges, metadata icons, highlight checklists, and price callouts.
- **Fixed-price enforcement** (₹199) across every listing with currency formatting for India.
- **Mock PhonePe checkout modal** including QR placeholder, processing animation, and success screen.
- **Download unlock logic** that reveals Terabox links only after a simulated successful payment.
- **Local purchase persistence** using `localStorage` so unlocked items stay available across reloads.
- **Unlocked items modal** for quick access to previously purchased downloads.
- **Toast notifications & focus management** for better UX and accessibility when unlocking content.
- **Polished styling** featuring an immersive dark UI, neumorphic cards, and Font Awesome iconography.

## Functional entry points & resources
| Path | Description |
| --- | --- |
| `index.html` | Primary landing page and app shell for the storefront. |
| `css/style.css` | Global styling, layout rules, responsive tweaks, and component skins. |
| `js/app.js` | Client-side logic: JSON fetching, catalog rendering, mock payment flow, state management. |
| `data/courses.json` | Course catalog data source (sample Terabox URLs, metadata, highlights). |
| `data/documents.json` | Document catalog data source (sample Terabox URLs, metadata, highlights). |

No additional URL parameters are required; all behaviour is handled client-side after page load.

## Features not yet implemented
- Real PhonePe (or any other) payment gateway integration and server-side order verification.
- User authentication, license enforcement, or anti-sharing measures.
- Actual Terabox resource URLs (current links are placeholders for demonstration).
- Backoffice tooling for managing catalog items beyond editing JSON directly.
- Analytics, tracking, or audit logging surrounding downloads.

## Recommended next steps
1. **Integrate a secure backend** to handle PhonePe payment intents, webhooks, and access control before accepting live transactions.
2. **Replace placeholder Terabox links** with production URLs and optionally add expiring tokens for better security.
3. **Harden purchase storage** by syncing unlocked status with a backend or signed tokens instead of relying on `localStorage`.
4. **Add catalogue management UI** or connect to a headless CMS / REST table if non-technical updates are expected.
5. **Expand validation and error states** (e.g., network fallbacks, retry flows, inventory limits).
6. **Localise content** and currency presentation if you plan to support multiple regions.

## Public URLs & deployment
- **Production URL:** Not yet published. Use the **Publish** tab in your workspace to deploy when ready.
- **External APIs:** None. All data is sourced from local JSON files.
- **Payment endpoints:** Mock only; no real payment processing occurs in this build.

## Data models & storage
All dynamic content is read from JSON files delivered with the site:

```json
{
  "id": "course-js-architect",
  "name": "JavaScript Architect Bootcamp",
  "typeLabel": "Video course",
  "tag": "Bestseller",
  "summary": "...",
  "thumbnail": "https://...",
  "meta": {
    "duration": "8-week plan",
    "level": "Intermediate to advanced",
    "format": "Video + lab projects"
  },
  "highlights": [
    "Includes two real-world architecture case studies"
  ],
  "downloads": [
    { "label": "Terabox course package", "url": "https://www.terabox.com/s/demo-js-architect" }
  ]
}
```

- **Storage mechanism:** Static JSON files bundled with the site (no external database).
- **Client state:** Purchased item IDs persisted locally via `localStorage` under the key `open-source-unlocked-items`.

## Going live
To make the site publicly accessible, publish the project through the **Publish** tab in your workspace. The deployment tool will provide the public URL automatically.

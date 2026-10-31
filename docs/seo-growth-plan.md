# Spargo SEO & Organic Growth Plan

Last updated: 2026-10-30. Search volumes and rankings below are **not measured**. No keyword tool was connected when this was written. Validate with Google Search Console (once data accrues), Google Keyword Planner, or Ahrefs/Semrush before committing content budget.

## 1. Keyword → page map

Each cluster has exactly one target page to avoid cannibalization.

| Cluster | Primary keyword (seed) | Supporting keywords | Target page | Intent |
|---|---|---|---|---|
| Brand + local comparison | compare grocery prices Calgary | compare prices near me, Spargo | `/` | Navigational / commercial |
| Calgary grocery prices | grocery price comparison Calgary | cheapest grocery store Calgary, grocery deals Calgary | `/calgary/grocery-prices` | Commercial, local |
| App category | grocery price comparison app Canada | price comparison app Canada, grocery shopping comparison app, best grocery savings apps Canada | `/grocery-price-comparison-app` | Commercial investigation |
| List optimizer | smart grocery list price comparison | shopping list price comparison, find the cheapest grocery store | `/features/grocery-list-optimizer` | Commercial |
| Price tracking | grocery price tracker Canada | grocery price history, barcode price scanner app, is this a good deal | `/features/price-tracking` | Commercial / informational |
| Merchants | list my store on an app Calgary | local store marketing Calgary, retail analytics small business | `/for-stores` | B2B commercial |
| Gas | cheapest gas prices Calgary | gas price comparison Calgary | *Not yet.* Build only once gas data is live | Transactional |
| Retailer vs retailer | compare Walmart and Superstore prices | — | Blog article (see §2), only with real basket data | Informational |

**Deliberately not built:** per-retailer and per-neighbourhood pages. Without live price data they'd be thin, templated pages, which risk a site-wide quality demotion.

## 2. Article briefs (blog: `/guides/…`)

Publish in this order. Each needs original evidence (your own basket checks, photos, receipts or app data), not rewritten generic advice.

### 2.1 How to Save Money on Groceries in Calgary
- **URL:** `/guides/save-money-on-groceries-calgary`
- **Intent:** informational, local. **Main keyword:** save money on groceries Calgary
- **Supporting:** cheapest grocery store Calgary, grocery deals Calgary, Alberta GST groceries
- **Title / H1:** How to Save Money on Groceries in Calgary (2026 Guide) / How to save money on groceries in Calgary
- **Outline:** why prices vary across Calgary stores → unit pricing → flyer timing → price matching (link to each store's published policy) → GST: what's zero-rated vs taxable → one-stop vs two-stop maths with distance → a real 10-item basket priced at 3–4 stores on one date
- **Evidence required:** a dated basket you actually priced, with photos. Name stores only with prices you recorded.
- **Links:** `/calgary/grocery-prices`, `/features/grocery-list-optimizer`. **CTA:** Join the Calgary Waitlist

### 2.2 How to Compare Grocery Prices in Canada
- **URL:** `/guides/compare-grocery-prices-canada` · **Keyword:** compare grocery prices
- **H1:** How to compare grocery prices in Canada (without spending all day on it)
- **Outline:** unit price on shelf tags → comparing flyers → loyalty-program pricing → online vs in-store prices → tools (including Spargo, stated honestly as pre-launch)
- **Evidence:** screenshots of real shelf tags showing unit pricing
- **Links:** `/grocery-price-comparison-app`. **CTA:** Get Early Access

### 2.3 Walmart vs. Superstore: How to Compare Your Grocery Basket
- **URL:** `/guides/walmart-vs-superstore-grocery-prices` · **Keyword:** Walmart vs Superstore prices
- **Publish only with real data:** the same 15–20 items priced at both stores in Calgary in the same week, with a date and method note. Re-check quarterly and show "last checked".
- **Outline:** method → basket table → where each won → unit-size traps → conclusion that depends on *your* list (link to the optimizer)
- **Legal note:** use trademarks descriptively only. No logos.

### 2.4 Why Unit Pricing Matters When Grocery Shopping
- **URL:** `/guides/unit-pricing` · **Keyword:** grocery unit price comparison
- **Outline:** what unit price is → how to read Canadian shelf tags → big-pack myths → worked examples from photographed tags
- **Links:** `/features/price-tracking`, `/grocery-price-comparison-app`

### 2.5 How to Build a Grocery List That Saves Money
- **URL:** `/guides/grocery-list-that-saves-money` · **Keyword:** grocery list to save money
- **Outline:** staples vs flexible items → brand flexibility → stock-up list → meal planning → pricing the list (optimizer demo with *labelled* illustrative data until live data exists)
- **Links:** `/features/grocery-list-optimizer`

### 2.6 How to Tell Whether a Grocery Sale Is Actually a Good Deal
- **URL:** `/guides/is-it-a-good-deal` · **Keyword:** is this sale a good deal
- **Note:** this overlaps with the guide section on `/features/price-tracking`. Either expand that section into this article and link to it from the feature page, or skip this article.

## 3. Measurement setup (manual steps)

None of these are connected yet. Each needs account access.

1. **Google Search Console:** add a *Domain* property for `savewithspargo.com` (DNS TXT verification). Submit `https://www.savewithspargo.com/sitemap.xml`. Use URL Inspection → Request indexing on the 5 new pages.
2. **Bing Webmaster Tools:** import from Search Console (one click). Submit the sitemap.
3. **Primary domain redirect:** in Vercel → Project → Settings → Domains, the apex `savewithspargo.com` currently **307 (temporary)** redirects to `www`. Edit it to a **308 permanent** redirect so ranking signals consolidate on `www`.
4. **Vercel Web Analytics custom events:** the site now sends these events through `track()` in `js/nav.js`:
   - `cta_click` {cta, page}
   - `waitlist_form_start` {form, page}: once per form per page view
   - `waitlist_signup` {form, page}: only after EmailJS succeeds
   - `waitlist_error` {form, page}
   - `merchant_form_submit` {plan}
   - `plan_choice` {plan}

   Custom events need a Vercel **Pro** plan (or above). On Hobby they're silently dropped and page views still work. No emails or names are ever sent.
5. **Organic landing-page visits:** in Vercel Analytics, filter Referrers to google/bing and group by Page.
6. **GA4 / GTM (optional):** not installed. If you add GA4, mirror the event names above, and update the privacy policy, since GA4 sets cookies and needs a consent banner for some visitors.

## 4. Open issues (need a business decision or data)

- **Merchant form doesn't submit anywhere.** It shows a "signup opens soon, email us" message. Connect it to a backend (Formspree, a Vercel Function writing to a DB or sheet, or a second EmailJS template) before promoting `/for-stores`.
- **Unverified homepage stats:** "$183 monthly savings potential", "50+ stores tracked in real time", "100k+ prices monitored daily", "100+ people already waiting", "$92.40 weekly savings". Keep a source for each, or soften or remove them. Unsupported savings claims are a trust and advertising-law risk (Competition Act).
- **App screenshots show "San Francisco, CA"** and US-style retailers. Re-capture them with a Calgary location for credibility on Calgary-targeted pages.
- **Feature status labels** on `/grocery-price-comparison-app` and `/features/price-tracking` are a best reading of the current site. Confirm each item (especially gas, exclusive deals, price history and alerts) and update the "Status as of" note.
- **Brand assets:** the brief mentions indigo/orange and a fox mascot. The site uses violet `#6C3CE1` and yellow `#FFC83D`, and has no mascot asset. Nothing was changed.
- **Fonts:** Google Fonts CSS is render-blocking and is the main remaining LCP cost. Self-hosting the three families (woff2, `font-display: swap`, preload the Instrument Serif file) would cut roughly 0.5–1 s on slow mobile connections.
- **Unused root images** (~9 MB of PNGs in the repo root, e.g. `dealspage.png`, `spargo-logo.png`) are no longer referenced by any page. Safe to delete once you've confirmed nothing outside the site (emails, app store listings) hot-links them.

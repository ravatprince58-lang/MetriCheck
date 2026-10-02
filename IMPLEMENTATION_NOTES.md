# MetriCheck implementation notes

This build includes fixes for the 11 requested requirements.

## Database migration
Apply the new migration after the existing migrations:
`supabase/migrations/20260917170000_metricheck_requirements.sql`

It adds manual inspection fields, public demo requests, consumer grievances, verification-history deletion, completed-inspection protection, and the corrected final-report completion function.

## Run locally

```bash
npm install
npm run typecheck
npm run dev
```

The included `.env` contains the project's existing Supabase URL and anon key. Do not place a Supabase service-role key in frontend `.env` files.

## Requirement mapping

1. Repeated scan: the same image cannot create a second completed OCR record; consolidated product fields are deduplicated across images.
2. Final report: completion generates a report with a final inspection statement and overall result.
3. Consumer Grievance: public Home page and `/consumer-grievance` form.
4. Manual details: Compliance page provides editable manual declaration fields saved per inspection.
5. Inspection History: delete action added.
6. Verification History: delete action added.
7. Drafts from History: history remains read-only; drafts are not presented as continuable.
8. Public Home: new landing page at `/`.
9. Security/multiple officers: authenticated verification is required before inspection workspace access; inspection data remains owner-scoped; admin access remains separate.
10. Sign In / Request Demo: separate `/login` and `/request-demo` flows.
11. Product scope: new inspection categories are generic packaged commodities rather than food-only.

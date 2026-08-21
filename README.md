Lootbox survey — short README

What this repo contains
- index.html — static survey frontend (hosts on Vercel)
- apps-script/Code.gs — legacy Google Apps Script backend (optional fallback)
- supabase/schema.sql — recommended SQL schema + RLS policies for Supabase
- vercel.json — basic Vercel config

Quick setup / deploy steps
1) Supabase
   - Create a Supabase project (personal account is fine for a diploma).
   - In Supabase -> SQL Editor: run `supabase/schema.sql` to create tables and policies.
   - In Project Settings -> API: copy "Project URL" and the anon (publishable) key.

2) Configure the frontend
   - Edit `index.html` CONFIG block and set:
     - SUPABASE_URL to your project URL
     - SUPABASE_ANON_KEY to the publishable/anon key
     - USE_SUPABASE: true
   - CONTACT_EMAIL is already set to the study contact email.

3) GitHub & Vercel
   - Commit and push the repo to GitHub (main branch).
   - In Vercel: Import Project -> select this GitHub repo -> Application preset: Other -> Root: . -> Deploy.
   - Vercel will auto-deploy on every push to the connected branch.

4) Testing and verifying
   - Open the deployed site and submit a test response.
   - In Supabase -> Table Editor: check `survey_responses`, `screened_out`, and `raffle_entries` tables.
   - For CSV export / analysis: run the SQL query or create a VIEW to flatten payload JSON and export CSV.

Data export & analysis
- Quick export: SQL editor -> run SELECT that parses payload->>'field' into columns -> Export CSV.
- Recommended: create a SQL VIEW (survey_flat) that extracts commonly-used fields (dd_k, dd_ed50_days, dd_t1..t6, rlbi_total, lb_spend_amount, income, gender, education, created_at). Export the view as CSV for jamovi / R.
- Alternatively, use the Supabase REST API from R (anon key) to download JSON and transform it with jsonlite.

Security & ethics notes
- raffle emails MUST remain separate from survey responses to preserve anonymity (this repo already stores them in `raffle_entries`).
- Do not publish service_role or DB secret keys. Use only the anon/publishable key in the browser.
- Update consent text in index.html according to your ethics committee before real data collection.

If you want, I can:
- create the SQL VIEW for flattening payload (tell me exactly which fields you want), or
- prepare an R script that downloads and flattens the data automatically.

Contact for this project: 567844@mail.muni.cz

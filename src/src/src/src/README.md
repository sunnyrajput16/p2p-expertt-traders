# P2P Expert Traders – deposit portal
## Supabase
1. Create a project at supabase.com. Run `supabase/schema.sql` in SQL Editor.
2. Auth > URL Configuration: Site URL `https://p2pexperttraders.in`; add redirect URLs `https://p2pexperttraders.in` and `http://localhost:5173`. Keep "Confirm email" on.
3. Sign up in the app, then run: `update public.profiles set role='admin' where email='YOU@EMAIL';`
4. Copy Project URL and anon key (Settings > API) into `.env` (see `.env.example`). Never use the service_role key in the frontend.
## Run
`npm install && npm run dev`
## Deploy (Cloudflare Pages)
Push to GitHub > Cloudflare Pages > Create project > build `npm run build`, output `dist`, add the two env vars. Then Custom domains > add `p2pexperttraders.in`. Vercel works the same way (Framework: Vite).

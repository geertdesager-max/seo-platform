# SEO Platform — Setup in 4 stappen

Totale tijd: ~20 minuten. Geen programmeerkennis nodig.

---

## Stap 1 — Supabase database aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project**
2. Kies een naam (bv. `seo-platform`) en een sterk wachtwoord
3. Wacht ~2 minuten tot het project klaar is
4. Ga naar **SQL Editor** → **New query**
5. Kopieer de volledige inhoud van `supabase/schema.sql` en klik **Run**
6. Ga naar **Settings → API** en noteer:
   - **Project URL** → dit is je `SUPABASE_URL`
   - **anon / public** key → dit is je `SUPABASE_ANON_KEY`
   - **service_role** key → dit is je `SUPABASE_SERVICE_KEY` *(hou geheim!)*

---

## Stap 2 — Dashboard configureren

Open `public/index.html` en vervang bovenaan in het script:

```js
const SUPABASE_URL  = 'JOUW_SUPABASE_URL';       // bv. https://abcdef.supabase.co
const SUPABASE_ANON = 'JOUW_SUPABASE_ANON_KEY';  // Settings > API > anon public
```

---

## Stap 3 — Deployen op Vercel

1. Maak een gratis account op [vercel.com](https://vercel.com) (log in met GitHub)
2. Klik **Add New → Project** → importeer jouw GitHub repository
3. Vercel detecteert automatisch de `public/` map via `vercel.json`
4. Klik **Deploy** → klaar! Je krijgt een URL zoals `jouw-project.vercel.app`

> **Eigen domein?** Ga in Vercel naar je project → **Settings → Domains** en voeg je domein toe.

---

## Stap 4 — Automatische dagelijkse sync instellen

### GitHub Secrets aanmaken
Ga in je GitHub repository naar **Settings → Secrets and variables → Actions → New repository secret** en voeg toe:

| Naam | Waarde |
|------|--------|
| `SEMRUSH_API_KEY` | Jouw SEMrush API key |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key van Supabase |

De GitHub Action (`.github/workflows/daily-sync.yml`) draait automatisch elke dag om 9:00 (Belgische tijd).

### Eerste sync handmatig starten
Ga in GitHub naar **Actions → Daily SEMrush Sync → Run workflow** om de eerste sync meteen te starten.

---

## Teamleden toegang geven

1. Ga naar je Vercel URL
2. Voer het e-mailadres van een teamlid in
3. Zij ontvangen een inloglink (magic link — geen wachtwoord nodig)
4. Dat is alles

Supabase Auth beheert alle gebruikers. Je kunt ze zien in **Supabase → Authentication → Users**.

---

## Nieuwe website toevoegen

Voer dit uit in de Supabase SQL Editor:

```sql
insert into public.sites (domain, name, db)
values ('nieuwesite.be', 'Nieuwe Site', 'be');
```

Bij de volgende sync wordt de site automatisch meegenomen.

---

## Goedkeuringsworkflow voor SEO-wijzigingen

Wijzigingen worden aangemaakt via de sync of handmatig toegevoegd in Supabase. Teamleden zien ze onder het tabblad **Goedkeuringen** en kunnen ze goedkeuren of afwijzen. Na goedkeuring kan de WordPress-integratie de wijziging automatisch toepassen (komende versie).

---

## Bestandsstructuur

```
seo-platform/
├── public/
│   └── index.html          ← Dashboard (deploy naar Vercel)
├── supabase/
│   └── schema.sql          ← Eénmalig uitvoeren in Supabase
├── sync/
│   ├── semrush-sync.js     ← Data sync script
│   ├── package.json
│   └── .env.example        ← Kopieer naar .env voor lokaal testen
├── .github/
│   └── workflows/
│       └── daily-sync.yml  ← Automatische dagelijkse sync
└── vercel.json             ← Vercel configuratie
```

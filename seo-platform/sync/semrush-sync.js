#!/usr/bin/env node
// ============================================================
// SEO Platform — SEMrush Sync Script
// Fetches data from SEMrush API and stores it in Supabase.
// Run manually: node semrush-sync.js
// Or automatically via GitHub Actions (daily-sync.yml)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SEMRUSH_KEY      = process.env.SEMRUSH_API_KEY;
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

if (!SEMRUSH_KEY || !SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Missing environment variables. Copy .env.example to .env and fill in values.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

// ── Helpers ──────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(';');
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
  });
}

async function semrush(type, params) {
  const url = new URL('https://api.semrush.com/');
  url.searchParams.set('type', type);
  url.searchParams.set('key', SEMRUSH_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  const text = await res.text();

  if (text.startsWith('ERROR')) {
    throw new Error(`SEMrush error for ${type}: ${text.trim()}`);
  }
  return parseCSV(text);
}

function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? null : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }

function toMonth(dateStr) {
  // SEMrush date format: YYYYMMDD
  if (!dateStr || dateStr.length < 6) return null;
  return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-01`;
}

// ── Sync one site ─────────────────────────────────────────────

async function syncSite(site) {
  console.log(`\n🔄  ${site.name} (${site.domain})`);
  const db = site.db || 'be';

  // 1. Historical monthly metrics
  console.log('    Fetching history…');
  const history = await semrush('domain_rank_history', {
    domain: site.domain,
    database: db,
    export_columns: 'Rk,Or,Ot,Oc,Ad,At,Ac,Dt',
  });

  const metrics = history
    .map(row => ({
      site_id:          site.id,
      month:            toMonth(row['Date']),
      semrush_rank:     toInt(row['Rank']),
      organic_keywords: toInt(row['Organic Keywords']),
      organic_traffic:  toInt(row['Organic Traffic']),
      organic_cost:     toInt(row['Organic Cost']),
      adwords_keywords: toInt(row['Adwords Keywords']),
      adwords_traffic:  toInt(row['Adwords Traffic']),
      adwords_cost:     toInt(row['Adwords Cost']),
    }))
    .filter(m => m.month);

  const { error: metricsErr } = await supabase
    .from('metrics_monthly')
    .upsert(metrics, { onConflict: 'site_id,month' });
  if (metricsErr) throw metricsErr;
  console.log(`    ✓ ${metrics.length} monthly records`);

  // 2. Current keyword rankings
  console.log('    Fetching keywords…');
  const kwData = await semrush('domain_organic', {
    domain: site.domain,
    database: db,
    display_limit: 25,
    display_sort: 'tr_desc',
    export_columns: 'Ph,Po,Pp,Nq,Cp,Ur,Tr',
  });

  // Delete old keywords for this site, then insert fresh
  await supabase.from('keywords_current').delete().eq('site_id', site.id);

  if (kwData.length > 0) {
    const kwRows = kwData.map(k => ({
      site_id:       site.id,
      keyword:       k['Keyword'],
      position:      toInt(k['Position']),
      prev_position: toInt(k['Previous Position']),
      search_volume: toInt(k['Search Volume']),
      cpc:           toFloat(k['CPC']),
      traffic_pct:   toFloat(k['Traffic (%)']),
      url:           k['Url'] || null,
    }));

    const { error: kwErr } = await supabase.from('keywords_current').insert(kwRows);
    if (kwErr) throw kwErr;
    console.log(`    ✓ ${kwRows.length} keywords`);
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🚀  SEO Sync — ' + new Date().toISOString());

  const { data: sites, error } = await supabase
    .from('sites')
    .select('*')
    .eq('active', true);

  if (error) { console.error('Supabase error:', error); process.exit(1); }
  console.log(`Found ${sites.length} active site(s)`);

  let failed = 0;
  for (const site of sites) {
    try {
      await syncSite(site);
    } catch (e) {
      console.error(`    ✗ Failed: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${failed === 0 ? '✅' : '⚠️ '} Sync complete (${sites.length - failed}/${sites.length} succeeded)`);
  if (failed > 0) process.exit(1);
}

main();

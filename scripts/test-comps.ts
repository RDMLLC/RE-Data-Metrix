import { HybridCompsService } from '../server/services/hybrid-comps.service';

const SUBJECT = {
  address: '3127 Snapfinger Ct',
  city: 'Decatur',
  state: 'GA',
  zipCode: '30034',
  bedrooms: 3,
  bathrooms: 3,
  sqft: 2186,
  propertyType: 'Single Family',
  subjectLat: 33.6886,
  subjectLng: -84.2169,
  saleDateRangeDays: 180,
  maxResults: 20,
};

const compKey = (c: { address?: string; zipCode?: string }) => {
  const addr = (c.address || '').trim();
  const houseNumber = addr.split(/\s+/)[0]?.toLowerCase() || '';
  const zip = (c.zipCode || '').replace(/\D/g, '').slice(0, 5);
  return `${houseNumber}|${zip}`;
};

function pad(s: string, n: number) {
  return (s + ' '.repeat(n)).slice(0, n);
}

function printComps(label: string, comps: any[]) {
  console.log('\n=========================================================');
  console.log(`${label}  (${comps.length} comps)`);
  console.log('=========================================================');
  console.log(
    `${pad('#', 3)} ${pad('house|zip', 14)} ${pad('addr', 36)} ${pad(
      '$/sqft',
      8
    )} ${pad('dist', 6)} ${pad('flags', 14)} src`
  );
  comps.forEach((c, i) => {
    const flags: string[] = [];
    if (c.distressedFlag) flags.push('DSTRSS');
    if (c.outlierFlag) flags.push('OUT');
    if (c.borderlineFlag) flags.push('BRDR');
    if (c.cityMismatch) flags.push('CITY');
    console.log(
      `${pad(String(i), 3)} ${pad(compKey(c), 14)} ${pad(
        c.address || '',
        36
      )} ${pad('$' + (c.pricePerSqft ?? '?'), 8)} ${pad(
        c.distanceFromSubject != null
          ? c.distanceFromSubject.toFixed(2)
          : '?',
        6
      )} ${pad(flags.join(','), 14)} ${c.dataSource || '?'}`
    );
  });
}

async function run() {
  const service = new HybridCompsService();

  // ─── 0.5 mi ───
  const r05 = await service.searchComps({ ...SUBJECT, radiusMiles: 0.5 });
  printComps(
    `0.5 mi search — actualRadius=${r05.actualRadiusMiles}, expanded=${r05.radiusExpanded}`,
    r05.comps
  );
  console.log(
    `[stats] suitableCount=${r05.searchStats.suitableCount}  median$/sqft=${r05.searchStats.medianPricePerSqft}`
  );

  // ─── 1 mi ───
  const r1 = await service.searchComps({ ...SUBJECT, radiusMiles: 1 });
  printComps(
    `1 mi search — actualRadius=${r1.actualRadiusMiles}, expanded=${r1.radiusExpanded}`,
    r1.comps
  );
  console.log(
    `[stats] suitableCount=${r1.searchStats.suitableCount}  median$/sqft=${r1.searchStats.medianPricePerSqft}`
  );

  // Auto-selected at 1 mi: top-3 unflagged by similarityScore desc, then by distance asc.
  const oneMiSuitable = r1.comps.filter(
    (c: any) => !c.distressedFlag && !c.outlierFlag
  );
  oneMiSuitable.sort((a: any, b: any) => {
    const s = (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
    if (s !== 0) return s;
    return (a.distanceFromSubject ?? 999) - (b.distanceFromSubject ?? 999);
  });
  const oneMiSelected = oneMiSuitable.slice(0, 3);

  console.log('\n--- AUTO-SELECTED AT 1 MI (top-3 suitable by similarity/distance) ---');
  oneMiSelected.forEach((c: any, i: number) => {
    console.log(
      `  [${i}] ${compKey(c)}  ${c.address}  $${c.pricePerSqft}/sqft  ${
        c.distanceFromSubject != null
          ? c.distanceFromSubject.toFixed(2) + ' mi'
          : '?'
      }  sim=${c.similarityScore ?? '?'}`
    );
  });

  // ─── 2 mi ───
  const r2 = await service.searchComps({ ...SUBJECT, radiusMiles: 2 });
  printComps(
    `2 mi search — actualRadius=${r2.actualRadiusMiles}, expanded=${r2.radiusExpanded}`,
    r2.comps
  );
  console.log(
    `[stats] suitableCount=${r2.searchStats.suitableCount}  median$/sqft=${r2.searchStats.medianPricePerSqft}`
  );

  // Cross-check: do the 1mi-selected comps appear in the 2mi response?
  console.log('\n--- CROSS-CHECK: 1mi-selected vs 2mi response (by house# + ZIP) ---');
  const twoMiKeys = new Set(r2.comps.map(compKey));
  const matched: any[] = [];
  const missing: any[] = [];
  oneMiSelected.forEach((c: any) => {
    if (twoMiKeys.has(compKey(c))) {
      matched.push(c);
    } else {
      missing.push(c);
    }
  });
  console.log(`MATCHED (${matched.length}/${oneMiSelected.length}):`);
  matched.forEach((c: any) =>
    console.log(`  ✓ ${compKey(c)}  ${c.address}`)
  );
  console.log(`MISSING (${missing.length}/${oneMiSelected.length}):`);
  missing.forEach((c: any) =>
    console.log(
      `  ✗ ${compKey(c)}  ${c.address}  (was at ${
        c.distanceFromSubject != null
          ? c.distanceFromSubject.toFixed(2) + ' mi'
          : '?'
      } in 1mi response)`
    )
  );

  // Also show: which 2mi comps share a key with anything in the 1mi response (sanity)
  const oneMiKeys = new Set(r1.comps.map(compKey));
  const twoMiOverlap = r2.comps.filter((c: any) => oneMiKeys.has(compKey(c)));
  console.log(
    `\n[sanity] Total comps shared between 1mi and 2mi responses (any selection status): ${twoMiOverlap.length} / 1mi:${r1.comps.length} / 2mi:${r2.comps.length}`
  );

  process.exit(0);
}

run().catch((err) => {
  console.error('TEST SCRIPT FAILED:', err);
  process.exit(1);
});

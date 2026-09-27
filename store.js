// ============================================================
// PRAGMA Store — Reactive Central State Manager with LocalStorage
// ============================================================

const STORAGE_KEY = 'pragma_hse_state_v1';

const SEED_SITES = [
  { id: 'duliajan', name: 'Duliajan Well Pad Area', totalReports: 312, sifCount: 89, location: 'Assam East' },
  { id: 'naharkatiya', name: 'Naharkatiya Processing Plant', totalReports: 198, sifCount: 43, location: 'Assam East' },
  { id: 'moran', name: 'Moran Base Operations', totalReports: 145, sifCount: 55, location: 'Assam West' },
  { id: 'jorhat', name: 'Jorhat Refinery Feed', totalReports: 87, sifCount: 12, location: 'Assam South' },
  { id: 'digboi', name: 'Digboi Heritage Oilfield', totalReports: 201, sifCount: 28, location: 'Assam North' },
  { id: 'hugrijan', name: 'Hugrijan Compression Station', totalReports: 134, sifCount: 47, location: 'Assam East' },
  { id: 'makum', name: 'Makum Terminal', totalReports: 76, sifCount: 9, location: 'Assam North' },
  { id: 'rajabari', name: 'Rajabari Gathering Station', totalReports: 95, sifCount: 29, location: 'Assam Central' },
  { id: 'geleki', name: 'Geleki Field Sector', totalReports: 110, sifCount: 38, location: 'Assam South' }
];

const SAMPLE_REPORTS = [
  {
    id: 'sample-1',
    label: '⚠️ Clear SIF — Hot Work without PTW & Gas Test (Duliajan)',
    site: 'Duliajan Well Pad Area',
    text: `During routine inspection at Duliajan Well Pad-7, a contract worker was observed conducting welding operations on a crude oil transfer pipeline. No Hot Work Permit (PTW) had been obtained prior to commencing work. The area contained flammable hydrocarbon vapour with LEL readings at 35%. Gas test was not completed before work began. Fire extinguisher was absent from the work zone. Worker was not wearing appropriate PPE.`
  },
  {
    label: '✅ Clear Non-SIF — Minor Housekeeping Issue (Moran)',
    site: 'Moran Base Operations',
    text: `A housekeeping observation was reported at the Moran Base Camp canteen. Two mop buckets were found left in the corridor near Exit B after cleaning operations. The corridor width was reduced from 2.4m to 1.8m, which is still above minimum egress requirement of 1.2m. The housekeeping supervisor was notified and the items were promptly removed. No injury or near-miss occurred.`
  },
  {
    label: '🔶 Ambiguous — Scaffold Work under Deadline (Naharkatiya)',
    site: 'Naharkatiya Processing Plant',
    text: `Worker reported that scaffolding erection work was completed hastily to meet project deadline at Naharkatiya Processing Plant. Some cross-bracing was observed to not have been fully tightened. Work was carried out at height of approximately 8 metres. Scaffold was inspected the following morning and minor deficiencies noted. Workers were reported to have been under pressure.`
  },
  {
    label: '⚠️ Clear SIF — Crane SWL Exceeded (Jorhat)',
    site: 'Jorhat Refinery Feed',
    text: `During mobilisation of heavy pump assembly at Jorhat Site-3, the crane operator proceeded with lifting operations despite load rigging assessment indicating the load was 4.2 tonnes against the crane's rated capacity of 3.8 tonnes. The lifting plan had expired and was not renewed. No certified rigging inspection was completed. The sling used was visibly frayed.`
  },
  {
    label: '🔶 Ambiguous — Confined Space Entry Documentation (Geleki)',
    site: 'Geleki Field Sector',
    text: `Maintenance team entered a storage vessel for internal inspection. Standby person was present at the manhole. Atmospheric checks showed O2 at 20.1% and H2S at 0 ppm. However, the rescue plan was not completed in the permit documentation. Entry was completed without incident. Continuous atmospheric monitoring equipment was not deployed inside.`
  }
];

const INITIAL_REPORTS = [
  {
    id: 'PRG-8901',
    timestamp: '2026-09-27T10:15:00Z',
    site: 'Duliajan Well Pad Area',
    text: `Technician operated 11kV switchgear panel without confirming isolation status. Lockout/Tagout (LOTO) key was not retrieved from safety locker and panel tag was missing. High voltage electrical supply remained energized during maintenance access. Assistant worker stopped work before contact.`,
    sifDecision: 'YES',
    confidence: 0.94,
    decisionLabel: 'SIF-POTENTIAL',
    layer: 'Layer 1 — Ontology Rule Engine',
    energyLabel: 'Electrical',
    barrierLabel: 'Failed/Missing (missing, lockout not, energized)',
    lsrMatched: ['Energy Isolation', 'Work Authorisation', 'Bypassing Safety Controls'],
    highlightedText: `Technician operated 11kV switchgear panel without confirming isolation status. <mark class="evidence-highlight">Lockout</mark>/Tagout (LOTO) key was <mark class="evidence-highlight">not retrieved</mark> from safety locker and panel tag was <mark class="evidence-highlight">missing</mark>. High voltage <mark class="evidence-highlight">electrical</mark> supply remained <mark class="evidence-highlight">energized</mark> during maintenance access. Assistant worker stopped work before contact.`,
    action: `IMMEDIATE ACTION: Issue Stop Work order for Electrical operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`,
    status: 'PENDING',
    auditLog: [
      { timestamp: '2026-09-27T10:15:00Z', user: 'PRAGMA Engine', action: 'Flagged SIF-Potential', note: 'Layer 1 Ontology match (Energy: Electrical + Barrier: Lockout missing)' }
    ]
  },
  {
    id: 'PRG-8902',
    timestamp: '2026-09-27T09:40:00Z',
    site: 'Moran Base Operations',
    text: `Contractor riggers erected a temporary working scaffold at 9.5 metres height without installing toe-boards or mid-rails. Safety harness anchor line was attached to uncertified pipework. Scaffolding tag was absent. Inspection supervisor halted all elevated tasks immediately.`,
    sifDecision: 'YES',
    confidence: 0.91,
    decisionLabel: 'SIF-POTENTIAL',
    layer: 'Layer 1 — Ontology Rule Engine',
    energyLabel: 'Height',
    barrierLabel: 'Failed/Missing (absent, no harness)',
    lsrMatched: ['Working at Height', 'Bypassing Safety Controls'],
    highlightedText: `Contractor riggers erected a temporary working <mark class="evidence-highlight">scaffold</mark> at 9.5 metres <mark class="evidence-highlight">height</mark> without installing toe-boards or mid-rails. Safety <mark class="evidence-highlight">harness</mark> anchor line was attached to uncertified pipework. Scaffolding tag was <mark class="evidence-highlight">absent</mark>. Inspection supervisor halted all <mark class="evidence-highlight">elevated</mark> tasks immediately.`,
    action: `IMMEDIATE ACTION: Issue Stop Work order for Height operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`,
    status: 'PENDING',
    auditLog: [
      { timestamp: '2026-09-27T09:40:00Z', user: 'PRAGMA Engine', action: 'Flagged SIF-Potential', note: 'Layer 1 Ontology match (Energy: Height + Barrier: Tag absent)' }
    ]
  },
  {
    id: 'PRG-8903',
    timestamp: '2026-09-27T08:20:00Z',
    site: 'Hugrijan Compression Station',
    text: `Welding work started on gas compressor suction header without obtaining Hot Work Permit (PTW) or carrying out combustible gas test. Hydrocarbon gas leak was present 4 metres away with 18% LEL reading. Sparks observed during grinding operation.`,
    sifDecision: 'YES',
    confidence: 0.95,
    decisionLabel: 'SIF-POTENTIAL',
    layer: 'Layer 1 — Ontology Rule Engine',
    energyLabel: 'Chemical Fire',
    barrierLabel: 'Failed/Missing (without permit, gas test not, leak)',
    lsrMatched: ['Hot Work', 'Work Authorisation', 'Bypassing Safety Controls'],
    highlightedText: `<mark class="evidence-highlight">Welding</mark> work started on <mark class="evidence-highlight">gas</mark> compressor suction header <mark class="evidence-highlight">without obtaining</mark> <mark class="evidence-highlight">Hot Work</mark> Permit (PTW) or carrying out combustible <mark class="evidence-highlight">gas test</mark>. Hydrocarbon <mark class="evidence-highlight">gas leak</mark> was present 4 metres away with 18% LEL reading. <mark class="evidence-highlight">Sparks</mark> observed during <mark class="evidence-highlight">grinding</mark> operation.`,
    action: `IMMEDIATE ACTION: Issue Stop Work order for Chemical Fire operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`,
    status: 'PENDING',
    auditLog: [
      { timestamp: '2026-09-27T08:20:00Z', user: 'PRAGMA Engine', action: 'Flagged SIF-Potential', note: 'Layer 1 Ontology match (Energy: Chemical Fire + Barrier: PTW not obtained)' }
    ]
  },
  {
    id: 'PRG-8904',
    timestamp: '2026-09-26T16:50:00Z',
    site: 'Naharkatiya Processing Plant',
    text: `Vessel entry into crude separator V-102 carried out without gas testing or continuous oxygen monitoring. Entry permit JSA was incomplete and rescue tripod harness was missing from site. Standby watchman was absent during worker entry.`,
    sifDecision: 'YES',
    confidence: 0.89,
    decisionLabel: 'SIF-POTENTIAL',
    layer: 'Layer 1 — Ontology Rule Engine',
    energyLabel: 'Confined Space Atm',
    barrierLabel: 'Failed/Missing (missing, absent, jsa not)',
    lsrMatched: ['Confined Space', 'Work Authorisation'],
    highlightedText: `<mark class="evidence-highlight">Vessel entry</mark> into crude separator V-102 carried out without gas testing or continuous oxygen monitoring. Entry permit JSA was incomplete and rescue tripod <mark class="evidence-highlight">harness</mark> was <mark class="evidence-highlight">missing</mark> from site. Standby watchman was <mark class="evidence-highlight">absent</mark> during worker entry.`,
    action: `IMMEDIATE ACTION: Issue Stop Work order for Confined Space Atm operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`,
    status: 'PENDING',
    auditLog: [
      { timestamp: '2026-09-26T16:50:00Z', user: 'PRAGMA Engine', action: 'Flagged SIF-Potential', note: 'Layer 1 Ontology match (Energy: Confined Space + Barrier: Rescue equipment missing)' }
    ]
  },
  {
    id: 'PRG-8905',
    timestamp: '2026-09-26T14:10:00Z',
    site: 'Jorhat Refinery Feed',
    text: `Heavy mud pump lift conducted using mobile crane rated 3.8T. Rigging plan indicated total load was 4.4T. Crane outriggers were deployed on soft uncompacted soil without spreader mats. Crane SWL alarm was disabled by operator.`,
    sifDecision: 'YES',
    confidence: 0.93,
    decisionLabel: 'SIF-POTENTIAL',
    layer: 'Layer 1 — Ontology Rule Engine',
    energyLabel: 'Mechanical Lifting',
    barrierLabel: 'Failed/Missing (disabled, swl exceeded)',
    lsrMatched: ['Safe Mechanical Lifting', 'Bypassing Safety Controls'],
    highlightedText: `Heavy mud pump lift conducted using mobile <mark class="evidence-highlight">crane</mark> rated 3.8T. <mark class="evidence-highlight">Rigging</mark> plan indicated total load was 4.4T. Crane outriggers were deployed on soft uncompacted soil without spreader mats. Crane <mark class="evidence-highlight">SWL</mark> alarm was <mark class="evidence-highlight">disabled</mark> by operator.`,
    action: `IMMEDIATE ACTION: Issue Stop Work order for Mechanical Lifting operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`,
    status: 'ACCEPTED',
    auditLog: [
      { timestamp: '2026-09-26T14:10:00Z', user: 'PRAGMA Engine', action: 'Flagged SIF-Potential', note: 'Layer 1 Ontology match' },
      { timestamp: '2026-09-26T15:00:00Z', user: 'HSE Lead R. Baruah', action: 'ACCEPTED', note: 'Stop work issued. Crane operator retrained.' }
    ]
  },
  {
    id: 'PRG-8906',
    timestamp: '2026-09-26T11:30:00Z',
    site: 'Digboi Heritage Oilfield',
    text: `Heavy transport vehicle exceeded facility speed limit (45 km/h in 20 km/h zone) while driving past active wellhead area. Driver was observed speaking on mobile phone. Seatbelt was unfastened.`,
    sifDecision: 'AMBIGUOUS',
    confidence: 0.62,
    decisionLabel: 'AMBIGUOUS (Escalated to ML)',
    layer: 'Layer 2 — DistilRoBERTa ML Model',
    energyLabel: 'Vehicle',
    barrierLabel: 'No failure detected',
    lsrMatched: ['Driving'],
    highlightedText: `Heavy transport <mark class="evidence-highlight">vehicle</mark> exceeded facility <mark class="evidence-highlight">speed limit</mark> (45 km/h in 20 km/h zone) while <mark class="evidence-highlight">driving</mark> past active wellhead area. <mark class="evidence-highlight">Driver</mark> was observed speaking on <mark class="evidence-highlight">mobile phone</mark>. <mark class="evidence-highlight">Seatbelt</mark> was unfastened.`,
    action: `HSE Officer Review Required: Verify barrier state for Vehicle energy source prior to field execution.`,
    status: 'PENDING',
    auditLog: [
      { timestamp: '2026-09-26T11:30:00Z', user: 'PRAGMA Engine', action: 'Flagged Ambiguous', note: 'Escalated to Layer 2 classifier' }
    ]
  }
];

function loadInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse state, falling back to seed');
    }
  }

  return {
    sites: SEED_SITES,
    reports: INITIAL_REPORTS,
    modelHealth: {
      precision: 0.86,
      recall: 0.81,
      f2Score: 0.82,
      ontologyCoverage: 0.45,
      overrideRate: 0.042
    }
  };
}

let state = loadInitialState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('pragma:state-changed', { detail: state }));
}

function getStore() {
  return state;
}

function resetStore() {
  localStorage.removeItem(STORAGE_KEY);
  state = {
    sites: SEED_SITES,
    reports: INITIAL_REPORTS,
    modelHealth: {
      precision: 0.86,
      recall: 0.81,
      f2Score: 0.82,
      ontologyCoverage: 0.45,
      overrideRate: 0.042
    }
  };
  saveState();
}

function addReport(reportData) {
  const newId = `PRG-${Math.floor(8900 + Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newReport = {
    id: newId,
    timestamp: now,
    site: reportData.site || 'Duliajan Well Pad Area',
    text: reportData.text,
    sifDecision: reportData.analysis.sifDecision,
    confidence: reportData.analysis.confidence,
    decisionLabel: reportData.analysis.decisionLabel,
    layer: reportData.analysis.layer,
    energyLabel: reportData.analysis.energyLabel,
    barrierLabel: reportData.analysis.barrierLabel,
    lsrMatched: reportData.analysis.lsrMatched,
    highlightedText: reportData.analysis.highlightedText,
    action: reportData.analysis.action,
    status: reportData.analysis.sifDecision === 'NO' ? 'ACCEPTED' : 'PENDING',
    auditLog: [
      {
        timestamp: now,
        user: 'PRAGMA Engine',
        action: reportData.analysis.sifDecision === 'YES' ? 'Flagged SIF-Potential' : reportData.analysis.sifDecision === 'AMBIGUOUS' ? 'Flagged Ambiguous' : 'Passed Non-SIF',
        note: `Analyzed via ${reportData.analysis.layer}`
      }
    ]
  };

  state.reports.unshift(newReport);

  // Update site count
  const siteObj = state.sites.find(s => s.name === newReport.site);
  if (siteObj) {
    siteObj.totalReports += 1;
    if (newReport.sifDecision === 'YES') {
      siteObj.sifCount += 1;
    }
  }

  saveState();
  return newReport;
}

function updateReportStatus(reportId, newStatus, note = '', user = 'HSE Officer') {
  const r = state.reports.find(rep => rep.id === reportId);
  if (!r) return;

  r.status = newStatus;
  r.auditLog.push({
    timestamp: new Date().toISOString(),
    user: user,
    action: newStatus,
    note: note || `Report status updated to ${newStatus}`
  });

  saveState();
}

function getSiteStats() {
  return state.sites.map(s => {
    const sifRate = s.totalReports > 0 ? (s.sifCount / s.totalReports) : 0;
    let riskLevel = 'LOW';
    if (sifRate > 0.35) riskLevel = 'CRITICAL';
    else if (sifRate > 0.22) riskLevel = 'HIGH';
    else if (sifRate > 0.15) riskLevel = 'MEDIUM';

    return {
      ...s,
      sifRate: (sifRate * 100).toFixed(1),
      sifRateNum: sifRate,
      riskLevel
    };
  }).sort((a, b) => b.sifRateNum - a.sifRateNum); // Ranked by SIF RATE!
}

window.PRAGMA_STORE = {
  getStore,
  saveState,
  resetStore,
  addReport,
  updateReportStatus,
  getSiteStats,
  SAMPLE_REPORTS
};

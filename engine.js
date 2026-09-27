// ============================================================
// PRAGMA Engine — Layer 1 Ontology Rule Engine & LSR Classifier
// ============================================================

const ENERGY_KEYWORDS = {
  electrical: ['live wire', 'energized', 'electrical', 'high voltage', 'arc flash', 'electrocution', 'power line', 'switchgear', 'cable', 'voltage', 'shock', 'transformer', 'panel'],
  pressure: ['pressure', 'high-pressure', 'pressurized', 'burst', 'blowout', 'relief valve', 'pipeline pressure', 'gas release', 'compressed', 'psi', 'bar', 'hydraulic'],
  height: ['height', 'elevated', 'fall', 'falling', 'scaffold', 'scaffolding', 'rooftop', 'ladder', 'working at height', 'dropped', 'above ground', 'aerial', 'roof', 'platform'],
  chemical_fire: ['flammable', 'combustible', 'hydrocarbon', 'gas leak', 'vapour', 'vapor', 'explosion', 'ignition', 'fire', 'hot work', 'welding', 'sparks', 'naphtha', 'crude', 'toxic', 'chemical'],
  mechanical_lifting: ['crane', 'lifting', 'sling', 'rigging', 'rotating', 'machinery', 'equipment failure', 'grinding', 'caught', 'pinch point', 'moving part', 'conveyor', 'hoist'],
  confined_space_atm: ['confined space', 'tank entry', 'vessel entry', 'oxygen deficiency', 'o2 deficiency', 'h2s', 'toxic gas', 'asphyxiation', 'manhole', 'pit entry'],
  vehicle: ['vehicle', 'truck', 'driving', 'collision', 'speeding', 'forklift', 'transport', 'mobile equipment', 'road', 'seatbelt', 'fatigue driving'],
  radiation: ['radiation', 'radioactive', 'x-ray', 'laser', 'uv exposure', 'gamma']
};

const BARRIER_FAILURE_KEYWORDS = [
  'not completed', 'missing', 'bypassed', 'not in use', 'absent', 'not obtained',
  'disabled', 'removed', 'overridden', 'expired', 'silenced', 'without permit',
  'no harness', 'permit not', 'jsa not', 'loto not', 'lockout not', 'not issued',
  'guard removed', 'no guard', 'alarm inhibited', 'inhibited', 'not functional',
  'not working', 'non-functional', 'failed', 'not worn', 'ignored', 'skipped',
  'not followed', 'not done', 'without authorization', 'no rescue plan',
  'gas test not', 'untested', 'not inspected', 'no spotter', 'unattended', 'defect'
];

const LSR_SIGNALS = {
  'Energy Isolation': ['lockout', 'loto', 'tagout', 'energized', 'live wire', 'de-energize', 'isolation not', 'isolation valve'],
  'Hot Work': ['welding', 'hot work permit', 'hot work', 'flammable atmosphere', 'sparks', 'grinding', 'cutting', 'torch'],
  'Confined Space': ['confined space', 'tank entry', 'vessel entry', 'o2 deficiency', 'oxygen deficiency', 'h2s', 'rescue plan', 'manhole', 'pit entry'],
  'Line of Fire': ['struck by', 'in path', 'pressure release', 'dropped object', 'line of fire', 'ejected', 'caught in', 'crushing', 'flying debris'],
  'Working at Height': ['harness', 'fall arrest', 'guardrail missing', 'guardrail', 'scaffolding', 'scaffold', 'working at height', 'fall', 'elevated', 'roof'],
  'Safe Mechanical Lifting': ['crane', 'sling', 'swl exceeded', 'swl', 'rigging', 'lifting plan', 'overhead lifting', 'load', 'hook', 'certified rigging'],
  'Work Authorisation': ['without permit', 'ptw not obtained', 'ptw not', 'jsa not completed', 'jsa not', 'permit not obtained', 'permit not issued', 'work permit'],
  'Bypassing Safety Controls': ['bypass', 'bypassed', 'inhibited', 'disabled alarm', 'removed guard', 'guard removed', 'safety device', 'interlock', 'defeat'],
  'Driving': ['seatbelt', 'seat belt', 'speed limit', 'mobile phone', 'fatigue', 'driving', 'driver', 'vehicle', 'road safety']
};

function getSentences(text) {
  return text.match(/[^.!?\n]+[.!?\n]?/g) || [text];
}

function findMatches(text, keywords) {
  const lc = text.toLowerCase();
  return keywords.filter(kw => lc.includes(kw.toLowerCase()));
}

function findMatchedSentences(text, keywords) {
  const sentences = getSentences(text);
  const matched = [];
  keywords.forEach(kw => {
    sentences.forEach(sent => {
      if (sent.toLowerCase().includes(kw.toLowerCase()) && !matched.includes(sent.trim())) {
        matched.push(sent.trim());
      }
    });
  });
  return matched;
}

function highlightEvidence(text, allMatchedKws) {
  let result = text;
  // Sort by length descending to match longer phrases first
  const sortedKws = [...allMatchedKws].sort((a, b) => b.length - a.length);
  sortedKws.forEach(kw => {
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark class="evidence-highlight">$1</mark>');
  });
  return result;
}

function analyzeReport(text) {
  const energyHits = {};
  let allEnergyKws = [];

  for (const [type, kws] of Object.entries(ENERGY_KEYWORDS)) {
    const hits = findMatches(text, kws);
    if (hits.length > 0) {
      energyHits[type] = hits;
      allEnergyKws = allEnergyKws.concat(hits);
    }
  }

  const barrierHits = findMatches(text, BARRIER_FAILURE_KEYWORDS);

  const lsrMatched = [];
  for (const [rule, kws] of Object.entries(LSR_SIGNALS)) {
    if (findMatches(text, kws).length > 0) {
      lsrMatched.push(rule);
    }
  }

  const energyTypes = Object.keys(energyHits);
  const hasEnergy = energyTypes.length > 0;
  const hasBarrier = barrierHits.length > 0;

  let sifDecision, confidence, decisionLabel, layer;

  if (hasEnergy && hasBarrier) {
    const totalHits = allEnergyKws.length + barrierHits.length;
    confidence = Math.min(0.96, 0.82 + (totalHits * 0.02));
    confidence = parseFloat(confidence.toFixed(2));
    sifDecision = 'YES';
    decisionLabel = 'SIF-POTENTIAL';
    layer = 'Layer 1 — Ontology Rule Engine';
  } else if (hasEnergy || hasBarrier) {
    const hits = allEnergyKws.length + barrierHits.length;
    confidence = parseFloat(Math.min(0.68, 0.45 + hits * 0.04).toFixed(2));
    sifDecision = 'AMBIGUOUS';
    decisionLabel = 'AMBIGUOUS (Escalated to ML)';
    layer = 'Layer 2 — DistilRoBERTa ML Model';
  } else {
    confidence = 0.94;
    sifDecision = 'NO';
    decisionLabel = 'NON-SIF';
    layer = 'Layer 1 — Ontology Rule Engine';
  }

  const allMatchedKws = [...new Set([...allEnergyKws, ...barrierHits])];
  const evidenceSentences = findMatchedSentences(text, allMatchedKws);
  const highlightedText = highlightEvidence(text, allMatchedKws);

  const energyLabel = energyTypes.length > 0
    ? energyTypes.map(e => e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')
    : 'None detected';

  const barrierLabel = barrierHits.length > 0
    ? `Failed/Missing (${[...new Set(barrierHits)].slice(0, 3).join(', ')})`
    : 'No failure detected';

  let action = 'Log for safety trend monitoring. No immediate SIF intervention required.';
  if (sifDecision === 'YES') {
    action = `IMMEDIATE ACTION: Issue Stop Work order for ${energyLabel} operations. Inspect and verify safety barriers before resuming. Notify Site HSE Lead.`;
  } else if (sifDecision === 'AMBIGUOUS') {
    action = `HSE Officer Review Required: Verify barrier state for ${energyLabel} energy source prior to field execution.`;
  }

  return {
    sifDecision,
    confidence,
    decisionLabel,
    layer,
    energyLabel,
    barrierLabel,
    lsrMatched,
    highlightedText,
    evidenceSentences,
    action,
    matchedEnergyTypes: energyTypes,
    barrierHits: [...new Set(barrierHits)],
    allMatchedKws
  };
}

// Attach globally for browser usage
window.PRAGMA_ENGINE = {
  analyzeReport,
  ENERGY_KEYWORDS,
  BARRIER_FAILURE_KEYWORDS,
  LSR_SIGNALS
};

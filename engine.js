// engine.js — 7-stage diagnostic engine and Anthropic API call

function buildPrompt(processName, audience, regions) {
  const regionText = regions.map(r =>
    `REGION: ${r.name} (Headcount: ${r.headcount})\nSteps:\n${r.steps.map((s, i) => `  ${i + 1}. ${s.desc} — TAT: ${s.tat}`).join('\n')}`
  ).join('\n\n');

  return `You are a senior operations diagnostic engine. Analyse this multi-region process variation and return ONLY a JSON object; no preamble; no markdown; raw JSON only.

PROCESS: ${processName}
AUDIENCE: ${audience}

${regionText}

Run all 7 diagnostic stages internally:
1. Process Decomposition — break each region's input into discrete comparable steps
2. Variance Analysis — compare step count and TAT across regions; identify the outlier market by largest TAT deviation
3. Root Cause Analysis — assign reason codes per divergence: Regulatory / Cultural / Resource-Driven / Legacy Workaround
4. CAGE Framework — test each reason code against Cultural / Administrative / Geographic / Economic filters. Pass = legitimate local variation. Fail all four = friction
5. Step Classification — stamp each step: Standardise / Modify / Keep Local
6. Theory of Constraints — identify the single binding bottleneck; suppress non-constraint recommendations until bottleneck resolved
7. Pareto Filter — identify top 20% of fixes delivering 80% improvement; P1-P4 priority actions max; max 2 secondary actions
Keep all string values concise — maximum 15 words per string value in the JSON.

Return this exact JSON structure:
{
  "referenceMarket": "region name",
  "outlierMarket": "region name",
  "marketSummary": [
    {"name": "region name", "stepCount": 5, "estimatedTAT": "6 days", "legacySteps": 2, "cageLegitimacyRatio": "60%", "isReference": true, "isOutlier": false}
  ],
  "divergenceMap": [
    {"stepName": "step description", "regionVerdicts": {"Region1": {"verdict": "Standardise", "rootCause": "Legacy Workaround"}, "Region2": {"verdict": "Keep Local", "rootCause": "Regulatory"}}}
  ],
  "bindingConstraint": "plain English explanation of the single bottleneck and which region it lives in",
  "priorityActions": [
    {"priority": "P1", "title": "short action title", "rationale": "one line why this first", "verdict": "Standardise"}
  ],
  "secondaryActions": [
    {"title": "short action", "rationale": "one line"}
  ],
  "processOwnerAnalysis": [
    "bullet point 1 max 25 words",
    "bullet point 2 max 25 words",
    "bullet point 3 max 25 words",
    "bullet point 4 max 25 words"
  ],
  "execAnalysis": [
    "bullet point 1 max 25 words",
    "bullet point 2 max 25 words",
    "bullet point 3 max 25 words",
    "bullet point 4 max 25 words"
  ]
}`;
}

async function runEngine(processName, audience, regions) {
  const prompt = buildPrompt(processName, audience, regions);

  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content.map(i => i.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

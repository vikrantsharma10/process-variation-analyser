// engine.js — builds the user prompt and calls the API

function buildUserPrompt(processName, context, audience, regions) {
  const regionText = regions.map(r =>
    `REGION: ${r.name} (Headcount: ${r.headcount})\nSteps:\n${r.steps.map((s, i) => `  ${i + 1}. ${s.desc} - TAT: ${s.tat}`).join('\n')}`
  ).join('\n\n');
  return `PROCESS: ${processName}${context ? '\nCONTEXT: ' + context : ''}
AUDIENCE: ${audience}
${regionText}`;
}

async function runEngine(processName, context, audience, regions) {
  const userPrompt = buildUserPrompt(processName, context, audience, regions);
  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return {
    processOwnerText: data.processOwnerText,
    execText: data.execText
  };
}

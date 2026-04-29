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

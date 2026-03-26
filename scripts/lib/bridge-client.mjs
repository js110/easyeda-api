const DEFAULT_PORT_RANGE = { start: 49620, end: 49629 };
const SERVICE_ID = 'easyeda-bridge';
const EXECUTE_RETRY_DELAYS_MS = [0, 250, 750];

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

export async function discoverBridge(baseUrl = null, portRange = DEFAULT_PORT_RANGE) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Bridge health check failed: ${response.status}`);
    }
    const payload = await parseJsonResponse(response);
    if (payload?.service !== SERVICE_ID) {
      throw new Error(`Unexpected bridge service: ${payload?.service || 'unknown'}`);
    }
    return { baseUrl, health: payload };
  }

  for (let port = portRange.start; port <= portRange.end; port += 1) {
    const candidate = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${candidate}/health`);
      if (!response.ok) {
        continue;
      }
      const payload = await parseJsonResponse(response);
      if (payload?.service === SERVICE_ID) {
        return { baseUrl: candidate, health: payload };
      }
    } catch {
      // Keep scanning the remaining ports.
    }
  }

  throw new Error(`Unable to find ${SERVICE_ID} on ports ${portRange.start}-${portRange.end}`);
}

export async function listWindows(baseUrl) {
  const response = await fetch(`${baseUrl}/eda-windows`);
  if (!response.ok) {
    throw new Error(`Failed to list EDA windows: ${response.status}`);
  }
  return parseJsonResponse(response);
}

export async function executeCode(baseUrl, code, windowId = null) {
  let lastError = null;

  for (const delayMs of EXECUTE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      const response = await fetch(`${baseUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(windowId ? { code, windowId } : { code }),
      });
      const payload = await parseJsonResponse(response);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Bridge execution failed with status ${response.status}`);
      }
      if (!payload) {
        throw new Error('Bridge execution returned an empty response body.');
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Bridge execution failed for an unknown reason.');
}

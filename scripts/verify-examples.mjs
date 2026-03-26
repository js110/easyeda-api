import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { discoverBridge, executeCode, listWindows } from './lib/bridge-client.mjs';
import {
  needsContextRestore,
  pickRestoreDocumentUuid,
  sortEntriesForVerification,
} from './lib/verification-context.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {
    all: false,
    className: null,
    methodSlug: null,
    mode: 'safe',
    baseUrl: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--all') {
      args.all = true;
    } else if (value === '--class') {
      args.className = argv[index + 1] || null;
      index += 1;
    } else if (value === '--method') {
      args.methodSlug = argv[index + 1] || null;
      index += 1;
    } else if (value === '--mode') {
      args.mode = argv[index + 1] || 'safe';
      index += 1;
    } else if (value === '--base-url') {
      args.baseUrl = argv[index + 1] || null;
      index += 1;
    } else if (value === '--help' || value === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-examples.mjs --mode safe
  node scripts/verify-examples.mjs --class DMT_Project --mode all
  node scripts/verify-examples.mjs --method PCB_PrimitiveLine.create --mode mutating
`);
}

async function loadCatalog() {
  const catalogPath = path.join(ROOT_DIR, 'examples', 'catalog.json');
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

async function loadGeneratedJson(entry) {
  return JSON.parse(await readFile(path.join(ROOT_DIR, entry.generatedPath), 'utf8'));
}

function matchesFilters(entry, args) {
  if (args.className && entry.className !== args.className) {
    return false;
  }
  if (args.methodSlug && entry.slug !== args.methodSlug) {
    return false;
  }
  if (!args.all && !args.className && !args.methodSlug && entry.validationMode !== args.mode) {
    return false;
  }
  if (args.mode !== 'all' && entry.validationMode !== args.mode) {
    return false;
  }
  return true;
}

async function probeContext(baseUrl) {
  const code = [
    'return await (async function(eda) {',
    '  let currentProject = null;',
    '  let currentDocument = null;',
    '  try {',
    '    currentProject = await eda.dmt_Project.getCurrentProjectInfo();',
    '  } catch {',
    '    currentProject = null;',
    '  }',
    '  try {',
    '    currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();',
    '  } catch {',
    '    currentDocument = null;',
    '  }',
    '  const activeProjectDocumentUuid = currentDocument?.uuid ?? null;',
    '  return {',
    '    hasProject: Boolean(currentProject),',
    '    projectUuid: currentProject?.uuid ?? null,',
    '    projectName: currentProject?.friendlyName ?? currentProject?.name ?? null,',
    '    documentType: currentDocument?.documentType ?? null,',
    '    tabId: currentDocument?.tabId ?? null,',
    '    documentUuid: currentDocument?.uuid ?? null,',
    '    schematicPageUuid: currentDocument?.documentType === 1 ? currentDocument?.uuid ?? null : null,',
    '    pcbUuid: currentDocument?.documentType === 3 ? currentDocument?.uuid ?? null : null,',
    '    panelUuid: null,',
    '    activeProjectDocumentUuid,',
    '    anchor: typeof eda.sys_Window?.getUrlAnchor === "function" ? eda.sys_Window.getUrlAnchor() : null,',
    '  };',
    '})(eda);',
  ].join('\n');
  const response = await executeCode(baseUrl, code);
  return response.result;
}

function mergeAnchorContext(base, incoming) {
  if (!incoming?.hasProject) {
    return base;
  }
  return {
    hasProject: true,
    projectUuid: incoming.projectUuid ?? base?.projectUuid ?? null,
    projectName: incoming.projectName ?? base?.projectName ?? null,
    documentType: incoming.documentType ?? base?.documentType ?? null,
    tabId: incoming.tabId ?? base?.tabId ?? null,
    documentUuid: incoming.documentUuid ?? base?.documentUuid ?? null,
    schematicPageUuid: incoming.schematicPageUuid ?? (incoming.documentType === 1 ? incoming.documentUuid : null) ?? base?.schematicPageUuid ?? null,
    pcbUuid: incoming.pcbUuid ?? (incoming.documentType === 3 ? incoming.documentUuid : null) ?? base?.pcbUuid ?? null,
    panelUuid: incoming.panelUuid ?? base?.panelUuid ?? null,
    activeProjectDocumentUuid: incoming.activeProjectDocumentUuid ?? incoming.documentUuid ?? base?.activeProjectDocumentUuid ?? null,
    anchor: incoming.anchor ?? base?.anchor ?? null,
  };
}

async function restoreContext(baseUrl, entry, anchorContext) {
  const targetDocumentUuid = pickRestoreDocumentUuid(entry, anchorContext);
  const targetProjectUuid = anchorContext?.projectUuid || null;
  if (!targetDocumentUuid && !targetProjectUuid) {
    return {
      restored: false,
      reason: 'No project anchor available to restore context.',
    };
  }

  const code = [
    'return await (async function(eda) {',
    `  const targetDocumentUuid = ${JSON.stringify(targetDocumentUuid)};`,
    `  const targetProjectUuid = ${JSON.stringify(targetProjectUuid)};`,
    '  let openedProject = null;',
    '  let switchedTabId = null;',
    '  if (targetProjectUuid) {',
    '    openedProject = await eda.dmt_Project.openProject(targetProjectUuid);',
    '    await new Promise((resolve) => setTimeout(resolve, 1000));',
    '  }',
    '  if (targetDocumentUuid) {',
    '    switchedTabId = await eda.dmt_EditorControl.openDocument(targetDocumentUuid);',
    '    await new Promise((resolve) => setTimeout(resolve, 1000));',
    '  }',
    '  let currentProject = null;',
    '  let currentDocument = null;',
    '  try {',
    '    currentProject = await eda.dmt_Project.getCurrentProjectInfo();',
    '  } catch {',
    '    currentProject = null;',
    '  }',
    '  try {',
    '    currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();',
    '  } catch {',
    '    currentDocument = null;',
    '  }',
    '  return {',
    '    restored: Boolean(currentProject),',
    '    openedProject,',
    '    switchedTabId,',
    '    projectUuid: currentProject?.uuid ?? null,',
    '    projectName: currentProject?.friendlyName ?? currentProject?.name ?? null,',
    '    documentType: currentDocument?.documentType ?? null,',
    '    tabId: currentDocument?.tabId ?? null,',
    '    documentUuid: currentDocument?.uuid ?? null,',
    '    targetProjectUuid,',
    '    targetDocumentUuid,',
    '  };',
    '})(eda);',
  ].join('\n');

  const execution = await executeCode(baseUrl, code);
  return execution.result;
}

function shouldBlock(entry, contextSnapshot) {
  if (entry.requiresProject && !contextSnapshot?.hasProject) {
    return '当前没有打开工程。';
  }
  if (entry.requiresDocumentType === 'PCB' && contextSnapshot?.documentType !== 3) {
    return '当前活动文档不是 PCB。';
  }
  if (entry.requiresDocumentType === 'SCHEMATIC_PAGE' && contextSnapshot?.documentType !== 1) {
    return '当前活动文档不是原理图图页。';
  }
  return null;
}

function summarizeResult(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      preview: value.slice(0, 2),
    };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).slice(0, 8);
    return {
      type: 'object',
      keys,
      preview: Object.fromEntries(keys.map((key) => [key, value[key]])),
    };
  }
  return value;
}

function classifyExecutionError(error) {
  const message = error?.message || String(error);
  if (message.includes('没有可用于演示的图元')) {
    return {
      status: 'blocked',
      reason: message,
    };
  }
  return {
    status: 'failed',
    error: message,
  };
}

async function writeReport(report) {
  const reportsDir = path.join(ROOT_DIR, 'examples', 'reports');
  await mkdir(reportsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const datedPath = path.join(reportsDir, `${timestamp}.json`);
  const latestPath = path.join(reportsDir, 'latest.json');
  const content = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(datedPath, content);
  await writeFile(latestPath, content);
  return { datedPath, latestPath };
}

function extractAnchorContext(report) {
  let merged = mergeAnchorContext(null, report?.contextSnapshot ?? null);
  for (const item of report?.results || []) {
    merged = mergeAnchorContext(merged, item?.contextSnapshot ?? null);
    merged = mergeAnchorContext(merged, item?.restoreAttempt ?? null);
  }
  return merged;
}

async function loadRecentAnchorContext(rootDir) {
  const reportsDir = path.join(rootDir, 'examples', 'reports');
  let reportNames = [];

  try {
    reportNames = await readdir(reportsDir);
  } catch {
    return null;
  }

  const orderedNames = [
    'latest.json',
    ...reportNames
      .filter((name) => name.endsWith('.json') && name !== 'latest.json')
      .sort()
      .reverse(),
  ];

  let merged = null;

  for (const name of orderedNames) {
    try {
      const report = JSON.parse(await readFile(path.join(reportsDir, name), 'utf8'));
      merged = mergeAnchorContext(merged, extractAnchorContext(report));
      if (merged?.hasProject && merged?.schematicPageUuid && merged?.pcbUuid) {
        return merged;
      }
    } catch {
      // Ignore malformed historical reports and continue scanning.
    }
  }

  return merged;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const catalog = await loadCatalog();
  const selectedEntries = sortEntriesForVerification(
    catalog.filter((entry) => matchesFilters(entry, args)),
  );

  if (!selectedEntries.length) {
    console.log(JSON.stringify({ selectedCount: 0, message: 'No matching examples found.' }, null, 2));
    return;
  }

  const bridge = await discoverBridge(args.baseUrl);
  const windows = await listWindows(bridge.baseUrl);
  const contextSnapshot = await probeContext(bridge.baseUrl);
  const seededAnchorContext = await loadRecentAnchorContext(ROOT_DIR);
  let anchorContext = mergeAnchorContext(seededAnchorContext, contextSnapshot);

  const report = {
    generatedAt: new Date().toISOString(),
    bridgeBaseUrl: bridge.baseUrl,
    health: bridge.health,
    windows,
    contextSnapshot,
    seededAnchorContext,
    requestedMode: args.mode,
    results: [],
  };

  for (const entry of selectedEntries) {
    const generated = await loadGeneratedJson(entry);
    let currentContext = await probeContext(bridge.baseUrl);
    let restoreAttempt = null;

    anchorContext = mergeAnchorContext(anchorContext, currentContext);

    if (needsContextRestore(entry, currentContext) && anchorContext) {
      try {
        restoreAttempt = await restoreContext(bridge.baseUrl, entry, anchorContext);
        currentContext = await probeContext(bridge.baseUrl);
        anchorContext = mergeAnchorContext(anchorContext, currentContext);
      } catch (error) {
        restoreAttempt = {
          restored: false,
          reason: error.message,
        };
      }
    }

    const blockedReason = shouldBlock(entry, currentContext);

    if (entry.status !== 'ready') {
      report.results.push({
        slug: entry.slug,
        status: 'skipped',
        reason: `Catalog status is ${entry.status}`,
      });
      continue;
    }

    if (blockedReason) {
      report.results.push({
        slug: entry.slug,
        status: 'blocked',
        reason: blockedReason,
        contextSnapshot: currentContext,
        restoreAttempt,
      });
      continue;
    }

    try {
      const execution = await executeCode(bridge.baseUrl, generated.code);
      const postContext = await probeContext(bridge.baseUrl);
      anchorContext = mergeAnchorContext(anchorContext, postContext);
      report.results.push({
        slug: entry.slug,
        status: 'passed',
        windowId: execution.windowId,
        summary: summarizeResult(execution.result),
        contextSnapshot: currentContext,
        restoreAttempt,
      });
    } catch (error) {
      report.results.push({
        slug: entry.slug,
        ...classifyExecutionError(error),
        contextSnapshot: currentContext,
        restoreAttempt,
      });
    }
  }

  const reportPaths = await writeReport(report);
  console.log(JSON.stringify({
    selectedCount: selectedEntries.length,
    reportPaths,
    results: report.results,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

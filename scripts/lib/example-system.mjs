import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function indent(text, prefix = '  ') {
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

function appendUniqueLines(target, lines) {
  const existing = new Set(target);
  for (const line of lines) {
    if (/^\s*}\s*$/.test(line)) {
      target.push(line);
      continue;
    }
    if (!existing.has(line)) {
      target.push(line);
      existing.add(line);
    }
  }
}

export function classToAccessorName(className) {
  const parts = className.split('_');
  if (parts.length === 1) {
    return `${className[0].toLowerCase()}${className.slice(1)}`;
  }
  return `${parts[0].toLowerCase()}_${parts.slice(1).join('_')}`;
}

function stripInterfacePrefix(className) {
  return className.startsWith('I') ? className.slice(1) : className;
}

export function detectDomain(className) {
  if (className.startsWith('DMT_')) return 'DMT';
  if (className.startsWith('PCB_') || className.startsWith('IPCB_')) return 'PCB';
  if (className.startsWith('SCH_') || className.startsWith('ISCH_')) return 'SCH';
  if (className.startsWith('LIB_')) return 'LIB';
  if (className.startsWith('SYS_')) return 'SYS';
  return 'MISC';
}

export function detectDocumentType(className) {
  if (className.startsWith('PCB_') || className.startsWith('IPCB_')) {
    return 'PCB';
  }
  if (className.startsWith('SCH_') || className.startsWith('ISCH_')) {
    return 'SCHEMATIC_PAGE';
  }
  return null;
}

function isModuleEntry(item) {
  return item.memberType === 'method';
}

function findClassMethods(registry, className) {
  return registry.byClass.get(className) || [];
}

function classHasMethod(registry, className, memberName) {
  return findClassMethods(registry, className).some((item) => item.memberName === memberName);
}

function findModuleAccessor(item, registry) {
  const directAccessor = classToAccessorName(item.className);
  if (registry.edaAccessors.has(directAccessor)) {
    return `eda.${directAccessor}`;
  }
  const stripped = stripInterfacePrefix(item.className);
  const strippedAccessor = classToAccessorName(stripped);
  if (registry.edaAccessors.has(strippedAccessor)) {
    return `eda.${strippedAccessor}`;
  }
  return null;
}

function detectKind(item) {
  const name = item.memberName.toLowerCase();
  const description = `${item.description} ${item.remarks}`.toLowerCase();

  if (item.memberType === 'property') {
    return 'property';
  }
  if (name.startsWith('create') || name.startsWith('copy') || name.startsWith('add')) {
    return 'create';
  }
  if (name.startsWith('delete') || name.startsWith('remove') || name.startsWith('close')) {
    return 'delete';
  }
  if (
    name.startsWith('modify')
    || name.startsWith('set')
    || name.startsWith('move')
    || name.startsWith('rename')
    || name.startsWith('toggle')
    || name.startsWith('merge')
    || name.startsWith('reorder')
    || name.startsWith('activate')
    || name.startsWith('tile')
    || name.startsWith('zoom')
  ) {
    return 'update';
  }
  if (
    name.startsWith('show')
    || name.startsWith('open')
    || name.startsWith('register')
    || name.startsWith('unregister')
    || name.startsWith('emit')
  ) {
    return 'ui';
  }
  if (
    name.startsWith('get')
    || name.startsWith('find')
    || name.startsWith('search')
    || name.startsWith('list')
    || name.startsWith('check')
    || name.startsWith('export')
  ) {
    return 'query';
  }
  if (description.includes('事件') || name.includes('listener')) {
    return 'event';
  }
  return 'action';
}

function requiresProject(item) {
  if (item.className.startsWith('SYS_') || item.className.startsWith('LIB_')) {
    return false;
  }
  if (item.className === 'DMT_Team' || item.className === 'DMT_Workspace' || item.className === 'DMT_Folder') {
    return false;
  }
  if (item.className === 'DMT_Project') {
    return item.memberName !== 'createProject' && item.memberName !== 'getAllProjectsUuid' && item.memberName !== 'getProjectInfo';
  }
  return Boolean(detectDocumentType(item.className))
    || item.className.startsWith('DMT_');
}

function isHighRisk(item) {
  if (detectKind(item) === 'query') {
    return false;
  }
  const accessor = item.className;
  return accessor === 'DMT_Project'
    || accessor === 'DMT_Folder'
    || accessor === 'DMT_Workspace'
    || accessor === 'SYS_FileSystem'
    || accessor === 'SYS_FileManager'
    || accessor === 'SYS_Window'
    || accessor === 'SYS_WebSocket';
}

function pickTemplate(item, registry) {
  if (item.className.startsWith('IPCB_') || item.className.startsWith('ISCH_')) {
    if (item.memberName.startsWith('setState_') || item.memberName === 'done') {
      return 'selection-primitive-mutation';
    }
    return 'selection-primitive-read';
  }
  const kind = detectKind(item);
  if (kind === 'create') {
    if (classHasMethod(registry, item.className, 'delete')) {
      return 'create-with-cleanup';
    }
    return 'create-with-context';
  }
  if (kind === 'delete') {
    if (classHasMethod(registry, item.className, 'create')) {
      return 'delete-fixture';
    }
    return 'review-placeholder';
  }
  if (kind === 'ui') {
    return 'ui-action';
  }
  if (kind === 'query') {
    return item.signatures.some((signature) => /\w+Uuid/.test(signature) || /\btabId\b/.test(signature))
      ? 'query-by-identifier'
      : 'query-context';
  }
  if (kind === 'update') {
    if (classHasMethod(registry, item.className, 'create') && classHasMethod(registry, item.className, 'delete')) {
      return 'update-with-fixture';
    }
    return 'review-placeholder';
  }
  return 'review-placeholder';
}

function determineStatus(item, registry, templateName, moduleAccessor) {
  if (!isModuleEntry(item)) {
    return 'reference-only';
  }
  if (!moduleAccessor && !item.className.startsWith('IPCB_') && !item.className.startsWith('ISCH_')) {
    return 'needs-review';
  }
  if (isHighRisk(item)) {
    return 'needs-review';
  }
  if (templateName === 'review-placeholder') {
    return 'needs-review';
  }
  return 'ready';
}

function determineCleanupStrategy(item, templateName) {
  if (templateName === 'create-with-cleanup' || templateName === 'delete-fixture' || templateName === 'update-with-fixture') {
    return 'auto';
  }
  if (detectKind(item) === 'create' || detectKind(item) === 'delete' || detectKind(item) === 'update') {
    return 'manual';
  }
  return 'none';
}

function determineValidationMode(item, status, templateName) {
  if (status !== 'ready') {
    return 'manual';
  }
  if (
    (item.className === 'SYS_Message' && (item.memberName === 'showFollowMouseTip' || item.memberName === 'removeFollowMouseTip'))
    || (item.className === 'SYS_ShortcutKey' && item.memberName !== 'getShortcutKeys')
    || (item.className === 'SYS_FileManager' && item.memberName === 'getCbbFileByCbbUuid')
    || (item.className === 'SYS_FileManager' && [
      'getDocumentFile',
      'getDocumentFootprintSources',
      'getProjectFile',
      'getProjectFileByProjectUuid',
    ].includes(item.memberName))
    || (item.className === 'DMT_Team' && item.memberName === 'getAllInvolvedTeamInfo')
    || (item.className === 'SYS_FileSystem' && [
      'getDocumentsPath',
      'getEdaPath',
      'getLibrariesPaths',
      'getProjectsPaths',
      'listFilesOfFileSystem',
    ].includes(item.memberName))
    || (item.className === 'SCH_Netlist' && item.memberName === 'getNetlist')
    || (item.className === 'SCH_PrimitiveBus' && item.memberName === 'get')
    || (item.className === 'PCB_PrimitiveImage' && item.memberName === 'get')
    || (item.className === 'PCB_PrimitivePoured' && item.memberName === 'get')
    || (item.className === 'PCB_PrimitiveImage' && ['create', 'delete', 'modify'].includes(item.memberName))
    || (item.className === 'SCH_PrimitiveBus' && ['create', 'delete', 'modify'].includes(item.memberName))
    || (item.className === 'SCH_PrimitivePin' && item.memberName === 'create')
    || (item.className === 'LIB_3DModel' && item.memberName === 'modify')
    || (item.className === 'LIB_Cbb' && item.memberName === 'copy')
    || (item.className === 'LIB_Device' && item.memberName === 'copy')
    || (item.className === 'LIB_Footprint' && ['copy', 'create', 'modify'].includes(item.memberName))
    || (item.className === 'LIB_Symbol' && ['create', 'modify'].includes(item.memberName))
    || (item.className === 'SCH_PrimitiveComponent' && [
      'setNetFlagComponentUuid_AnalogGround',
      'setNetFlagComponentUuid_Ground',
      'setNetFlagComponentUuid_Power',
      'setNetFlagComponentUuid_ProtectGround',
      'setNetPortComponentUuid_BI',
      'setNetPortComponentUuid_IN',
      'setNetPortComponentUuid_OUT',
    ].includes(item.memberName))
    || (item.className === 'PCB_ManufactureData' && [
      'get3DFile',
      'getDxfFile',
      'getIdxFile',
      'getManufactureData',
    ].includes(item.memberName))
  ) {
    return 'manual';
  }
  if (templateName === 'selection-primitive-read' || templateName === 'selection-primitive-mutation') {
    return 'manual';
  }
  const kind = detectKind(item);
  if ((kind === 'create' || kind === 'delete' || kind === 'update')
    && determineCleanupStrategy(item, templateName) !== 'auto') {
    return 'manual';
  }
  if (kind === 'create' || kind === 'delete' || kind === 'update') {
    return 'mutating';
  }
  return 'safe';
}

function loadDefaultFixturesObject() {
  return {
    namingPrefix: '__codex_example__',
    librarySearchKeyword: 'STM32',
    panelLibrarySearchKeyword: 'A4',
    lcscIdSample: 'C5290014',
    uiMessage: 'Codex example running inside EasyEDA',
    pcb: {
      net: 'GND',
      lineLayer: 1,
      startX: 1000,
      startY: 1000,
      endX: 1600,
      endY: 1000,
      lineWidth: 10,
      viaX: 1200,
      viaY: 1200,
      holeDiameter: 20,
      viaDiameter: 40,
    },
    schematic: {
      x: 120,
      y: 80,
      endX: 200,
      endY: 80,
    },
  };
}

export async function loadFixtures(rootDir) {
  const fixturePath = path.join(rootDir, 'examples', 'fixtures', 'defaults.json');
  try {
    return JSON.parse(await readFile(fixturePath, 'utf8'));
  } catch {
    return loadDefaultFixturesObject();
  }
}

function addSearchSeed(setup, searchAccessor, query, itemVarName) {
  setup.push(`const ${itemVarName}Candidates = await ${searchAccessor}.search('${query}');`);
  setup.push(`const ${itemVarName}Item = ${itemVarName}Candidates?.[0];`);
}

function addFootprintSeed(setup, fixtures) {
  addSearchSeed(setup, 'eda.lib_Footprint', fixtures.librarySearchKeyword, 'footprint');
  setup.push('const footprintUuid = footprintItem?.uuid;');
  setup.push('const footprintLibraryUuid = footprintItem?.libraryUuid;');
}

function addSymbolSeed(setup, fixtures) {
  addSearchSeed(setup, 'eda.lib_Symbol', fixtures.librarySearchKeyword, 'symbol');
  setup.push('const symbolUuid = symbolItem?.uuid;');
  setup.push('const symbolLibraryUuid = symbolItem?.libraryUuid;');
}

function addPanelLibrarySeed(setup, fixtures) {
  addSearchSeed(setup, 'eda.lib_PanelLibrary', fixtures.panelLibrarySearchKeyword || 'A4', 'panelLibrary');
  setup.push('const panelLibraryUuid = panelLibraryItem?.uuid;');
  setup.push('const panelLibraryLibraryUuid = panelLibraryItem?.libraryUuid;');
}

function addDeviceSeed(setup, fixtures) {
  addSearchSeed(setup, 'eda.lib_Device', fixtures.librarySearchKeyword, 'device');
  setup.push('const deviceUuid = deviceItem?.uuid;');
  setup.push('const deviceLibraryUuid = deviceItem?.libraryUuid;');
}

function addClassificationSeed(setup, fixtures) {
  addFootprintSeed(setup, fixtures);
  setup.push('const classificationIndex = footprintItem?.classification;');
}

function addPrimitiveSeed(setup, item) {
  const strippedClassName = stripInterfacePrefix(item.className);
  let sourceAccessor = `eda.${classToAccessorName(strippedClassName)}`;
  if (strippedClassName === 'PCB_Primitive') {
    sourceAccessor = 'eda.pcb_PrimitiveLine';
  } else if (strippedClassName === 'SCH_Primitive') {
    sourceAccessor = 'eda.sch_PrimitiveWire';
  }
  const documentLabel = item.className.startsWith('SCH_') || item.className.startsWith('ISCH_')
    ? '原理图'
    : 'PCB';

  setup.push(`const primitiveIdCandidates = await ${sourceAccessor}.getAllPrimitiveId();`);
  setup.push('const primitiveId = Array.isArray(primitiveIdCandidates) ? primitiveIdCandidates[0] : undefined;');
  setup.push(`if (!primitiveId) { throw new Error('当前${documentLabel}文档里没有可用于演示的图元，先放一个对应类型的图元再运行这个案例。'); }`);
}

function chooseSignatureDetail(item) {
  const methodSignatures = item.signatureDetails.filter((detail) => detail.kind === 'method');
  return methodSignatures.find((detail) => !/\bextends\b/.test(detail.signature)) || methodSignatures[0] || { parameters: [] };
}

function renderDocumentAssertion(documentType) {
  const expectedValue = documentType === 'PCB' ? 3 : 1;
  return [
    'const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();',
    'if (!currentDocument) {',
    "  throw new Error('当前没有活动文档，先打开一个可操作的文档页。');",
    '}',
    `if (currentDocument.documentType !== ${expectedValue}) {`,
    `  throw new Error('当前文档类型不是 ${documentType}，请先切到 ${documentType === 'PCB' ? 'PCB' : '原理图图页'} 再运行这个案例。');`,
    '}',
  ];
}

function buildFixturePrimitiveSetup(item, fixtures) {
  const moduleAccessor = classToAccessorName(stripInterfacePrefix(item.className));
  const runtimeAccessor = `eda.${moduleAccessor}`;
  const pcbPolygonRectSource = `['R', ${fixtures.pcb.startX}, ${fixtures.pcb.startY}, 300, 200, 0, 0]`;
  const schPolyline = `[${fixtures.schematic.x}, ${fixtures.schematic.y}, ${fixtures.schematic.endX}, ${fixtures.schematic.y}, ${fixtures.schematic.endX}, ${fixtures.schematic.endY}]`;

  if (item.className.includes('PrimitiveLine')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  '${fixtures.pcb.net}',`,
        `  ${fixtures.pcb.lineLayer},`,
        `  ${fixtures.pcb.startX},`,
        `  ${fixtures.pcb.startY},`,
        `  ${fixtures.pcb.endX},`,
        `  ${fixtures.pcb.endY},`,
        `  ${fixtures.pcb.lineWidth},`,
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveVia')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  '${fixtures.pcb.net}',`,
        `  ${fixtures.pcb.viaX},`,
        `  ${fixtures.pcb.viaY},`,
        `  ${fixtures.pcb.holeDiameter},`,
        `  ${fixtures.pcb.viaDiameter},`,
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className === 'PCB_Primitive') {
    return buildFixturePrimitiveSetup({ ...item, className: 'PCB_PrimitiveLine' }, fixtures);
  }

  if (item.className === 'SCH_Primitive') {
    return buildFixturePrimitiveSetup({ ...item, className: 'SCH_PrimitiveWire' }, fixtures);
  }

  if (item.className.includes('PrimitiveArc') && item.className.startsWith('PCB_')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  '${fixtures.pcb.net}',`,
        `  ${fixtures.pcb.lineLayer},`,
        `  ${fixtures.pcb.startX},`,
        `  ${fixtures.pcb.startY},`,
        `  ${fixtures.pcb.endX},`,
        `  ${fixtures.pcb.endY},`,
        '  90,',
        `  ${fixtures.pcb.lineWidth},`,
        '  undefined,',
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveDimension')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        "  'Length Dimension',",
        `  [${fixtures.pcb.startX}, ${fixtures.pcb.startY}, ${fixtures.pcb.startX}, ${fixtures.pcb.startY + 150}, ${fixtures.pcb.endX}, ${fixtures.pcb.startY + 150}, ${fixtures.pcb.endX}, ${fixtures.pcb.startY}],`,
        '  undefined,',
        "  'mil',",
        `  ${fixtures.pcb.lineWidth},`,
        '  2,',
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitivePad')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.pcb.lineLayer},`,
        "  '1',",
        `  ${fixtures.pcb.viaX},`,
        `  ${fixtures.pcb.viaY},`,
        '  0,',
        "  ['ELLIPSE', 60, 60],",
        `  '${fixtures.pcb.net}',`,
        '  null,',
        '  undefined,',
        '  undefined,',
        '  undefined,',
        '  true,',
        '  undefined,',
        '  undefined,',
        '  null,',
        '  null,',
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveObject')) {
    return {
      setup: [
        "const fixtureBinaryData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pF7sAAAAASUVORK5CYII=';",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        '  3,',
        `  ${fixtures.pcb.viaX},`,
        `  ${fixtures.pcb.viaY},`,
        '  fixtureBinaryData,',
        '  100,',
        '  100,',
        '  0,',
        '  false,',
        "  'codex-dot.png',",
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitivePolyline')) {
    return {
      setup: [
        `const fixturePolygon = eda.pcb_MathPolygon.createPolygon(${pcbPolygonRectSource});`,
        "if (!fixturePolygon) { throw new Error('无法创建用于案例演示的测试多边形。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  '${fixtures.pcb.net}',`,
        `  ${fixtures.pcb.lineLayer},`,
        '  fixturePolygon,',
        `  ${fixtures.pcb.lineWidth},`,
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveRegion')) {
    return {
      setup: [
        `const fixturePolygon = eda.pcb_MathPolygon.createPolygon(${pcbPolygonRectSource});`,
        "if (!fixturePolygon) { throw new Error('无法创建用于案例演示的测试多边形。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.pcb.lineLayer},`,
        '  fixturePolygon,',
        '  undefined,',
        '  fixtureName,',
        `  ${fixtures.pcb.lineWidth},`,
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveFill')) {
    return {
      setup: [
        `const fixturePolygon = eda.pcb_MathPolygon.createPolygon(${pcbPolygonRectSource});`,
        "if (!fixturePolygon) { throw new Error('无法创建用于案例演示的测试多边形。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.pcb.lineLayer},`,
        '  fixturePolygon,',
        `  '${fixtures.pcb.net}',`,
        '  undefined,',
        `  ${fixtures.pcb.lineWidth},`,
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className === 'PCB_PrimitivePour') {
    return {
      setup: [
        `const fixturePolygon = eda.pcb_MathPolygon.createPolygon(${pcbPolygonRectSource});`,
        "if (!fixturePolygon) { throw new Error('无法创建用于案例演示的测试多边形。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  '${fixtures.pcb.net}',`,
        `  ${fixtures.pcb.lineLayer},`,
        '  fixturePolygon,',
        '  undefined,',
        '  false,',
        '  fixtureName,',
        '  1,',
        `  ${fixtures.pcb.lineWidth},`,
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveComponent') && item.className.startsWith('PCB_')) {
    return {
      setup: [
        `const deviceCandidates = await eda.lib_Device.search('${fixtures.librarySearchKeyword}');`,
        'const deviceItem = deviceCandidates?.[0];',
        "if (!deviceItem?.uuid || !deviceItem?.libraryUuid) { throw new Error('没有找到可用于 PCB 器件创建的库器件样本。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        '  { libraryUuid: deviceItem.libraryUuid, uuid: deviceItem.uuid },',
        `  ${fixtures.pcb.lineLayer},`,
        `  ${fixtures.pcb.viaX},`,
        `  ${fixtures.pcb.viaY},`,
        '  0,',
        '  false,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveWire')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  [${fixtures.schematic.x}, ${fixtures.schematic.y}, ${fixtures.schematic.endX}, ${fixtures.schematic.endY}],`,
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className === 'SCH_PrimitiveAttribute') {
    return {
      setup: [
        `const deviceCandidates = await eda.lib_Device.search('${fixtures.librarySearchKeyword}');`,
        'const deviceItem = deviceCandidates?.[0];',
        "if (!deviceItem?.uuid || !deviceItem?.libraryUuid) { throw new Error('没有找到可用于原理图属性读取的库器件样本。'); }",
        'const createdComponent = await eda.sch_PrimitiveComponent.create(',
        '  { libraryUuid: deviceItem.libraryUuid, uuid: deviceItem.uuid },',
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  undefined,',
        '  0,',
        '  false,',
        '  true,',
        '  true,',
        ');',
        'const componentPrimitiveId = createdComponent?.getState_PrimitiveId?.() ?? createdComponent?.primitiveId ?? createdComponent?.id;',
        "if (!componentPrimitiveId) { throw new Error('没有创建出可用于属性读取的测试器件。'); }",
        'const attributeItems = await eda.sch_PrimitiveAttribute.getAll(componentPrimitiveId);',
        'const createdPrimitive = Array.isArray(attributeItems) ? attributeItems[0] : undefined;',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: 'if (componentPrimitiveId) { await eda.sch_PrimitiveComponent.delete([componentPrimitiveId]); }',
      objectExpression: 'createdPrimitive',
      usesTargetCreate: false,
    };
  }

  if (item.className.includes('PrimitiveArc') && item.className.startsWith('SCH_')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        `  ${fixtures.schematic.x + 40},`,
        `  ${fixtures.schematic.y + 20},`,
        `  ${fixtures.schematic.endX},`,
        `  ${fixtures.schematic.endY},`,
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveBus')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        "  'BUS0',",
        `  ${schPolyline},`,
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveCircle')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  30,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className === 'SCH_PrimitivePin') {
    return {
      setup: [
        `const deviceCandidates = await eda.lib_Device.search('${fixtures.librarySearchKeyword}');`,
        'const deviceItem = deviceCandidates?.[0];',
        "if (!deviceItem?.uuid || !deviceItem?.libraryUuid) { throw new Error('没有找到可用于原理图引脚读取的库器件样本。'); }",
        'const createdComponent = await eda.sch_PrimitiveComponent.create(',
        '  { libraryUuid: deviceItem.libraryUuid, uuid: deviceItem.uuid },',
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  undefined,',
        '  0,',
        '  false,',
        '  true,',
        '  true,',
        ');',
        'const componentPrimitiveId = createdComponent?.getState_PrimitiveId?.() ?? createdComponent?.primitiveId ?? createdComponent?.id;',
        "if (!componentPrimitiveId) { throw new Error('没有创建出可用于引脚读取的测试器件。'); }",
        'const pinItems = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(componentPrimitiveId);',
        'const createdPrimitive = Array.isArray(pinItems) ? pinItems[0] : undefined;',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: 'if (componentPrimitiveId) { await eda.sch_PrimitiveComponent.delete([componentPrimitiveId]); }',
      objectExpression: 'createdPrimitive',
      usesTargetCreate: false,
    };
  }

  if (item.className.includes('PrimitivePin')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        "  '1',",
        "  'P1',",
        '  0,',
        '  100,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitivePolygon')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${schPolyline},`,
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveRectangle')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  60,',
        '  40,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveText')) {
    return {
      setup: [
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  fixtureName,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  if (item.className.includes('PrimitiveComponent') && item.className.startsWith('SCH_')) {
    return {
      setup: [
        `const deviceCandidates = await eda.lib_Device.search('${fixtures.librarySearchKeyword}');`,
        'const deviceItem = deviceCandidates?.[0];',
        "if (!deviceItem?.uuid || !deviceItem?.libraryUuid) { throw new Error('没有找到可用于原理图器件创建的库器件样本。'); }",
        `const createdPrimitive = await ${runtimeAccessor}.create(`,
        '  { libraryUuid: deviceItem.libraryUuid, uuid: deviceItem.uuid },',
        `  ${fixtures.schematic.x},`,
        `  ${fixtures.schematic.y},`,
        '  undefined,',
        '  0,',
        '  false,',
        '  true,',
        '  true,',
        ');',
      ],
      idExpression: 'createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id',
      cleanup: `if (primitiveId) { await ${runtimeAccessor}.delete([primitiveId]); }`,
      objectExpression: 'createdPrimitive',
    };
  }

  return null;
}

function resolveParameter(item, parameter, context) {
  const name = parameter.name;
  const lower = name.toLowerCase();
  const type = parameter.type;
  const setup = [];
  let expression = null;
  let note = null;

  if (lower === 'projectfriendlyname') {
    expression = 'fixtureName';
  } else if (lower === 'projectname') {
    expression = 'fixtureSlug';
  } else if (lower === 'lcscids') {
    expression = type.startsWith('Array<')
      ? `['${context.fixtures.lcscIdSample || 'C5290014'}']`
      : `'${context.fixtures.lcscIdSample || 'C5290014'}'`;
    note = 'LCSC 编号案例默认使用一个真实编号样本，便于你直接替换成自己的料号。';
  } else if (lower === 'shortcutkey') {
    expression = "['CONTROL', 'SHIFT', 'G']";
    note = '快捷键案例默认使用 Ctrl+Shift+G 这一组按键，便于开发者直接替换成自己的组合。';
  } else if (lower === 'allowmultimatch') {
    expression = 'false';
  } else if (lower === 'callbackfn') {
    expression = "async (shortcutKey) => { await eda.sys_Message.showToastMessage('Shortcut fired: ' + shortcutKey.join('+')); }";
  } else if (lower === 'description') {
    expression = "'Generated by Codex example verification'";
  } else if (lower === 'message' || lower === 'tip' || lower === 'buttontitle') {
    expression = `'${context.fixtures.uiMessage}'`;
  } else if (lower === 'net') {
    expression = `'${context.fixtures.pcb.net}'`;
  } else if (lower === 'layer') {
    expression = `${context.fixtures.pcb.lineLayer}`;
  } else if (lower === 'startx') {
    expression = `${context.fixtures.pcb.startX}`;
  } else if (lower === 'starty') {
    expression = `${context.fixtures.pcb.startY}`;
  } else if (lower === 'endx') {
    expression = `${context.fixtures.pcb.endX}`;
  } else if (lower === 'endy') {
    expression = `${context.fixtures.pcb.endY}`;
  } else if (lower === 'linewidth') {
    expression = `${context.fixtures.pcb.lineWidth}`;
  } else if (lower === 'x') {
    expression = context.item.className.startsWith('SCH_') || context.item.className.startsWith('ISCH_')
      ? `${context.fixtures.schematic.x}`
      : `${context.fixtures.pcb.viaX}`;
  } else if (lower === 'y') {
    expression = context.item.className.startsWith('SCH_') || context.item.className.startsWith('ISCH_')
      ? `${context.fixtures.schematic.y}`
      : `${context.fixtures.pcb.viaY}`;
  } else if (lower === 'holediameter') {
    expression = `${context.fixtures.pcb.holeDiameter}`;
  } else if (lower === 'diameter') {
    expression = `${context.fixtures.pcb.viaDiameter}`;
  } else if (lower === 'primitivelock') {
    expression = 'false';
  } else if (lower === 'strict') {
    expression = 'true';
  } else if (lower === 'userinterface') {
    expression = 'false';
  } else if (lower === 'includeverboseerror') {
    expression = 'false';
  } else if (lower === 'mstimeout' || lower === 'timer') {
    expression = '1500';
  } else if (lower === 'bottompanel') {
    expression = 'false';
  } else if (lower === 'buttoncallbackfn') {
    expression = 'undefined';
  } else if (lower === 'rotation') {
    expression = '0';
  } else if (lower === 'mirror') {
    expression = 'false';
  } else if (lower === 'addintobom' || lower === 'addintopcb' || lower === 'zoom') {
    expression = 'true';
  } else if (lower === 'documenttype' && context.item.className === 'SYS_ShortcutKey') {
    expression = '[ESYS_ShortcutKeyEffectiveEditorDocumentType.PCB]';
  } else if (lower === 'scene' && context.item.className === 'SYS_ShortcutKey') {
    expression = '[ESYS_ShortcutKeyEffectiveEditorScene.SELECT_CANVAS]';
  } else if (lower === 'subpartname' || lower === 'boardname' || lower === 'schematicpagename' || lower === 'schematicname' || lower === 'pcbname' || lower === 'panelname') {
    expression = 'fixtureName';
  } else if (lower === 'documentuuid' && context.item.className === 'DMT_EditorControl' && context.item.memberName === 'openDocument') {
    setup.push('const currentProject = await eda.dmt_Project.getCurrentProjectInfo();');
    setup.push('const projectDocumentUuid = currentProject?.data?.[0]?.schematic?.page?.[0]?.uuid ?? currentProject?.data?.[0]?.pcb?.uuid;');
    expression = 'projectDocumentUuid';
    note = '打开文档案例会优先复用当前工程里的第一张原理图页，避免传入无效 UUID。';
  } else if (lower === 'tabid') {
    setup.push('const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();');
    setup.push('const tabId = currentDocument?.tabId;');
    expression = 'tabId';
    note = '案例会优先使用当前活动标签页。';
  } else if (lower === 'splitscreenid') {
    setup.push('const currentDocument = await eda.dmt_SelectControl.getCurrentDocumentInfo();');
    setup.push('const splitScreenId = currentDocument?.tabId ? await eda.dmt_EditorControl.getSplitScreenIdByTabId(currentDocument.tabId) : undefined;');
    expression = 'splitScreenId';
  } else if (lower === 'teamuuid') {
    setup.push('const teams = await eda.dmt_Team.getAllTeamsInfo();');
    setup.push('const teamUuid = teams?.[0]?.uuid;');
    expression = 'teamUuid';
  } else if (lower === 'workspaceuuid') {
    setup.push('const workspaces = await eda.dmt_Workspace.getAllWorkspacesInfo();');
    setup.push('const workspaceUuid = workspaces?.[0]?.uuid;');
    expression = 'workspaceUuid';
  } else if (lower === 'folderuuid') {
    setup.push('const teams = await eda.dmt_Team.getAllTeamsInfo();');
    setup.push('const teamUuid = teams?.[0]?.uuid;');
    setup.push("if (!teamUuid) { throw new Error('当前账号下没有可用团队，无法解析 folderUuid。'); }");
    setup.push('const folderCandidates = await eda.dmt_Folder.getAllFoldersUuid(teamUuid);');
    setup.push('const folderUuid = folderCandidates?.[0];');
    expression = 'folderUuid';
  } else if (lower === 'projectuuid') {
    setup.push('const currentProject = await eda.dmt_Project.getCurrentProjectInfo();');
    setup.push('const projectUuid = currentProject?.uuid;');
    expression = 'projectUuid';
    note = '案例优先使用当前打开工程的 UUID。';
  } else if (lower === 'schematicuuid') {
    setup.push('const schematics = await eda.dmt_Schematic.getAllSchematicsInfo();');
    setup.push('const schematicUuid = schematics?.[0]?.uuid;');
    expression = 'schematicUuid';
  } else if (lower === 'schematicpageuuid') {
    setup.push('const schematicPages = await eda.dmt_Schematic.getAllSchematicPagesInfo();');
    setup.push('const schematicPageUuid = schematicPages?.[0]?.uuid;');
    expression = 'schematicPageUuid';
  } else if (lower === 'pcbuuid') {
    setup.push('const pcbs = await eda.dmt_Pcb.getAllPcbsInfo();');
    setup.push('const pcbUuid = pcbs?.[0]?.uuid;');
    expression = 'pcbUuid';
  } else if (lower === 'paneluuid') {
    setup.push('const panels = await eda.dmt_Panel.getAllPanelsInfo();');
    setup.push('const panelUuid = panels?.[0]?.uuid;');
    expression = 'panelUuid';
  } else if (lower === 'primitiveid') {
    if (!context.options?.preferFixturePrimitive) {
      addPrimitiveSeed(setup, context.item);
    }
    expression = 'primitiveId';
    note = '案例会先从当前文档里取一个真实图元 ID，再调用目标接口，方便你理解这类读取 API 的入参来源。';
  } else if (lower === 'primitiveids') {
    if (!context.options?.preferFixturePrimitive) {
      addPrimitiveSeed(setup, context.item);
    }
    expression = type.startsWith('Array<') || type.startsWith('[') ? '[primitiveId]' : 'primitiveId';
    note = '案例会先从当前文档里取一个真实图元 ID，再调用目标接口，方便你理解这类读取 API 的入参来源。';
  } else if (lower === 'query' || lower === 'keyword') {
    expression = `'${context.fixtures.librarySearchKeyword}'`;
  } else if (lower === 'libraryuuid') {
    if (context.item.className === 'DMT_EditorControl' && context.item.memberName === 'openLibraryDocument') {
      addSymbolSeed(setup, context.fixtures);
      expression = 'symbolLibraryUuid';
      note = '打开库文档案例默认用符号搜索结果作为可运行样本。';
    } else if (context.item.className === 'LIB_Footprint') {
      addFootprintSeed(setup, context.fixtures);
      expression = 'footprintLibraryUuid';
    } else if (context.item.className === 'LIB_Symbol') {
      addSymbolSeed(setup, context.fixtures);
      expression = 'symbolLibraryUuid';
    } else if (context.item.className === 'LIB_PanelLibrary') {
      addPanelLibrarySeed(setup, context.fixtures);
      expression = 'panelLibraryLibraryUuid';
    } else if (context.item.className === 'LIB_Device') {
      if (context.item.memberName === 'getByLcscIds') {
        expression = 'undefined';
      } else {
        addDeviceSeed(setup, context.fixtures);
        expression = 'deviceLibraryUuid';
      }
    } else {
      setup.push('const libraries = await eda.lib_LibrariesList.getAllLibrariesList();');
      setup.push('const libraryUuid = libraries?.[0]?.uuid;');
      expression = 'libraryUuid';
    }
  } else if (lower === 'deviceuuid') {
    addDeviceSeed(setup, context.fixtures);
    expression = 'deviceUuid';
  } else if (lower === 'uuid' && context.item.className === 'DMT_EditorControl' && context.item.memberName === 'openLibraryDocument') {
    addSymbolSeed(setup, context.fixtures);
    expression = 'symbolUuid';
  } else if (lower === 'symboluuid') {
    addSymbolSeed(setup, context.fixtures);
    expression = 'symbolUuid';
  } else if (lower === 'footprintuuid') {
    addFootprintSeed(setup, context.fixtures);
    expression = 'footprintUuid';
  } else if (lower === 'panellibraryuuid') {
    addPanelLibrarySeed(setup, context.fixtures);
    expression = 'panelLibraryUuid';
  } else if (lower === 'librarytype' && context.item.className === 'DMT_EditorControl' && context.item.memberName === 'openLibraryDocument') {
    expression = "'2'";
    note = '这里直接使用库类型字符串值 `"2"`，对应 `ELIB_LibraryType.SYMBOL`，避免依赖运行时未暴露的枚举对象。';
  } else if (lower === 'classificationindex') {
    addClassificationSeed(setup, context.fixtures);
    expression = 'classificationIndex';
    note = '分类索引案例会先从一个真实搜索结果里提取 classification 字段，再调用目标 API。';
  } else if (lower === 'cbbuuid') {
    expression = "'cbbUuid'";
    note = '当前工作区不一定能搜索到可用的复用模块样本，运行前请先替换成真实 cbbUuid。';
  } else if (type.includes('boolean')) {
    expression = parameter.optional ? 'undefined' : 'false';
  } else if (type.includes('number')) {
    expression = parameter.optional ? 'undefined' : '0';
  } else if (type.includes('string')) {
    expression = parameter.optional ? 'undefined' : `'${name}'`;
  } else if (type.startsWith('Array<') || type.startsWith('[')) {
    expression = '[]';
  } else if (type.includes('null')) {
    expression = 'null';
  } else if (/^E[A-Z0-9_]+/.test(type)) {
    expression = 'undefined';
    note = `这个参数是枚举类型 ${type}，生成器先给出最保守的占位值，使用前建议结合对应枚举文档细化。`;
  }

  return { setup, expression, note };
}

function buildArguments(item, fixtures, options = {}) {
  const setupLines = [];
  const notes = [];
  const context = { item, fixtures, options };
  const signature = chooseSignatureDetail(item);
  const expressions = [];

  for (const parameter of signature.parameters) {
    const resolution = resolveParameter(item, parameter, context);
    setupLines.push(...resolution.setup);
    expressions.push(resolution.expression ?? 'undefined');
    if (resolution.note) {
      notes.push(resolution.note);
    }
  }

  return {
    setupLines: unique(setupLines),
    expressions,
    notes: unique(notes),
  };
}

function canRenderQueryWithFixture(item) {
  const parameterNames = chooseSignatureDetail(item).parameters.map((parameter) => parameter.name.toLowerCase());
  if (parameterNames.includes('primitiveid') || parameterNames.includes('primitiveids')) {
    return Boolean(buildFixturePrimitiveSetup(item, loadDefaultFixturesObject()));
  }
  return item.memberName === 'getPrimitivesBBox'
    && (item.className === 'PCB_Primitive' || item.className === 'SCH_Primitive');
}

function createFixtureUsageAllowedForCreate(item, fixtureSetup) {
  if (!fixtureSetup) {
    return false;
  }
  return fixtureSetup.usesTargetCreate !== false;
}

function buildModifyFixtureProperty(item, fixtures) {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pF7sAAAAASUVORK5CYII=';
  const pcbPolygonRectSource = `['R', ${fixtures.pcb.startX + 40}, ${fixtures.pcb.startY + 40}, 260, 180, 0, 0]`;
  const schPolyline = `[${fixtures.schematic.x}, ${fixtures.schematic.y}, ${fixtures.schematic.endX}, ${fixtures.schematic.y + 30}, ${fixtures.schematic.endX + 40}, ${fixtures.schematic.endY + 40}]`;
  const builders = {
    PCB_PrimitiveArc: {
      entries: [
        ['arcAngle', '120'],
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
      ],
    },
    PCB_PrimitiveDimension: {
      entries: [
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
        ['precision', '3'],
      ],
    },
    PCB_PrimitiveFill: {
      entries: [
        ['net', `'${fixtures.pcb.net}_MOD'`],
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
      ],
    },
    PCB_PrimitiveLine: {
      entries: [
        ['endX', `${fixtures.pcb.endX + 120}`],
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
      ],
    },
    PCB_PrimitiveObject: {
      entries: [
        ['topLeftX', `${fixtures.pcb.viaX + 80}`],
        ['topLeftY', `${fixtures.pcb.viaY + 80}`],
        ['fileName', "fixtureName + '-updated.png'"],
      ],
    },
    PCB_PrimitivePolyline: {
      entries: [
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
      ],
    },
    PCB_PrimitivePour: {
      entries: [
        ['pourName', "fixtureName + '_updated'"],
        ['pourPriority', '2'],
      ],
    },
    PCB_PrimitiveRegion: {
      entries: [
        ['regionName', "fixtureName + '_updated'"],
        ['lineWidth', `${fixtures.pcb.lineWidth + 2}`],
      ],
    },
    PCB_PrimitiveVia: {
      entries: [
        ['x', `${fixtures.pcb.viaX + 60}`],
        ['y', `${fixtures.pcb.viaY + 60}`],
        ['diameter', `${fixtures.pcb.viaDiameter + 10}`],
      ],
    },
    SCH_PrimitiveArc: {
      entries: [
        ['endX', `${fixtures.schematic.endX + 30}`],
        ['endY', `${fixtures.schematic.endY + 30}`],
      ],
    },
    SCH_PrimitiveCircle: {
      entries: [
        ['radius', '40'],
      ],
    },
    SCH_PrimitivePin: {
      entries: [
        ['pinNumber', "'99'"],
      ],
    },
    SCH_PrimitivePolygon: {
      entries: [
        ['line', schPolyline],
      ],
    },
    SCH_PrimitiveRectangle: {
      entries: [
        ['width', '90'],
        ['height', '60'],
      ],
    },
    SCH_PrimitiveText: {
      entries: [
        ['x', `${fixtures.schematic.x + 20}`],
        ['y', `${fixtures.schematic.y + 20}`],
        ['content', "fixtureName + '_updated'"],
      ],
    },
    SCH_PrimitiveWire: {
      entries: [
        ['line', `[${fixtures.schematic.x}, ${fixtures.schematic.y}, ${fixtures.schematic.endX}, ${fixtures.schematic.endY + 20}]`],
      ],
    },
  };

  const builder = builders[item.className];
  if (!builder?.entries?.length) {
    return null;
  }

  return {
    setup: builder.setup || [],
    lines: builder.entries.map(([name, expression]) => `${name}: ${expression}`),
  };
}

function renderCreateWithCleanup(item, meta) {
  const fixtureSetup = createFixtureUsageAllowedForCreate(item, buildFixturePrimitiveSetup(item, meta.fixtures))
    ? buildFixturePrimitiveSetup(item, meta.fixtures)
    : null;
  if (fixtureSetup && meta.requiresDocumentType) {
    return {
      notes: ['创建案例会复用一套已验证可运行的夹具参数，确保开发者拿到的示例能直接在 EasyEDA 里跑通。'],
      code: [
        'return await (async function(eda) {',
        `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
        ...renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`),
        ...fixtureSetup.setup.map((line) => `  ${line}`),
        `  const primitiveId = ${fixtureSetup.idExpression};`,
        "  if (!primitiveId) { throw new Error('没有创建出可用于演示的测试图元。'); }",
        '  try {',
        '    return {',
        '      fixtureName,',
        '      created: createdPrimitive,',
        "      cleanupStrategy: 'auto',",
        '    };',
        '  } finally {',
        `    ${fixtureSetup.cleanup}`,
        '  }',
        '})(eda);',
      ].join('\n'),
    };
  }

  const { setupLines, expressions, notes } = buildArguments(item, meta.fixtures);
  const cleanupLines = [
    'const primitiveId = created?.getState_PrimitiveId?.() ?? created?.primitiveId ?? created?.id;',
    'if (primitiveId) {',
    `  await ${meta.moduleAccessor}.delete([primitiveId]);`,
    '}',
  ];
  return {
    notes,
    code: [
      'return await (async function(eda) {',
      `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
      "  const fixtureSlug = fixtureName.toLowerCase().replace(/[^a-z0-9]+/g, '-');",
      ...setupLines.map((line) => `  ${line}`),
      `  const created = await ${meta.moduleAccessor}.${item.memberName}(${expressions.join(', ')});`,
      ...cleanupLines.map((line) => `  ${line}`),
      "  return {",
      "    fixtureName,",
      "    created,",
      "    cleanupStrategy: 'auto',",
      '  };',
      '})(eda);',
    ].filter(Boolean).join('\n'),
  };
}

function renderQuery(item, meta) {
  const fixtureSetup = canRenderQueryWithFixture(item)
    ? buildFixturePrimitiveSetup(item, meta.fixtures)
    : null;
  const { setupLines, expressions, notes } = buildArguments(item, meta.fixtures, {
    preferFixturePrimitive: Boolean(fixtureSetup),
  });
  const lines = [
    'return await (async function(eda) {',
    `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
  ];

  if (item.className === 'DMT_Team' && item.memberName === 'getCurrentTeamInfo') {
    appendUniqueLines(lines, [
      '  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();',
      '  let result;',
      '  let apiError = null;',
      '  try {',
      '    result = await eda.dmt_Team.getCurrentTeamInfo();',
      '  } catch (error) {',
      '    apiError = error?.message ?? String(error);',
      '  }',
      '  const allTeams = await eda.dmt_Team.getAllTeamsInfo();',
      '  return {',
      '    fixtureName,',
      '    currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,',
      '    result,',
      '    apiError,',
      '    fallbackTeam: allTeams?.[0] ?? null,',
      '    fallbackTeamCount: Array.isArray(allTeams) ? allTeams.length : null,',
      "    explanation: result ? '已获取到当前焦点工程关联的团队信息。' : '当前没有可判定的焦点团队时，案例会额外返回团队列表中的第一个团队作为理解返回结构的参考。',",
      '  };',
      '})(eda);',
    ]);
    return {
      notes: unique([
        '如果当前焦点不在某个工程文档上，`getCurrentTeamInfo()` 可能返回空或直接抛错，所以案例额外补了 `getAllTeamsInfo()` 作为兜底参考。',
        ...notes,
      ]),
      code: lines.join('\n'),
    };
  }

  if (meta.requiresProject) {
    appendUniqueLines(lines, [
      '  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();',
      "  if (!currentProject) { throw new Error('当前没有打开工程，先打开一个工程再运行这个案例。'); }",
    ]);
  }
  if (item.className === 'DMT_Schematic' && item.memberName === 'getCurrentSchematicAllSchematicPagesInfo') {
    appendUniqueLines(lines, [
      '  const activeSchematicPageUuid = currentProject?.data?.[0]?.schematic?.page?.[0]?.uuid;',
      '  if (activeSchematicPageUuid) { await eda.dmt_EditorControl.openDocument(activeSchematicPageUuid); }',
    ]);
  }
  if (meta.requiresDocumentType) {
    appendUniqueLines(lines, renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`));
  }
  if (fixtureSetup) {
    lines.push(...fixtureSetup.setup.map((line) => `  ${line}`));
    lines.push(`  const primitiveId = ${fixtureSetup.idExpression};`);
    lines.push("  if (!primitiveId) { throw new Error('没有创建出可用于查询的测试图元。'); }");
  }
  if (setupLines.length) {
    appendUniqueLines(lines, setupLines.map((line) => `  ${line}`));
  }
  if (fixtureSetup) {
    lines.push('  try {');
    lines.push(`    const result = await ${meta.moduleAccessor}.${item.memberName}(${expressions.join(', ')});`);
    lines.push('    return {');
    lines.push('      fixtureName,');
    if (meta.requiresProject) {
      lines.push("      currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,");
    }
    if (meta.requiresDocumentType) {
      lines.push('      currentDocumentType: currentDocument?.documentType ?? null,');
    }
    lines.push('      result,');
    lines.push("      cleanupStrategy: 'auto',");
    lines.push('    };');
    lines.push('  } finally {');
    lines.push(`    ${fixtureSetup.cleanup}`);
    lines.push('  }');
  } else {
    lines.push(`  const result = await ${meta.moduleAccessor}.${item.memberName}(${expressions.join(', ')});`);
    lines.push('  return {');
    lines.push('    fixtureName,');
    if (meta.requiresProject) {
      lines.push("    currentProject: currentProject?.friendlyName ?? currentProject?.name ?? currentProject?.uuid ?? null,");
    }
    if (meta.requiresDocumentType) {
      lines.push('    currentDocumentType: currentDocument?.documentType ?? null,');
    }
    lines.push('    result,');
    lines.push('  };');
  }
  lines.push('})(eda);');

  return {
    notes: fixtureSetup
      ? unique(['这个查询案例会先临时创建一个图元夹具，读取完成后再自动清理，避免依赖当前工程里预先存在的对象。', ...notes])
      : notes,
    code: lines.join('\n'),
  };
}

function renderUiAction(item, meta) {
  const { setupLines, expressions, notes } = buildArguments(item, meta.fixtures);
  const lines = [
    'return await (async function(eda) {',
    `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
  ];
  appendUniqueLines(lines, setupLines.map((line) => `  ${line}`));
  lines.push(`  const result = await ${meta.moduleAccessor}.${item.memberName}(${expressions.join(', ')});`);
  lines.push('  return { fixtureName, result };');
  lines.push('})(eda);');
  return {
    notes,
    code: lines.join('\n'),
  };
}

function renderSelectionPrimitive(item, meta, mutate = false) {
  const { setupLines, expressions, notes } = buildArguments(item, meta.fixtures);
  const sourceClass = stripInterfacePrefix(item.className);
  const moduleAccessor = `eda.${classToAccessorName(sourceClass)}`;
  const primitiveLabel = meta.requiresDocumentType === 'PCB' ? 'PCB' : '原理图';
  const selectionAccessor = meta.requiresDocumentType === 'PCB'
    ? 'eda.pcb_SelectControl.getAllSelectedPrimitives_PrimitiveId()'
    : 'eda.sch_SelectControl.getAllSelectedPrimitives_PrimitiveId()';

  const lines = [
    'return await (async function(eda) {',
    `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
    ...renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`),
    `  const selectedPrimitiveIds = ${selectionAccessor};`,
    '  const primitiveId = Array.isArray(selectedPrimitiveIds) ? selectedPrimitiveIds[0] : undefined;',
    '  if (!primitiveId) {',
    `    throw new Error('请先在${primitiveLabel}画布上选中一个与 ${item.className} 匹配的图元，再运行这个案例。');`,
    '  }',
    `  const fetched = await ${moduleAccessor}.get([primitiveId]);`,
    '  const primitive = Array.isArray(fetched) ? fetched[0] : fetched;',
    "  if (!primitive) { throw new Error('没有取到目标图元对象。'); }",
  ];
  appendUniqueLines(lines, setupLines.map((line) => `  ${line}`));

  if (mutate && item.memberName !== 'done') {
    const stateName = item.memberName.replace(/^setState_/, '');
    const setterValue = expressions[0] ?? 'before ?? 0';
    lines.push('  const editable = primitive.toAsync ? primitive.toAsync() : primitive;');
    lines.push(`  const before = editable.getState_${stateName} ? editable.getState_${stateName}() : undefined;`);
    lines.push(`  editable.${item.memberName}(${setterValue});`);
    lines.push('  if (editable.done) { editable.done(); }');
    lines.push(`  const afterFetch = await ${moduleAccessor}.get([primitiveId]);`);
    lines.push('  const afterPrimitive = Array.isArray(afterFetch) ? afterFetch[0] : afterFetch;');
    lines.push(`  const after = afterPrimitive?.getState_${stateName} ? afterPrimitive.getState_${stateName}() : undefined;`);
    lines.push('  return { fixtureName, primitiveId, before, after };');
  } else if (item.memberName === 'done') {
    lines.push('  const editable = primitive.toAsync ? primitive.toAsync() : primitive;');
    lines.push('  if (!editable.done) { throw new Error("当前图元对象没有 done 方法。"); }');
    lines.push('  editable.done();');
    lines.push('  return { fixtureName, primitiveId, applied: true };');
  } else {
    lines.push(`  const result = await primitive.${item.memberName}(${expressions.join(', ')});`);
    lines.push('  return { fixtureName, primitiveId, result };');
  }
  lines.push('})(eda);');

  return {
    notes: unique(['这类接口实例通常来自当前选中的图元对象，因此自动验证默认走 manual 模式。', ...notes]),
    code: lines.join('\n'),
  };
}

function renderReviewPlaceholder(item, meta) {
  const { setupLines, expressions, notes } = buildArguments(item, meta.fixtures);
  const lines = [
    'return await (async function(eda) {',
    `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
  ];
  if (meta.requiresProject) {
    appendUniqueLines(lines, [
      '  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();',
      "  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }",
    ]);
  }
  if (meta.requiresDocumentType) {
    appendUniqueLines(lines, renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`));
  }
  appendUniqueLines(lines, setupLines.map((line) => `  ${line}`));
  lines.push(`  const result = await ${meta.moduleAccessor || 'eda /* 请手动补充访问路径 */'}.${item.memberName}(${expressions.join(', ')});`);
  lines.push('  return { fixtureName, result, needsReview: true };');
  lines.push('})(eda);');

  return {
    notes: unique([
      '这个案例由生成器自动补齐为可读草稿，但当前仍建议结合对应类文档做人工复核。',
      ...notes,
    ]),
    code: lines.join('\n'),
  };
}

function renderDeleteFixture(item, meta) {
  const fixtureSetup = buildFixturePrimitiveSetup(item, meta.fixtures);
  if (!fixtureSetup || !meta.moduleAccessor) {
    return renderReviewPlaceholder(item, meta);
  }

  return {
    notes: ['删除案例会先创建一个临时图元，再立即调用删除接口，避免误删当前工程里的真实对象。'],
    code: [
      'return await (async function(eda) {',
      `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
      ...renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`),
      ...fixtureSetup.setup.map((line) => `  ${line}`),
      '  const primitiveId = createdPrimitive?.getState_PrimitiveId?.() ?? createdPrimitive?.primitiveId ?? createdPrimitive?.id;',
      "  if (!primitiveId) { throw new Error('没有创建出可删除的测试图元。'); }",
      `  const deleted = await ${meta.moduleAccessor}.${item.memberName}([primitiveId]);`,
      '  return { fixtureName, primitiveId, deleted };',
      '})(eda);',
    ].join('\n'),
  };
}

function renderUpdateWithFixture(item, meta) {
  const fixtureSetup = buildFixturePrimitiveSetup(item, meta.fixtures);
  const propertyBuilder = buildModifyFixtureProperty(item, meta.fixtures);
  if (!fixtureSetup || !propertyBuilder || !meta.moduleAccessor) {
    return renderReviewPlaceholder(item, meta);
  }

  const lines = [
    'return await (async function(eda) {',
    `  const fixtureName = '${meta.namingPrefix}_${item.className}_${item.memberName}_' + Date.now();`,
  ];
  if (meta.requiresProject) {
    lines.push('  const currentProject = await eda.dmt_Project.getCurrentProjectInfo();');
    lines.push("  if (!currentProject) { throw new Error('当前没有打开工程，先补齐环境再调试这个案例。'); }");
  }
  if (meta.requiresDocumentType) {
    lines.push(...renderDocumentAssertion(meta.requiresDocumentType).map((line) => `  ${line}`));
  }
  lines.push(...fixtureSetup.setup.map((line) => `  ${line}`));
  lines.push(`  const primitiveId = ${fixtureSetup.idExpression};`);
  lines.push("  if (!primitiveId) { throw new Error('没有创建出可用于修改的测试图元。'); }");
  lines.push(...propertyBuilder.setup.map((line) => `  ${line}`));
  lines.push('  const property = {');
  lines.push(...propertyBuilder.lines.map((line) => `    ${line},`));
  lines.push('  };');
  lines.push('  try {');
  lines.push(`    const before = await ${meta.moduleAccessor}.get(primitiveId);`);
  lines.push(`    const result = await ${meta.moduleAccessor}.${item.memberName}(primitiveId, property);`);
  lines.push(`    const after = await ${meta.moduleAccessor}.get(primitiveId);`);
  lines.push('    return {');
  lines.push('      fixtureName,');
  lines.push('      primitiveId,');
  lines.push('      property,');
  lines.push('      before,');
  lines.push('      result,');
  lines.push('      after,');
  lines.push("      cleanupStrategy: 'auto',");
  lines.push('    };');
  lines.push('  } finally {');
  lines.push(`    ${fixtureSetup.cleanup}`);
  lines.push('  }');
  lines.push('})(eda);');

  return {
    notes: [
      '修改案例会先创建一个临时图元，再构造一个最小但真实的 property 对象执行 modify，最后自动清理。',
    ],
    code: lines.join('\n'),
  };
}

function renderExampleCode(item, meta) {
  if (meta.templateName === 'query-context' || meta.templateName === 'query-by-identifier') {
    return renderQuery(item, meta);
  }
  if (meta.templateName === 'ui-action') {
    return renderUiAction(item, meta);
  }
  if (meta.templateName === 'create-with-cleanup' || meta.templateName === 'create-with-context') {
    return renderCreateWithCleanup(item, meta);
  }
  if (meta.templateName === 'selection-primitive-read') {
    return renderSelectionPrimitive(item, meta, false);
  }
  if (meta.templateName === 'selection-primitive-mutation') {
    return renderSelectionPrimitive(item, meta, true);
  }
  if (meta.templateName === 'delete-fixture') {
    return renderDeleteFixture(item, meta);
  }
  if (meta.templateName === 'update-with-fixture') {
    return renderUpdateWithFixture(item, meta);
  }
  return renderReviewPlaceholder(item, meta);
}

function buildUseCaseText(kind, item) {
  if (kind === 'query') {
    return `当你需要在写扩展前先摸清当前上下文，或者需要把 ${item.memberName} 的返回值组织成后续逻辑时，这个案例最有参考价值。`;
  }
  if (kind === 'create') {
    return `当你想把 ${item.memberName} 放进自动化脚本、批处理或测试脚本时，可以先照着这个案例跑一遍，确认创建后的返回值和清理方式。`;
  }
  if (kind === 'delete' || kind === 'update') {
    return `当你准备把 ${item.memberName} 用在批量改图、重命名或清理脚本里时，先用这个案例确认前置条件和失败信号会更稳。`;
  }
  if (kind === 'ui') {
    return `当你希望给扩展加提示、窗口交互或即时反馈时，这个案例可以直接复用。`;
  }
  return `当你需要理解 ${item.className}.${item.memberName} 的调用方式、返回值和使用边界时，这个案例可以作为起点。`;
}

function buildExpectedResultText(meta) {
  if (meta.validationMode === 'safe') {
    return '成功时会返回结构化结果对象，里面至少包含当前上下文摘要和原始 API 返回值。';
  }
  if (meta.validationMode === 'mutating') {
    return '成功时会返回创建/修改后的对象摘要；如果案例支持自动清理，验证脚本会在同一次执行里完成清理。';
  }
  return '当前案例主要用于说明调用方式和前置条件；如需真正跑通，建议先补齐案例里写明的环境准备。';
}

function buildTroubleshooting(meta) {
  const notes = [];
  if (meta.requiresProject) {
    notes.push('如果报“当前没有打开工程”，先在 EasyEDA 里打开一个工程，再重新执行。');
  }
  if (meta.requiresDocumentType === 'PCB') {
    notes.push('如果报文档类型错误，通常是当前停留在主页、原理图或 3D 预览，而不是 PCB。');
    notes.push('PCB 坐标单位是 1mil，写创建/修改案例时不要误用原理图的 0.01inch。');
  }
  if (meta.requiresDocumentType === 'SCHEMATIC_PAGE') {
    notes.push('如果报文档类型错误，请先切到原理图图页。');
    notes.push('原理图坐标单位是 0.01inch，不是 PCB 的 1mil。');
  }
  if (meta.validationMode === 'manual') {
    notes.push('这个案例默认不进入全量自动验证批次，通常是因为它依赖选中对象、高风险副作用或更细的人工判断。');
  }
  return notes;
}

function buildParamTable(item) {
  if (!item.params.length) {
    return '- 无参数。';
  }
  return item.params
    .map((param) => `- \`${param.name}\`：${param.description || param.type || '见类文档。'}`)
    .join('\n');
}

function buildVerificationRecordLine(meta) {
  return `默认验证记录会写到 \`examples/reports/latest.json\`，该案例的索引键是 \`${meta.slug}\`。`;
}

function renderMarkdown(item, meta, exampleCode, exampleNotes) {
  const sections = [
    `# ${item.className}.${item.memberName}`,
    '',
    '## 这个 API 是干什么的',
    '',
    item.description || item.classSummary || `${item.className} 下的 ${item.memberName} 方法。`,
    '',
    '## 什么时候该用它',
    '',
    buildUseCaseText(meta.kind, item),
    '',
    '## 运行前需要什么上下文',
    '',
    `- 是否需要已打开工程：${meta.requiresProject ? '需要' : '不强制'}`,
    `- 是否需要活动文档：${meta.requiresDocumentType || '不强制'}`,
    `- 自动验证模式：${meta.validationMode}`,
    `- 清理策略：${meta.cleanupStrategy}`,
    '',
    '## 完整可运行代码',
    '',
    '```javascript',
    exampleCode,
    '```',
    '',
    '## 运行后预期结果',
    '',
    buildExpectedResultText(meta),
    '',
    '## 参数与返回值怎么理解',
    '',
    buildParamTable(item),
    '',
    `- 返回值：${item.returnSummary || '直接查看返回对象中的 result 字段。'} `,
    '',
    '## 常见错误与排查',
    '',
    ...buildTroubleshooting(meta).map((line) => `- ${line}`),
  ];

  if (exampleNotes.length) {
    sections.push('');
    sections.push('## 生成器补充说明');
    sections.push('');
    sections.push(...exampleNotes.map((line) => `- ${line}`));
  }

  sections.push('');
  sections.push('## 验证记录入口');
  sections.push('');
  sections.push(buildVerificationRecordLine(meta));
  sections.push('');

  return sections.join('\n');
}

function createMeta(item, registry, fixtures) {
  const moduleAccessor = findModuleAccessor(item, registry);
  const templateName = pickTemplate(item, registry);
  const status = determineStatus(item, registry, templateName, moduleAccessor);
  const validationMode = determineValidationMode(item, status, templateName);
  const cleanupStrategy = canRenderQueryWithFixture(item)
    ? 'auto'
    : determineCleanupStrategy(item, templateName);
  return {
    slug: `${item.className}.${item.memberName}`,
    kind: detectKind(item),
    domain: detectDomain(item.className),
    requiresProject: requiresProject(item),
    requiresDocumentType: detectDocumentType(item.className),
    cleanupStrategy,
    validationMode,
    status,
    templateName,
    moduleAccessor,
    fixtures,
    namingPrefix: fixtures.namingPrefix,
  };
}

function createArtifact(item, registry, fixtures) {
  const meta = createMeta(item, registry, fixtures);
  const exampleOutput = renderExampleCode(item, meta);
  const examplePath = `examples/methods/${item.className}/${item.memberName}.md`;
  const generatedPath = `examples/generated/${item.className}/${item.memberName}.json`;
  const catalogEntry = {
    className: item.className,
    methodName: item.memberName,
    slug: meta.slug,
    docPath: item.docPath,
    examplePath,
    kind: meta.kind,
    domain: meta.domain,
    requiresDocumentType: meta.requiresDocumentType,
    requiresProject: meta.requiresProject,
    cleanupStrategy: meta.cleanupStrategy,
    validationMode: meta.validationMode,
    status: meta.status,
    templateName: meta.templateName,
    generatedPath,
  };
  const generatedJson = {
    ...catalogEntry,
    signatures: item.signatures,
    description: item.description,
    classSummary: item.classSummary,
    remarks: item.remarks,
    returnSummary: item.returnSummary,
    params: item.params,
    exampleNotes: exampleOutput.notes,
    code: exampleOutput.code,
  };
  const markdown = renderMarkdown(item, meta, exampleOutput.code, exampleOutput.notes);
  return {
    catalogEntry,
    generatedJson,
    markdown,
    paths: {
      examplePath,
      generatedPath,
    },
  };
}

function applyFilters(items, filters) {
  return items.filter((item) => {
    if (!isModuleEntry(item)) {
      return false;
    }
    if (filters.className && item.className !== filters.className) {
      return false;
    }
    if (filters.methodSlug && `${item.className}.${item.memberName}` !== filters.methodSlug) {
      return false;
    }
    return true;
  });
}

export function buildArtifacts(registry, fixtures, filters = {}) {
  return applyFilters(registry.items, filters)
    .map((item) => createArtifact(item, registry, fixtures))
    .sort((left, right) => left.catalogEntry.slug.localeCompare(right.catalogEntry.slug));
}

async function ensureDirectoryForFile(rootDir, relativeFilePath) {
  await mkdir(path.dirname(path.join(rootDir, relativeFilePath)), { recursive: true });
}

export async function writeArtifacts(rootDir, artifacts, options = {}) {
  const { missingOnly = false } = options;
  const catalogPath = path.join(rootDir, 'examples', 'catalog.json');

  let existingCatalog = [];
  try {
    existingCatalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  } catch {
    existingCatalog = [];
  }

  const existingSlugs = new Set(existingCatalog.map((entry) => entry.slug));
  const toWrite = missingOnly
    ? artifacts.filter((artifact) => !existingSlugs.has(artifact.catalogEntry.slug))
    : artifacts;

  for (const artifact of toWrite) {
    await ensureDirectoryForFile(rootDir, artifact.paths.examplePath);
    await ensureDirectoryForFile(rootDir, artifact.paths.generatedPath);
    await writeFile(path.join(rootDir, artifact.paths.examplePath), artifact.markdown);
    await writeFile(path.join(rootDir, artifact.paths.generatedPath), `${JSON.stringify(artifact.generatedJson, null, 2)}\n`);
  }

  const mergedCatalogMap = new Map(existingCatalog.map((entry) => [entry.slug, entry]));
  for (const artifact of artifacts) {
    mergedCatalogMap.set(artifact.catalogEntry.slug, artifact.catalogEntry);
  }
  const mergedCatalog = [...mergedCatalogMap.values()].sort((left, right) => left.slug.localeCompare(right.slug));
  await mkdir(path.join(rootDir, 'examples'), { recursive: true });
  await writeFile(catalogPath, `${JSON.stringify(mergedCatalog, null, 2)}\n`);

  return {
    writtenCount: toWrite.length,
    catalogCount: mergedCatalog.length,
  };
}

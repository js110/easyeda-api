import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArtifacts, loadFixtures, writeArtifacts } from '../scripts/lib/example-system.mjs';
import { loadApiRegistry } from '../scripts/lib/reference-parser.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('buildArtifacts creates runnable query examples', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);
  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'DMT_Project.getCurrentProjectInfo',
  });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].catalogEntry.validationMode, 'safe');
  assert.match(artifacts[0].generatedJson.code, /eda\.dmt_Project\.getCurrentProjectInfo\(\)/);
  assert.match(artifacts[0].markdown, /## 完整可运行代码/);
});

test('buildArtifacts marks primitive instance cases as manual', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);
  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'IPCB_PrimitiveLine.getState_EndX',
  });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].catalogEntry.validationMode, 'manual');
  assert.match(artifacts[0].generatedJson.code, /selectedPrimitiveIds/);
});

test('buildArtifacts prefers runtime-safe overloads and real library seeds', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const deviceArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'LIB_Device.getByLcscIds',
  });
  assert.equal(deviceArtifacts.length, 1);
  assert.match(deviceArtifacts[0].generatedJson.code, /\['C5290014'\]/);
  assert.doesNotMatch(deviceArtifacts[0].generatedJson.code, /extends/);

  const classificationArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'LIB_Classification.getNameByIndex',
  });
  assert.equal(classificationArtifacts.length, 1);
  assert.match(classificationArtifacts[0].generatedJson.code, /footprintItem\?\.classification/);
});

test('buildArtifacts uses runnable editor/library examples and demotes flaky exports', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const libraryOpenArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'DMT_EditorControl.openLibraryDocument',
  });
  assert.equal(libraryOpenArtifacts.length, 1);
  assert.match(libraryOpenArtifacts[0].generatedJson.code, /symbolLibraryUuid/);
  assert.match(libraryOpenArtifacts[0].generatedJson.code, /'2'/);

  const fileExportArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'SYS_FileManager.getProjectFile',
  });
  assert.equal(fileExportArtifacts.length, 1);
  assert.equal(fileExportArtifacts[0].catalogEntry.validationMode, 'manual');
});

test('buildArtifacts adds a fallback path for current team lookup', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'DMT_Team.getCurrentTeamInfo',
  });

  assert.equal(artifacts.length, 1);
  assert.match(artifacts[0].generatedJson.code, /getCurrentTeamInfo\(\)/);
  assert.match(artifacts[0].generatedJson.code, /getAllTeamsInfo\(\)/);
  assert.match(artifacts[0].generatedJson.code, /fallbackTeamCount/);
});

test('writeArtifacts preserves the existing catalog during targeted updates', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'easyeda-api-example-system-'));
  const examplesDir = path.join(tempRoot, 'examples');
  const existingCatalog = [
    {
      slug: 'DMT_Project.getCurrentProjectInfo',
      className: 'DMT_Project',
      methodName: 'getCurrentProjectInfo',
    },
  ];

  await mkdir(examplesDir, { recursive: true });
  await writeFile(path.join(examplesDir, 'catalog.json'), `${JSON.stringify(existingCatalog, null, 2)}\n`);

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'DMT_Team.getCurrentTeamInfo',
  });
  await writeArtifacts(tempRoot, artifacts);

  const writtenCatalog = JSON.parse(await readFile(path.join(examplesDir, 'catalog.json'), 'utf8'));
  assert.equal(writtenCatalog.length, 2);
  assert.deepEqual(
    writtenCatalog.map((entry) => entry.slug).sort(),
    ['DMT_Project.getCurrentProjectInfo', 'DMT_Team.getCurrentTeamInfo'],
  );
});

test('buildArtifacts emits syntactically valid document-guarded code', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_Document.getCanvasOrigin',
  });

  assert.equal(artifacts.length, 1);
  assert.doesNotThrow(() => new AsyncFunction('eda', artifacts[0].generatedJson.code));
});

test('buildArtifacts seeds primitive ids for primitive read examples', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_PrimitiveLine.get',
  });

  assert.equal(artifacts.length, 1);
  assert.match(artifacts[0].generatedJson.code, /pcb_PrimitiveLine\.create\(/);
  assert.match(artifacts[0].generatedJson.code, /cleanupStrategy: 'auto'/);
  assert.match(artifacts[0].generatedJson.code, /pcb_PrimitiveLine\.delete\(\[primitiveId\]\)/);
  assert.equal(artifacts[0].catalogEntry.cleanupStrategy, 'auto');
});

test('buildArtifacts demotes slow manufacture exports to manual', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_ManufactureData.get3DFile',
  });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].catalogEntry.validationMode, 'manual');
});

test('buildArtifacts uses a concrete primitive accessor for generic primitive examples', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const artifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_Primitive.getPrimitivesBBox',
  });

  assert.equal(artifacts.length, 1);
  assert.match(artifacts[0].generatedJson.code, /eda\.pcb_PrimitiveLine\.create\(/);
  assert.match(artifacts[0].generatedJson.code, /eda\.pcb_Primitive\.getPrimitivesBBox\(\[primitiveId\]\)/);
});

test('buildArtifacts uses explicit runnable fixtures for pad, pin, attribute, and object reads', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const padArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_PrimitivePad.get',
  });
  assert.equal(padArtifacts.length, 1);
  assert.match(padArtifacts[0].generatedJson.code, /\['ELLIPSE', 60, 60\]/);

  const pinArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'SCH_PrimitivePin.get',
  });
  assert.equal(pinArtifacts.length, 1);
  assert.match(pinArtifacts[0].generatedJson.code, /sch_PrimitiveComponent\.getAllPinsByPrimitiveId/);
  assert.match(pinArtifacts[0].generatedJson.code, /sch_PrimitivePin\.get\(primitiveId\)/);

  const attributeArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'SCH_PrimitiveAttribute.get',
  });
  assert.equal(attributeArtifacts.length, 1);
  assert.match(attributeArtifacts[0].generatedJson.code, /sch_PrimitiveAttribute\.getAll\(componentPrimitiveId\)/);
  assert.match(attributeArtifacts[0].generatedJson.code, /sch_PrimitiveComponent\.delete\(\[componentPrimitiveId\]\)/);

  const objectArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_PrimitiveObject.get',
  });
  assert.equal(objectArtifacts.length, 1);
  assert.match(objectArtifacts[0].generatedJson.code, /fixtureBinaryData/);
  assert.match(objectArtifacts[0].generatedJson.code, /pcb_PrimitiveObject\.create\(/);
});

test('buildArtifacts demotes unstable image, bus, and poured reads to manual', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  for (const slug of [
    'SCH_Netlist.getNetlist',
    'SCH_PrimitiveBus.get',
    'PCB_PrimitiveImage.get',
    'PCB_PrimitivePoured.get',
  ]) {
    const artifacts = buildArtifacts(registry, fixtures, { methodSlug: slug });
    assert.equal(artifacts.length, 1);
    assert.equal(artifacts[0].catalogEntry.validationMode, 'manual');
  }
});

test('buildArtifacts demotes unstable mutating APIs to manual', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  for (const slug of [
    'PCB_PrimitiveImage.create',
    'SCH_PrimitiveBus.create',
    'SCH_PrimitivePin.create',
    'LIB_Footprint.create',
    'SCH_PrimitiveComponent.setNetFlagComponentUuid_Ground',
  ]) {
    const artifacts = buildArtifacts(registry, fixtures, { methodSlug: slug });
    assert.equal(artifacts.length, 1);
    assert.equal(artifacts[0].catalogEntry.validationMode, 'manual');
  }
});

test('buildArtifacts prefers validated fixture-based create examples when available', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const arcCreateArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_PrimitiveArc.create',
  });
  assert.equal(arcCreateArtifacts.length, 1);
  assert.match(arcCreateArtifacts[0].generatedJson.code, /pcb_PrimitiveArc\.create\(/);
  assert.match(arcCreateArtifacts[0].generatedJson.code, /cleanupStrategy: 'auto'/);

  const pinCreateArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'SCH_PrimitivePin.create',
  });
  assert.equal(pinCreateArtifacts.length, 1);
  assert.doesNotMatch(pinCreateArtifacts[0].generatedJson.code, /sch_PrimitiveComponent\.getAllPinsByPrimitiveId/);
});

test('buildArtifacts renders fixture-backed modify examples with property objects', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);

  const lineModifyArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'PCB_PrimitiveLine.modify',
  });
  assert.equal(lineModifyArtifacts.length, 1);
  assert.match(lineModifyArtifacts[0].generatedJson.code, /pcb_PrimitiveLine\.create\(/);
  assert.match(lineModifyArtifacts[0].generatedJson.code, /const property = \{/);
  assert.match(lineModifyArtifacts[0].generatedJson.code, /endX:/);
  assert.match(lineModifyArtifacts[0].generatedJson.code, /pcb_PrimitiveLine\.modify\(primitiveId, property\)/);

  const textModifyArtifacts = buildArtifacts(registry, fixtures, {
    methodSlug: 'SCH_PrimitiveText.modify',
  });
  assert.equal(textModifyArtifacts.length, 1);
  assert.match(textModifyArtifacts[0].generatedJson.code, /content: fixtureName \+ '_updated'/);
  assert.match(textModifyArtifacts[0].generatedJson.code, /sch_PrimitiveText\.modify\(primitiveId, property\)/);
});

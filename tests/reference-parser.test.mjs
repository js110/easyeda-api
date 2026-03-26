import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadApiRegistry, parseSignature } from '../scripts/lib/reference-parser.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('parseSignature handles methods and properties', () => {
  const method = parseSignature('getCurrentProjectInfo(): Promise<IDMT_ProjectItem | undefined>');
  assert.equal(method.kind, 'method');
  assert.equal(method.memberName, 'getCurrentProjectInfo');
  assert.equal(method.parameters.length, 0);

  const genericMethod = parseSignature('getByLcscIds<T extends boolean>(lcscIds: string, libraryUuid?: string, allowMultiMatch?: T): Promise<T extends true ? ILIB_DeviceSearchItem | undefined : Array<ILIB_DeviceSearchItem>>');
  assert.equal(genericMethod.kind, 'method');
  assert.equal(genericMethod.memberName, 'getByLcscIds');

  const property = parseSignature('dmt_Project: DMT_Project');
  assert.equal(property.kind, 'property');
  assert.equal(property.memberName, 'dmt_Project');
  assert.equal(property.propertyType, 'DMT_Project');
});

test('loadApiRegistry extracts method metadata from references', async () => {
  const registry = await loadApiRegistry(ROOT_DIR);
  const projectMethods = registry.byClass.get('DMT_Project');
  assert.ok(projectMethods);

  const currentProject = projectMethods.find((item) => item.memberName === 'getCurrentProjectInfo');
  assert.ok(currentProject);
  assert.equal(currentProject.memberType, 'method');
  assert.match(currentProject.description, /获取当前工程/);
  assert.ok(registry.edaAccessors.has('dmt_Project'));
});

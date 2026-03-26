import test from 'node:test';
import assert from 'node:assert/strict';

import {
  needsContextRestore,
  pickRestoreDocumentUuid,
  sortEntriesForVerification,
} from '../scripts/lib/verification-context.mjs';

test('sortEntriesForVerification prioritizes project-bound entries', () => {
  const sorted = sortEntriesForVerification([
    { slug: 'LIB_Footprint.search', requiresProject: false, requiresDocumentType: null, domain: 'LIB' },
    { slug: 'DMT_Project.getCurrentProjectInfo', requiresProject: true, requiresDocumentType: null, domain: 'DMT' },
    { slug: 'PCB_PrimitiveLine.create', requiresProject: true, requiresDocumentType: 'PCB', domain: 'PCB' },
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.slug),
    [
      'PCB_PrimitiveLine.create',
      'DMT_Project.getCurrentProjectInfo',
      'LIB_Footprint.search',
    ],
  );
});

test('needsContextRestore detects missing or mismatched document context', () => {
  assert.equal(
    needsContextRestore(
      { requiresProject: true, requiresDocumentType: 'PCB' },
      { hasProject: false, documentType: null },
    ),
    true,
  );

  assert.equal(
    needsContextRestore(
      { requiresProject: true, requiresDocumentType: 'PCB' },
      { hasProject: true, documentType: 1 },
    ),
    true,
  );

  assert.equal(
    needsContextRestore(
      { requiresProject: true, requiresDocumentType: 'PCB' },
      { hasProject: true, documentType: 3 },
    ),
    false,
  );
});

test('pickRestoreDocumentUuid prefers matching document types', () => {
  const anchorContext = {
    hasProject: true,
    activeProjectDocumentUuid: 'doc-active',
    schematicPageUuid: 'doc-sch',
    pcbUuid: 'doc-pcb',
    panelUuid: 'doc-panel',
  };

  assert.equal(
    pickRestoreDocumentUuid({ requiresProject: true, requiresDocumentType: 'PCB' }, anchorContext),
    'doc-pcb',
  );
  assert.equal(
    pickRestoreDocumentUuid({ requiresProject: true, requiresDocumentType: 'SCHEMATIC_PAGE' }, anchorContext),
    'doc-sch',
  );
  assert.equal(
    pickRestoreDocumentUuid({ requiresProject: true, requiresDocumentType: null }, anchorContext),
    'doc-active',
  );
});

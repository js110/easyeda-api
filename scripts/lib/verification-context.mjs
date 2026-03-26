function entryPriority(entry) {
  let score = 0;

  if (entry.requiresProject) {
    score -= 100;
  }
  if (entry.requiresDocumentType) {
    score -= 25;
  }
  if (entry.domain === 'DMT') {
    score -= 10;
  }
  if (entry.domain === 'LIB' || entry.domain === 'SYS') {
    score += 10;
  }

  return score;
}

export function sortEntriesForVerification(entries) {
  return [...entries].sort((left, right) => {
    const score = entryPriority(left) - entryPriority(right);
    if (score !== 0) {
      return score;
    }
    return left.slug.localeCompare(right.slug);
  });
}

export function needsContextRestore(entry, contextSnapshot) {
  if (!entry.requiresProject) {
    return false;
  }
  if (!contextSnapshot?.hasProject) {
    return true;
  }
  if (entry.requiresDocumentType === 'PCB' && contextSnapshot.documentType !== 3) {
    return true;
  }
  if (entry.requiresDocumentType === 'SCHEMATIC_PAGE' && contextSnapshot.documentType !== 1) {
    return true;
  }
  return false;
}

export function pickRestoreDocumentUuid(entry, anchorContext) {
  if (!anchorContext?.hasProject) {
    return null;
  }
  if (entry.requiresDocumentType === 'PCB') {
    return anchorContext.pcbUuid
      || anchorContext.schematicPageUuid
      || anchorContext.panelUuid
      || null;
  }
  if (entry.requiresDocumentType === 'SCHEMATIC_PAGE') {
    return anchorContext.schematicPageUuid
      || anchorContext.pcbUuid
      || anchorContext.panelUuid
      || null;
  }
  return anchorContext.activeProjectDocumentUuid
    || anchorContext.schematicPageUuid
    || anchorContext.pcbUuid
    || anchorContext.panelUuid
    || null;
}

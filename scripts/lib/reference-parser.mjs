import { readFile } from 'node:fs/promises';
import path from 'node:path';

function normalizeWhitespace(value) {
  return value
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkdownLinks(value) {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function stripHtml(value) {
  return value
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '$1')
    .replace(/<[^>]+>/g, ' ');
}

function cleanCell(value) {
  return normalizeWhitespace(stripMarkdownLinks(stripHtml(value || '')));
}

function findMatchingParen(value, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function splitTopLevel(value, separator = ',') {
  const segments = [];
  let current = '';
  let angle = 0;
  let paren = 0;
  let square = 0;
  let brace = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if (char === "'" && !inDouble && !inTemplate && previous !== '\\') {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle && !inTemplate && previous !== '\\') {
      inDouble = !inDouble;
    } else if (char === '`' && !inSingle && !inDouble && previous !== '\\') {
      inTemplate = !inTemplate;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (char === '<') angle += 1;
      else if (char === '>') angle = Math.max(0, angle - 1);
      else if (char === '(') paren += 1;
      else if (char === ')') paren = Math.max(0, paren - 1);
      else if (char === '[') square += 1;
      else if (char === ']') square = Math.max(0, square - 1);
      else if (char === '{') brace += 1;
      else if (char === '}') brace = Math.max(0, brace - 1);
      else if (char === separator && angle === 0 && paren === 0 && square === 0 && brace === 0) {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

export function parseSignature(signatureText) {
  const signature = normalizeWhitespace(signatureText.replace(/;$/, ''));
  const openIndex = signature.indexOf('(');
  if (openIndex === -1) {
    const propertyMatch = signature.match(/^([A-Za-z0-9_?$]+)\s*:\s*([\s\S]+)$/);
    return {
      kind: 'property',
      signature,
      memberName: propertyMatch?.[1] || signature,
      propertyType: propertyMatch?.[2]?.trim() || '',
      parameters: [],
      returnType: propertyMatch?.[2]?.trim() || '',
    };
  }

  const closeIndex = findMatchingParen(signature, openIndex);
  const memberName = signature
    .slice(0, openIndex)
    .trim()
    .replace(/<[\s\S]*>$/, '');
  const parameterString = closeIndex === -1 ? '' : signature.slice(openIndex + 1, closeIndex);
  const returnType = closeIndex === -1
    ? ''
    : signature.slice(closeIndex + 1).replace(/^:\s*/, '').trim();
  const parameters = splitTopLevel(parameterString).map((rawParameter) => {
    const parameterMatch = rawParameter.match(/^([A-Za-z0-9_$]+)(\?)?\s*:\s*([\s\S]+)$/);
    return {
      raw: rawParameter,
      name: parameterMatch?.[1] || rawParameter,
      optional: Boolean(parameterMatch?.[2]),
      type: parameterMatch?.[3]?.trim() || '',
    };
  });

  return {
    kind: 'method',
    signature,
    memberName,
    parameters,
    returnType,
  };
}

function parseQuickReference(text) {
  const lines = text.split(/\r?\n/);
  const classes = new Map();
  let currentClassName = null;
  let sectionLines = [];
  let inCodeBlock = false;

  function commitSectionLines() {
    if (!currentClassName || !sectionLines.length) {
      return;
    }
    const classInfo = classes.get(currentClassName);
    if (!classInfo.description) {
      const description = sectionLines
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('```') && !line.startsWith('declare '))
        .join('\n');
      classInfo.description = normalizeWhitespace(description);
    }
  }

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
    }

    const classMatch = line.match(/^##\s+(.+)$/);
    if (classMatch) {
      commitSectionLines();
      currentClassName = classMatch[1].trim();
      sectionLines = [];
      classes.set(currentClassName, {
        className: currentClassName,
        description: '',
        entries: [],
      });
      continue;
    }

    if (!currentClassName) {
      continue;
    }

    const bulletMatch = line.match(/^- \*\*(.+?)\*\*: `([^`]+)`$/);
    if (bulletMatch) {
      const entryKey = bulletMatch[1].trim();
      const signature = bulletMatch[2].trim();
      const parsed = parseSignature(signature);
      classes.get(currentClassName).entries.push({
        entryKey,
        signature,
        ...parsed,
      });
      continue;
    }

    if (!inCodeBlock) {
      sectionLines.push(line);
    }
  }

  commitSectionLines();
  return classes;
}

function extractSection(block, heading) {
  const headingPattern = heading
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const match = block.match(new RegExp(`##\\s+${headingPattern}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`));
  return match?.[1]?.trim() || '';
}

function extractFirstCodeFence(block) {
  const match = block.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return match?.[1]?.trim() || '';
}

function extractFirstParagraph(block) {
  const lines = block.split('\n');
  const paragraph = [];
  let started = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (started) {
        break;
      }
      continue;
    }
    if (line.startsWith('#') || line.startsWith('>') || line.startsWith('```')) {
      continue;
    }
    if (/^##\s+/.test(line)) {
      break;
    }
    started = true;
    paragraph.push(line);
  }

  return normalizeWhitespace(paragraph.join(' '));
}

function parseHtmlTableRows(section) {
  if (!section) {
    return [];
  }
  const rows = [];
  for (const rowMatch of section.matchAll(/<tr><td>\s*([\s\S]*?)\s*<\/td><td>\s*([\s\S]*?)\s*<\/td>(?:<td>\s*([\s\S]*?)\s*<\/td>)?(?:<td>\s*([\s\S]*?)\s*<\/td>)?\s*<\/tr>/g)) {
    rows.push(rowMatch.slice(1).filter((cell) => cell !== undefined).map(cleanCell));
  }
  return rows;
}

function parseMethodBlock(block) {
  const titleMatch = block.match(/^#\s+.+?\.([A-Za-z0-9_$]+)\(\)\s+method/m);
  const memberName = titleMatch?.[1] || '';
  const signatureSection = extractSection(block, '签名');
  const parameterSection = extractSection(block, '参数名');
  const returnSection = extractSection(block, '返回值');
  const remarkSection = extractSection(block, '备注');
  const exampleSection = extractSection(block, '示例');

  const params = parseHtmlTableRows(parameterSection).map((row) => ({
    name: row[0] || '',
    type: row[1] || '',
    description: row[2] || '',
  }));

  return {
    memberName,
    title: cleanCell(titleMatch?.[0] || ''),
    description: extractFirstParagraph(block),
    signature: extractFirstCodeFence(signatureSection),
    params,
    returnSummary: normalizeWhitespace(stripHtml(returnSection)),
    remarks: normalizeWhitespace(stripHtml(remarkSection)),
    examples: normalizeWhitespace(stripHtml(exampleSection)),
    isBeta: /BETA/.test(block),
  };
}

function parseClassDoc(text) {
  const className = text.match(/^#\s+(.+?)\s+class/m)?.[1]?.replace(/\\/g, '') || '';
  const headerMatch = text.match(/^#\s+.+?\n\n([\s\S]*?)(?=\n##\s+签名)/);
  const headerSummary = normalizeWhitespace(stripHtml(stripMarkdownLinks(headerMatch?.[1] || '')));
  const remarkSection = extractSection(text, '备注');

  const blocks = text.split(/\n###\s+/);
  const methods = new Map();
  for (let index = 1; index < blocks.length; index += 1) {
    const block = `### ${blocks[index]}`;
    const methodInfo = parseMethodBlock(block);
    if (!methodInfo.memberName) {
      continue;
    }
    const existing = methods.get(methodInfo.memberName) || [];
    existing.push(methodInfo);
    methods.set(methodInfo.memberName, existing);
  }

  return {
    className,
    summary: headerSummary,
    remarks: normalizeWhitespace(stripHtml(remarkSection)),
    methods,
  };
}

export async function loadApiRegistry(rootDir) {
  const quickReferencePath = path.join(rootDir, 'references', '_quick-reference.md');
  const quickReference = parseQuickReference(await readFile(quickReferencePath, 'utf8'));
  const edaEntries = quickReference.get('EDA')?.entries || [];
  const edaAccessors = new Set(
    edaEntries
      .filter((entry) => entry.kind === 'property')
      .map((entry) => entry.memberName),
  );

  const items = [];
  const byClass = new Map();

  for (const [className, quickRefClass] of quickReference.entries()) {
    if (className === '全局入口' || className === 'EDA') {
      continue;
    }

    const classDocPath = path.join(rootDir, 'references', 'classes', `${className}.md`);
    let classDoc = {
      className,
      summary: quickRefClass.description,
      remarks: '',
      methods: new Map(),
    };

    try {
      classDoc = parseClassDoc(await readFile(classDocPath, 'utf8'));
    } catch {
      classDoc = {
        className,
        summary: quickRefClass.description,
        remarks: '',
        methods: new Map(),
      };
    }

    const groupedEntries = new Map();
    for (const entry of quickRefClass.entries) {
      const key = entry.memberName;
      const bucket = groupedEntries.get(key) || [];
      bucket.push(entry);
      groupedEntries.set(key, bucket);
    }

    const classItems = [];
    for (const [memberName, entries] of groupedEntries.entries()) {
      const detailBlocks = classDoc.methods.get(memberName) || [];
      const detail = detailBlocks[0] || null;
      const parsedSignatures = entries.map((entry) => parseSignature(entry.signature));
      const item = {
        className,
        classSummary: classDoc.summary || quickRefClass.description || '',
        classRemarks: classDoc.remarks || '',
        memberName,
        memberType: parsedSignatures.every((signature) => signature.kind === 'property') ? 'property' : 'method',
        entryKeys: entries.map((entry) => entry.entryKey),
        signatures: entries.map((entry) => entry.signature),
        signatureDetails: parsedSignatures,
        description: detail?.description || '',
        params: detail?.params || [],
        returnSummary: detail?.returnSummary || '',
        remarks: detail?.remarks || '',
        examples: detail?.examples || '',
        isBeta: Boolean(detail?.isBeta),
        docPath: `references/classes/${className}.md`,
      };
      classItems.push(item);
      items.push(item);
    }

    byClass.set(className, classItems);
  }

  items.sort((left, right) => {
    if (left.className === right.className) {
      return left.memberName.localeCompare(right.memberName);
    }
    return left.className.localeCompare(right.className);
  });

  return {
    items,
    byClass,
    quickReference,
    edaAccessors,
  };
}

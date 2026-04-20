import type { Person, RelationType } from '@/types/genealogy';

// ── Date parsing ──────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', NOV: '11', DEC: '12',
  OCT: '10',
  // French variants
  JANV: '01', FEVR: '02', FEVR2: '02', MARS: '03', AVR: '04', AVRI: '04',
  JUIN: '06', JUIL: '07', AOUT: '08',
  SEPT: '09', OCTO: '10', NOVE: '11', DECE: '12',
};

function parseDate(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;

  // Strip qualifiers (approximate, before, after, etc.)
  const clean = raw.trim()
    .replace(/^(ABT\.?|ABOUT|BEF\.?|BEFORE|AFT\.?|AFTER|CAL\.?|CALCULATED|EST\.?|ESTIMATED|INT|FROM|TO|BET\.?|AND)\s+/gi, '')
    .trim();

  // DD MON YYYY  (e.g. 15 JAN 1850)
  const full = clean.match(/^(\d{1,2})\s+([A-ZÀ-Ö]{3,5})\s+(\d{4})$/i);
  if (full) {
    const m = MONTH_MAP[full[2].toUpperCase()];
    if (m) return `${full[3]}-${m}-${full[1].padStart(2, '0')}`;
  }

  // MON YYYY  (e.g. JAN 1850)
  const monthYear = clean.match(/^([A-ZÀ-Ö]{3,5})\s+(\d{4})$/i);
  if (monthYear) {
    const m = MONTH_MAP[monthYear[1].toUpperCase()];
    if (m) return `${monthYear[2]}-${m}`;
  }

  // ISO YYYY-MM-DD or YYYY-MM
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(clean)) return clean;

  // Plain year
  const year = clean.match(/^(\d{4})$/);
  if (year) return year[1];

  // Fall back: extract any 4-digit year
  const anyYear = clean.match(/\b(\d{4})\b/);
  return anyYear ? anyYear[1] : undefined;
}

// ── Name parsing ──────────────────────────────────────────────────────────────

function parseName(raw: string | undefined): { firstName: string; lastName: string } {
  if (!raw?.trim()) return { firstName: 'Inconnu', lastName: '' };

  // Standard GEDCOM:  Given /Surname/ Suffix
  const slashMatch = raw.match(/^(.*?)\s*\/([^/]*)\//);
  if (slashMatch) {
    return {
      firstName: slashMatch[1].trim() || 'Inconnu',
      lastName: slashMatch[2].trim(),
    };
  }

  // No slashes — treat last word as surname
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop()!;
  return { firstName: parts.join(' '), lastName };
}

// ── Low-level line parser ─────────────────────────────────────────────────────

interface GedcomLine {
  level: number;
  xref: string | null;
  tag: string;
  value: string;
}

function parseLines(content: string): GedcomLine[] {
  const lines: GedcomLine[] = [];
  // Normalize line endings, handle BOM
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    // FORMAT: LEVEL [XREF] TAG [VALUE]
    const m = line.match(/^(\d+)\s+(@[^@\s]+@\s+)?([A-Z_0-9]+)(?:\s+(.*))?$/i);
    if (!m) continue;

    lines.push({
      level: parseInt(m[1], 10),
      xref: m[2] ? m[2].trim() : null,
      tag: m[3].toUpperCase(),
      value: m[4]?.trim() ?? '',
    });
  }
  return lines;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export interface ParsedPerson extends Omit<Person, 'id'> {
  _gedId: string; // original GEDCOM xref e.g. "@I1@"
}

export interface ParsedRelation {
  from: string; // _gedId
  to: string;   // _gedId
  type: RelationType;
}

export interface GedcomParseResult {
  persons: ParsedPerson[];
  relations: ParsedRelation[];
  stats: {
    individuals: number;
    families: number;
    relationsCreated: number;
    skippedRelations: number;
  };
}

export function parseGedcom(content: string): GedcomParseResult {
  const lines = parseLines(content);

  // ── Collect raw records ────────────────────────────────────────────────────
  // We store each INDI/FAM record as a plain object for easy access.

  interface IndiRecord {
    gedId: string;
    name?: string;
    sex?: string;
    birt?: { date?: string; place?: string };
    deat?: { date?: string; place?: string };
    occu?: string;
    note?: string;
  }

  interface FamRecord {
    gedId: string;
    husb?: string;
    wife?: string;
    chil: string[];
  }

  const individuals = new Map<string, IndiRecord>();
  const families = new Map<string, FamRecord>();

  let curType: 'INDI' | 'FAM' | null = null;
  let curId = '';
  let curTag = '';

  for (const line of lines) {
    if (line.level === 0) {
      curTag = '';
      if (line.xref && line.tag === 'INDI') {
        curType = 'INDI';
        curId = line.xref;
        individuals.set(curId, { gedId: curId, chil: undefined } as any);
      } else if (line.xref && line.tag === 'FAM') {
        curType = 'FAM';
        curId = line.xref;
        families.set(curId, { gedId: curId, chil: [] });
      } else {
        curType = null;
        curId = '';
      }
      continue;
    }

    if (!curType || !curId) continue;

    // ── Level 1 tags ──────────────────────────────────────────────────────────
    if (line.level === 1) {
      curTag = line.tag;

      if (curType === 'INDI') {
        const rec = individuals.get(curId)!;
        switch (line.tag) {
          case 'NAME': rec.name = line.value; break;
          case 'SEX':  rec.sex  = line.value; break;
          case 'OCCU': case 'OCCUPATION': rec.occu = line.value; break;
          case 'NOTE': rec.note = line.value; break;
          case 'BIRT': if (!rec.birt) rec.birt = {}; break;
          case 'DEAT': if (!rec.deat) rec.deat = {}; break;
        }
      } else if (curType === 'FAM') {
        const rec = families.get(curId)!;
        switch (line.tag) {
          case 'HUSB': rec.husb = line.value; break;
          case 'WIFE': rec.wife = line.value; break;
          case 'CHIL': rec.chil.push(line.value); break;
        }
      }
      continue;
    }

    // ── Level 2 tags ──────────────────────────────────────────────────────────
    if (line.level === 2 && curType === 'INDI') {
      const rec = individuals.get(curId)!;

      if (curTag === 'BIRT' && rec.birt) {
        if (line.tag === 'DATE')  rec.birt.date  = line.value;
        if (line.tag === 'PLAC')  rec.birt.place = line.value;
      }
      if (curTag === 'DEAT' && rec.deat) {
        if (line.tag === 'DATE')  rec.deat.date  = line.value;
        if (line.tag === 'PLAC')  rec.deat.place = line.value;
      }
      // Name CONT/CONC
      if (curTag === 'NAME' && line.tag === 'NICK') {
        // ignore nicknames
      }
      // NOTE continuation
      if (curTag === 'NOTE') {
        if (line.tag === 'CONT') rec.note = (rec.note || '') + '\n' + line.value;
        if (line.tag === 'CONC') rec.note = (rec.note || '') + line.value;
      }
    }
  }

  // ── Build Person objects ───────────────────────────────────────────────────
  const persons: ParsedPerson[] = [];
  const gedIdSet = new Set(individuals.keys());

  for (const rec of individuals.values()) {
    const { firstName, lastName } = parseName(rec.name);
    const gender: 'M' | 'F' = rec.sex?.toUpperCase() === 'F' ? 'F' : 'M';

    persons.push({
      _gedId: rec.gedId,
      firstName,
      lastName,
      gender,
      birthDate:  parseDate(rec.birt?.date),
      birthPlace: rec.birt?.place?.split(',')[0].trim() || undefined,
      deathDate:  parseDate(rec.deat?.date),
      deathPlace: rec.deat?.place?.split(',')[0].trim() || undefined,
      occupation: rec.occu || undefined,
      notes:      rec.note || undefined,
    });
  }

  // ── Build Relation objects ─────────────────────────────────────────────────
  const relations: ParsedRelation[] = [];
  let skipped = 0;

  for (const fam of families.values()) {
    const husbId = fam.husb && gedIdSet.has(fam.husb) ? fam.husb : null;
    const wifeId = fam.wife && gedIdSet.has(fam.wife) ? fam.wife : null;

    // Spouse alliance
    if (husbId && wifeId) {
      relations.push({ from: husbId, to: wifeId, type: 'alliance' });
    }

    // Parent → child
    for (const childRef of fam.chil) {
      if (!gedIdSet.has(childRef)) { skipped++; continue; }
      if (husbId) relations.push({ from: husbId, to: childRef, type: 'parent' });
      if (wifeId) relations.push({ from: wifeId, to: childRef, type: 'parent' });
    }
  }

  return {
    persons,
    relations,
    stats: {
      individuals: individuals.size,
      families: families.size,
      relationsCreated: relations.length,
      skippedRelations: skipped,
    },
  };
}

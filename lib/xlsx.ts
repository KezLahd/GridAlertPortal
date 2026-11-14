// A small Excel (.xlsx) writer for exports and audit emails: one sheet, a bold frozen header row, autofilter,
// column widths, real dates and numbers. No dependency: an .xlsx is a zip of a few XML files, written here uncompressed.

export type Cell = string | number | Date | null | undefined

export interface Sheet {
  name: string
  headers: string[]
  rows: Cell[][]
  /** Column widths in characters; worked out from the data when left out. */
  widths?: number[]
  /** Title row above the headers, e.g. "Wattle · planned outages, next 14 days". */
  title?: string
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // XML 1.0 can't hold most control characters
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

const col = (i: number) => {
  let s = ""
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Excel's serial date, in the wall-clock time the caller already converted to (we pass Sydney time). */
const serial = (d: Date) => d.getTime() / 86400000 + 25569

function cellXml(v: Cell, ref: string, header = false): string {
  if (v === null || v === undefined || v === "") return ""
  if (header) return `<c r="${ref}" t="inlineStr" s="1"><is><t>${esc(String(v))}</t></is></c>`
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : `<c r="${ref}" s="2"><v>${serial(v)}</v></c>`
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}" s="3"><v>${v}</v></c>` : ""
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
}

function sheetXml(s: Sheet): string {
  const off = s.title ? 2 : 0
  const widths = s.widths ?? s.headers.map((h, i) =>
    Math.min(60, Math.max(h.length + 2, ...s.rows.slice(0, 500).map((r) => {
      const v = r[i]
      return v instanceof Date ? 24 : String(v ?? "").length + 2
    }))))
  const rows: string[] = []
  if (s.title) rows.push(`<row r="1"><c r="A1" t="inlineStr" s="4"><is><t>${esc(s.title)}</t></is></c></row>`)
  rows.push(`<row r="${off + 1}">${s.headers.map((h, i) => cellXml(h, `${col(i)}${off + 1}`, true)).join("")}</row>`)
  s.rows.forEach((r, j) => {
    const n = off + 2 + j
    rows.push(`<row r="${n}">${r.map((v, i) => cellXml(v, `${col(i)}${n}`)).join("")}</row>`)
  })
  const last = `${col(s.headers.length - 1)}${off + 1 + s.rows.length}`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${off + 1}" topLeftCell="A${off + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<autoFilter ref="A${off + 1}:${last}"/>
</worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="ddd d mmm yyyy h:mm AM/PM"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F3EA"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`

export function xlsx(sheets: Sheet[]): Buffer {
  const name = (s: Sheet) => esc(s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31))
  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s, i) => `<sheet name="${name(s)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
<definedNames>${sheets.map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${name(s)}'!$A$${s.title ? 3 : 1}:$${col(s.headers.length - 1)}$${(s.title ? 3 : 1) + s.rows.length}</definedName>`).join("")}</definedNames>
</workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
    ["xl/styles.xml", STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)] as [string, string]),
  ]
  return zip(files.map(([n, t]) => [n, Buffer.from(t, "utf8")]))
}

// --- a stored (uncompressed) zip ---

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(b: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files: [string, Buffer][]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const [name, data] of files) {
    const n = Buffer.from(name, "utf8"), crc = crc32(data)
    const h = Buffer.alloc(30)
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8)
    h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc, 14)
    h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26); h.writeUInt16LE(0, 28)
    local.push(h, n, data)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8)
    c.writeUInt16LE(0, 10); c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc, 16)
    c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28)
    c.writeUInt32LE(offset, 42)
    central.push(c, n)
    offset += 30 + n.length + data.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, cd, end])
}

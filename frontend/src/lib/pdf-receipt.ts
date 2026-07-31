type PdfMetaItem = [label: string, value: string | number | null | undefined];

type PdfTable = {
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  widths?: number[];
};

export type PdfReceiptInput = {
  title: string;
  subtitle?: string;
  meta?: PdfMetaItem[];
  sections?: Array<{ title: string; lines: Array<string | number | null | undefined> }>;
  tables?: Array<{ title?: string; table: PdfTable }>;
  totals?: PdfMetaItem[];
  signatures?: string[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function safeText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[•–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "");
}

function escapePdfText(value: string | number | null | undefined) {
  return safeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textWidth(value: string, size: number) {
  return safeText(value).length * size * 0.52;
}

function wrapText(value: string | number | null | undefined, maxWidth: number, size: number) {
  const text = safeText(value).trim();
  if (!text) {
    return [""];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size) <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

class PdfBuilder {
  private pages: string[][] = [[]];
  private y = PAGE_HEIGHT - MARGIN;
  private contentTruncated = false;

  private get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private raw(command: string) {
    this.currentPage.push(command);
  }

  private ensureSpace(height: number) {
    if (this.y - height >= MARGIN) {
      return true;
    }
    this.contentTruncated = true;
    return false;
  }

  private drawTextAt(value: string | number | null | undefined, x: number, y: number, size = 10, bold = false) {
    const font = bold ? "F2" : "F1";
    this.raw(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`);
  }

  private rule() {
    if (!this.ensureSpace(8)) {
      return;
    }
    this.raw(`0.75 w ${MARGIN} ${this.y.toFixed(2)} m ${PAGE_WIDTH - MARGIN} ${this.y.toFixed(2)} l S`);
    this.y -= 10;
  }

  addText(value: string | number | null | undefined, options: { size?: number; bold?: boolean; gap?: number } = {}) {
    const size = options.size ?? 10;
    const lineHeight = size + 3;
    const lines = wrapText(value, CONTENT_WIDTH, size);
    if (!this.ensureSpace(lines.length * lineHeight + (options.gap ?? 0))) {
      return;
    }
    for (const line of lines) {
      this.drawTextAt(line, MARGIN, this.y, size, options.bold);
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 0;
  }

  addMeta(items: PdfMetaItem[]) {
    if (!items.length) {
      return;
    }
    if (!this.ensureSpace(Math.ceil(items.length / 2) * 26 + 8)) {
      return;
    }
    const colWidth = CONTENT_WIDTH / 2 - 12;
    for (let index = 0; index < items.length; index += 2) {
      const row = items.slice(index, index + 2);
      row.forEach(([label, value], column) => {
        const x = MARGIN + column * (colWidth + 24);
        this.drawTextAt(label, x, this.y, 7, true);
        this.drawTextAt(value || "None recorded", x, this.y - 11, 8.5, false);
      });
      this.y -= 26;
    }
    this.y -= 4;
  }

  addSection(title: string, lines: Array<string | number | null | undefined>) {
    this.addText(title, { size: 11, bold: true, gap: 1 });
    lines.forEach((line) => this.addText(line || "None recorded.", { size: 8.5, gap: 0 }));
    this.y -= 4;
  }

  addTable(title: string | undefined, table: PdfTable) {
    if (title) {
      this.addText(title, { size: 11, bold: true, gap: 1 });
    }

    const widths = table.widths ?? table.headers.map(() => CONTENT_WIDTH / table.headers.length);
    if (!this.ensureSpace(24)) {
      return;
    }
    let x = MARGIN;
    table.headers.forEach((header, index) => {
      this.drawTextAt(header.toUpperCase(), x, this.y, 7, true);
      x += widths[index] ?? 80;
    });
    this.y -= 10;
    this.rule();

    for (const row of table.rows) {
      const wrappedCells = row.map((cell, index) => wrapText(cell, (widths[index] ?? 80) - 6, 8));
      const rowLines = Math.max(...wrappedCells.map((cell) => cell.length));
      const rowHeight = rowLines * 10 + 5;
      if (!this.ensureSpace(rowHeight)) {
        break;
      }

      for (let lineIndex = 0; lineIndex < rowLines; lineIndex += 1) {
        let cellX = MARGIN;
        wrappedCells.forEach((cell, cellIndex) => {
          this.drawTextAt(cell[lineIndex] ?? "", cellX, this.y - lineIndex * 10, 8, false);
          cellX += widths[cellIndex] ?? 80;
        });
      }
      this.y -= rowHeight;
    }
    this.y -= 4;
  }

  addTotals(items: PdfMetaItem[]) {
    if (!items.length) {
      return;
    }
    this.rule();
    for (const [label, value] of items) {
      if (!this.ensureSpace(14)) {
        return;
      }
      this.drawTextAt(label, MARGIN, this.y, 9, true);
      this.drawTextAt(value, PAGE_WIDTH - MARGIN - 170, this.y, 9, true);
      this.y -= 14;
    }
    this.y -= 6;
  }

  addSignatures(labels: string[]) {
    if (!labels.length) {
      return;
    }
    if (!this.ensureSpace(46)) {
      return;
    }
    const colWidth = CONTENT_WIDTH / labels.length;
    labels.forEach((label, index) => {
      const x = MARGIN + index * colWidth;
      const lineEnd = x + colWidth - 18;
      this.raw(`0.75 w ${x.toFixed(2)} ${this.y.toFixed(2)} m ${lineEnd.toFixed(2)} ${this.y.toFixed(2)} l S`);
      this.drawTextAt(label, x, this.y - 12, 8, false);
    });
    this.y -= 36;
  }

  build() {
    if (this.contentTruncated && this.y - 18 >= MARGIN) {
      this.drawTextAt("Additional details remain available in the EHR record.", MARGIN, this.y, 8, true);
    }

    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

    const pageIds: number[] = [];
    let nextId = 5;
    for (const commands of this.pages) {
      const stream = commands.join("\n");
      const contentId = nextId;
      const pageId = nextId + 1;
      nextId += 2;
      objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      pageIds.push(pageId);
    }

    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = Buffer.byteLength(pdf, "utf8");
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) {
      pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "utf8");
  }
}

export function createReceiptPdf(input: PdfReceiptInput) {
  const pdf = new PdfBuilder();
  pdf.addText("Hospital EHR", { size: 11, bold: true, gap: 2 });
  pdf.addText(input.title, { size: 22, bold: true, gap: 2 });
  if (input.subtitle) {
    pdf.addText(input.subtitle, { size: 10, gap: 8 });
  }
  if (input.meta?.length) {
    pdf.addMeta(input.meta);
  }
  input.tables?.forEach((item) => pdf.addTable(item.title, item.table));
  input.sections?.forEach((section) => pdf.addSection(section.title, section.lines));
  if (input.totals?.length) {
    pdf.addTotals(input.totals);
  }
  if (input.signatures?.length) {
    pdf.addSignatures(input.signatures);
  }
  return pdf.build();
}

export function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}

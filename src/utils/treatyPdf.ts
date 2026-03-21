import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFPage, type PDFFont } from "pdf-lib";
import { formatArticleHeading } from "@/utils/articleHeadings";

type TreatyArticle = {
  id: string;
  order: number;
  heading: string;
  body: string;
};

type TreatyData = {
  title: string;
  preamble: string | null;
  articles: TreatyArticle[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 68;
const MARGIN_TOP = 62;
const MARGIN_BOTTOM = 62;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BODY_SIZE = 11;
const ARTICLE_SIZE = 14;
const TITLE_SIZE = 26;
const SIGNATURE_SIZE = 11;
const BODY_LINE_HEIGHT = 16;
const ARTICLE_LINE_HEIGHT = 18;

const GAR_REGULAR = "C:\\Windows\\Fonts\\GARA.TTF";
const GAR_BOLD = "C:\\Windows\\Fonts\\GARABD.TTF";
const GAR_ITALIC = "C:\\Windows\\Fonts\\GARAIT.TTF";

function splitPreambleNicely(text: string) {
  return text
    .replace(/\s+(?=(WISHING|DETERMINED|RECOGNISING|AGREEING)\b)/g, "\n\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, lineHeight: number) {
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursor, font, size });
    cursor -= lineHeight;
  }
  return cursor;
}

function drawWrappedParagraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = wrapText(text, font, size, maxWidth);
  const nextY = drawLines(page, lines, x, y, font, size, lineHeight);
  return nextY - 6;
}

function createPage(pdfDoc: PDFDocument) {
  return pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function parseArticleLines(body: string) {
  return body.split(/\r?\n/).map((raw) => raw.trim()).filter(Boolean);
}

function ensureSpace(pdfDoc: PDFDocument, page: PDFPage, cursorY: number, neededHeight: number) {
  if (cursorY - neededHeight >= MARGIN_BOTTOM) {
    return { page, cursorY };
  }

  const nextPage = createPage(pdfDoc);
  return { page: nextPage, cursorY: PAGE_HEIGHT - MARGIN_TOP };
}

export async function generateTreatyPdf(treaty: TreatyData) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    readFile(GAR_REGULAR),
    readFile(GAR_BOLD),
    readFile(GAR_ITALIC),
  ]);

  const regular = await pdfDoc.embedFont(regularBytes);
  const bold = await pdfDoc.embedFont(boldBytes);
  const italic = await pdfDoc.embedFont(italicBytes);

  const articlePages = [
    [1, 2],
    [3, 4, 5, 6],
    [7, 8, 9, 10, 11],
    [12, 13, 14],
  ];
  const articlesByOrder = new Map(treaty.articles.map((article) => [article.order, article]));

  let page = createPage(pdfDoc);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP - 18;

  const titleLines = wrapText(treaty.title, bold, TITLE_SIZE, 430);
  for (const line of titleLines) {
    const width = bold.widthOfTextAtSize(line, TITLE_SIZE);
    page.drawText(line, {
      x: (PAGE_WIDTH - width) / 2,
      y: cursorY,
      font: bold,
      size: TITLE_SIZE,
    });
    cursorY -= 34;
  }

  cursorY -= 80;

  for (const paragraph of splitPreambleNicely(treaty.preamble ?? "")) {
    cursorY = drawWrappedParagraph(page, paragraph, MARGIN_X, cursorY, regular, BODY_SIZE, CONTENT_WIDTH, BODY_LINE_HEIGHT);
  }

  cursorY -= 22;

  const drawArticle = (article: TreatyArticle, targetPage: PDFPage, startY: number) => {
    let localPage = targetPage;
    let localY = startY;

    ({ page: localPage, cursorY: localY } = ensureSpace(pdfDoc, localPage, localY, 40));
    localPage.drawText(formatArticleHeading(article.order, article.heading), {
      x: MARGIN_X,
      y: localY,
      font: bold,
      size: ARTICLE_SIZE,
    });
    localY -= ARTICLE_LINE_HEIGHT + 8;

    for (const line of parseArticleLines(article.body)) {
      const numbered = line.match(/^(\d+)\.\s+(.*)$/);
      if (numbered) {
        const wrapped = wrapText(numbered[2], regular, BODY_SIZE, CONTENT_WIDTH - 22);
        const needed = wrapped.length * BODY_LINE_HEIGHT + 6;
        ({ page: localPage, cursorY: localY } = ensureSpace(pdfDoc, localPage, localY, needed));
        localPage.drawText(`${numbered[1]}.`, { x: MARGIN_X, y: localY, font: regular, size: BODY_SIZE });
        localY = drawLines(localPage, wrapped, MARGIN_X + 22, localY, regular, BODY_SIZE, BODY_LINE_HEIGHT) - 6;
        continue;
      }

      const subClause = line.match(/^(?:\(([A-Za-z])\)|([A-Za-z])\)|([A-Za-z])\.)\s+(.*)$/);
      if (subClause) {
        const letter = (subClause[1] || subClause[2] || subClause[3] || "").toLowerCase();
        const wrapped = wrapText(subClause[4] ?? "", regular, BODY_SIZE, CONTENT_WIDTH - 34);
        const needed = wrapped.length * BODY_LINE_HEIGHT + 6;
        ({ page: localPage, cursorY: localY } = ensureSpace(pdfDoc, localPage, localY, needed));
        localPage.drawText(`(${letter})`, { x: MARGIN_X + 18, y: localY, font: regular, size: BODY_SIZE });
        localY = drawLines(localPage, wrapped, MARGIN_X + 42, localY, regular, BODY_SIZE, BODY_LINE_HEIGHT) - 6;
        continue;
      }

      const wrapped = wrapText(line, regular, BODY_SIZE, CONTENT_WIDTH);
      const needed = wrapped.length * BODY_LINE_HEIGHT + 6;
      ({ page: localPage, cursorY: localY } = ensureSpace(pdfDoc, localPage, localY, needed));
      localY = drawLines(localPage, wrapped, MARGIN_X, localY, regular, BODY_SIZE, BODY_LINE_HEIGHT) - 6;
    }

    return { page: localPage, cursorY: localY - 24 };
  };

  for (const order of articlePages[0]) {
    const article = articlesByOrder.get(order);
    if (!article) continue;
    ({ page, cursorY } = drawArticle(article, page, cursorY));
  }

  for (let i = 1; i < articlePages.length; i++) {
    page = createPage(pdfDoc);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;

    for (const order of articlePages[i]) {
      const article = articlesByOrder.get(order);
      if (!article) continue;
      ({ page, cursorY } = drawArticle(article, page, cursorY));
    }

    if (i === articlePages.length - 1) {
      cursorY -= 18;
      cursorY = drawWrappedParagraph(
        page,
        "In witness whereof, the undersigned Plenipotentiaries have signed this Treaty and affixed their seals.",
        MARGIN_X,
        cursorY,
        regular,
        BODY_SIZE,
        CONTENT_WIDTH,
        BODY_LINE_HEIGHT,
      );
      cursorY = drawWrappedParagraph(
        page,
        "Done at Versailles, the Fifth day of June 1872.",
        MARGIN_X,
        cursorY,
        regular,
        BODY_SIZE,
        CONTENT_WIDTH,
        BODY_LINE_HEIGHT,
      );
    }
  }

  page = createPage(pdfDoc);
  cursorY = PAGE_HEIGHT - MARGIN_TOP - 18;

  const signatures = [
    {
      label: "For the French Third Republic:",
      line: "Pierre Marchand, Deputy of Paris, Plenipotentiary of the French Third Republic",
    },
    {
      label: "For the Union of Soviet Socialist Republics:",
      line: "Georgy Alexandrovich Plekhanov, People's Commissar for Foreign Affairs, Plenipotentiary of the Union of Soviet Socialist Republics",
    },
    {
      label: "For the Kingdom of Italy:",
      line: "Agostino Depretis, Prime Minister of the Kingdom of Italy, Plenipotentiary of the Kingdom of Italy",
    },
  ];

  for (const signature of signatures) {
    page.drawText(signature.label, {
      x: MARGIN_X,
      y: cursorY,
      font: bold,
      size: SIGNATURE_SIZE,
    });
    cursorY -= 14;
    const lines = wrapText(signature.line, italic, SIGNATURE_SIZE, 440);
    cursorY = drawLines(page, lines, MARGIN_X, cursorY, italic, SIGNATURE_SIZE, 14) - 18;
  }

  return pdfDoc.save();
}

// Generates the bulk-upload Word template that the admin importer parses.
//   node scripts/generate-template.mjs
// Output: public/templates/SpiritLife-Devotional-Bulk-Template.docx
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "templates");
mkdirSync(OUT_DIR, { recursive: true });

const PURPLE = "6B21A8";
const FLAME = "C2410C";

const H = (text) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: PURPLE })],
    spacing: { before: 240, after: 60 },
  });

const P = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, size: 22, ...opts })],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
  });

// One devotional day block in the exact shape the importer reads.
function day({ date, title, text, keyVerse, message, prayer, families }) {
  const blocks = [
    new Paragraph({
      children: [new TextRun({ text: date, bold: true, size: 24 })],
      spacing: { before: 320, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 24, color: PURPLE })],
      spacing: { after: 60 },
    }),
    new Paragraph({ children: [new TextRun({ text: `Text: ${text}`, size: 22, italics: true })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `Key Verse: ${keyVerse}`, size: 22 })], spacing: { after: 120 } }),
  ];
  for (const para of message) blocks.push(P(para));
  blocks.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Prayer Point: ", bold: true, size: 22, color: FLAME }),
        new TextRun({ text: prayer, size: 22 }),
      ],
      spacing: { after: 60 },
    })
  );
  blocks.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Pray for the following Families: ", bold: true, size: 22, color: FLAME }),
        new TextRun({ text: families, size: 22 }),
      ],
      spacing: { after: 120 },
    })
  );
  return blocks;
}

const divider = new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
  spacing: { after: 120 },
});

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "SpiritLife Daily Devotional", bold: true, size: 40, color: PURPLE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Bulk Upload Template", size: 26, color: FLAME })],
          spacing: { after: 240 },
        }),

        H("How to use this template"),
        P("Write one full year of devotionals in this single Word file, one entry per day, then upload it on the Admin page under “Bulk upload (Word).” Choose the year at upload time — the date headings below do not include the year."),
        P("Keep each day in the exact structure shown in the samples. The importer reads these labels literally, so do not rename them:"),
        P("•  A date heading on its own line: the MONTH in words, the day number, then a comma and the weekday. Example: JANUARY 1, Thursday", { }),
        P("•  The devotional TITLE on the next line."),
        P("•  Text:  — the scripture reading reference."),
        P("•  Key Verse:  — the key verse."),
        P("•  The message body — one or more normal paragraphs (no label)."),
        P("•  Prayer Point:  — the prayer(s). Put several on separate lines to get separate bullets."),
        P("•  Pray for the following Families:  — names separated by semicolons ( ; )."),
        P("Anything above the first date heading (like this instructions section) is ignored, so you can leave these notes in the file. Re-uploading a file updates any days that already exist for that year."),

        divider,
        H("Samples — copy these blocks and fill in each day"),

        ...day({
          date: "JANUARY 1, Thursday",
          title: "GET READY TO CROSS THE JORDAN",
          text: "Joshua 1:1-2",
          keyVerse: "vs. 2 “Moses my servant is dead; therefore arise, go over this Jordan, even to the children of Israel.”",
          message: [
            "We give all the glory to the name of the Lord who spared our lives to witness the first day of the year. It is always good to consider the voice of God at the beginning of a new season, especially for those who aim to finish well.",
            "God told Joshua to arise and cross over the Jordan — not Joshua alone, but with all the children of Israel. In the same way, God is commanding us, leaders and led alike, to prepare and shun complacency to occupy the land He has already given us.",
          ],
          prayer: "I refuse to be complacent at Jordan. I receive courage to cross over to my promised land in the name of Jesus.",
          families: "Elder Mrs Rebecca Akanji, Ibadan; Mr Olasore Adedeji, Ibadan; Mrs Adekemi Okunola, Osogbo",
        }),

        ...day({
          date: "JANUARY 2, Friday",
          title: "I WILL BE WITH YOU",
          text: "Joshua 1:3-5",
          keyVerse: "vs. 5 “There shall not any man be able to stand before thee all the days of thy life… nor forsake thee.”",
          message: [
            "It is always profitable to follow the instructions of God to the letter; those who learn this secret enjoy the blessings therein. God assured Joshua of His abiding presence before sending him out.",
            "Whatever assignment lies before you, the promise stands: He will be with you. Step out in obedience, and you will find Him faithful.",
          ],
          prayer: "Lord, I am ready to take the required steps. Manifest Your presence with me from the beginning to the end of this journey.",
          families: "Mr & Mrs Akinkunmi, Ibadan; James Adeniyi, Ibadan; Olabisi Emmanuel, Ibadan",
        }),

        divider,
        P("Continue adding one block per day, through DECEMBER 31, in the same format.", { italics: true, color: "777777" }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outPath = path.join(OUT_DIR, "SpiritLife-Devotional-Bulk-Template.docx");
writeFileSync(outPath, buffer);
console.log("Wrote", outPath, `(${buffer.length} bytes)`);

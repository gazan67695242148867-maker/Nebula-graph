import { crc32 } from "node:zlib";

/**
 * Hand-rolled binary fixtures so the generator needs no extra dependencies.
 * Output is minimal but valid: a one-page PDF and a stored (uncompressed) DOCX.
 */

/** Build a one-page PDF with a title line and body lines. ASCII only. */
export function makePdf(title: string, lines: string[]): Buffer {
	const esc = (s: string): string => s.replace(/[\\()]/g, (c) => "\\" + c);
	const content = [
		`BT /F1 18 Tf 72 720 Td (${esc(title)}) Tj ET`,
		...lines.map((l, i) => `BT /F1 11 Tf 72 ${690 - i * 16} Td (${esc(l)}) Tj ET`),
	].join("\n");

	const objects: string[] = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];

	let body = "%PDF-1.4\n";
	const offsets: number[] = [];
	objects.forEach((obj, i) => {
		offsets.push(Buffer.byteLength(body, "latin1"));
		body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
	});

	const xrefOffset = Buffer.byteLength(body, "latin1");
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const off of offsets) {
		body += `${String(off).padStart(10, "0")} 00000 n \n`;
	}
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${esc(title)}) >> >>\n`;
	body += `startxref\n${xrefOffset}\n%%EOF\n`;
	return Buffer.from(body, "latin1");
}

const xmlEscape = (s: string): string =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Build a minimal DOCX (a ZIP with three parts) containing paragraphs of text. */
export function makeDocx(paragraphs: string[]): Buffer {
	const contentTypes =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
		'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
		'<Default Extension="xml" ContentType="application/xml"/>' +
		'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
		"</Types>";
	const rels =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
		'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
		"</Relationships>";
	const paras = paragraphs
		.map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`)
		.join("");
	const document =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
		paras +
		"</w:body></w:document>";

	return makeZip([
		{ name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
		{ name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
		{ name: "word/document.xml", data: Buffer.from(document, "utf8") },
	]);
}

interface ZipEntry {
	name: string;
	data: Buffer;
}

/** Write a ZIP archive using the "stored" method (no compression). */
function makeZip(entries: ZipEntry[]): Buffer {
	const locals: Buffer[] = [];
	const centrals: Buffer[] = [];
	let offset = 0;
	const DOS_DATE_1980_01_01 = 0x21;

	for (const entry of entries) {
		const name = Buffer.from(entry.name, "utf8");
		const crc = crc32(entry.data);
		const size = entry.data.length;

		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0); // local file header signature
		local.writeUInt16LE(20, 4); // version needed
		local.writeUInt16LE(0, 6); // flags
		local.writeUInt16LE(0, 8); // method: stored
		local.writeUInt16LE(0, 10); // time
		local.writeUInt16LE(DOS_DATE_1980_01_01, 12); // date
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(size, 18);
		local.writeUInt32LE(size, 22);
		local.writeUInt16LE(name.length, 26);
		local.writeUInt16LE(0, 28); // extra length
		locals.push(local, name, entry.data);

		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0); // central directory signature
		central.writeUInt16LE(20, 4); // version made by
		central.writeUInt16LE(20, 6); // version needed
		central.writeUInt16LE(0, 8); // flags
		central.writeUInt16LE(0, 10); // method
		central.writeUInt16LE(0, 12); // time
		central.writeUInt16LE(DOS_DATE_1980_01_01, 14); // date
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(size, 20);
		central.writeUInt32LE(size, 24);
		central.writeUInt16LE(name.length, 28);
		central.writeUInt16LE(0, 30); // extra length
		central.writeUInt16LE(0, 32); // comment length
		central.writeUInt16LE(0, 34); // disk number
		central.writeUInt16LE(0, 36); // internal attributes
		central.writeUInt32LE(0, 38); // external attributes
		central.writeUInt32LE(offset, 42); // local header offset
		centrals.push(central, name);

		offset += 30 + name.length + size;
	}

	const centralSize = centrals.reduce((n, b) => n + b.length, 0);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(centralSize, 12);
	end.writeUInt32LE(offset, 16);

	return Buffer.concat([...locals, ...centrals, end]);
}

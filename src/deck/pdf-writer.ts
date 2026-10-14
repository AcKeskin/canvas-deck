/** One page: a JPEG picture that fills the page. */
export interface PdfImagePage {
	jpeg: Uint8Array;
	/** Picture size in pixels. Must match the JPEG. */
	width: number;
	height: number;
}

/** Points per pixel: a 1920 px wide picture makes a 960 pt (13.3 inch) page. */
const PT = 0.5;

/** Writes a PDF with one JPEG per page. */
export function buildPdf(pages: PdfImagePage[]): Uint8Array {
	const chunks: Uint8Array[] = [];
	const offsets: number[] = [];
	let size = 0;
	const put = (b: Uint8Array | string) => {
		const bytes = typeof b === "string" ? new TextEncoder().encode(b) : b;
		chunks.push(bytes);
		size += bytes.length;
	};
	// Object numbers: 1 catalog, 2 page tree, then 3 per page (page, image, content).
	const obj = (n: number, body: string, stream?: Uint8Array) => {
		offsets[n] = size;
		put(`${n} 0 obj\n${body}\n`);
		if (stream) {
			put("stream\n");
			put(stream);
			put("\nendstream\n");
		}
		put("endobj\n");
	};

	put("%PDF-1.4\n%\xff\xff\n");
	obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
	const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
	obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
	pages.forEach((p, i) => {
		const n = 3 + i * 3;
		const w = p.width * PT;
		const h = p.height * PT;
		obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`);
		obj(
			n + 1,
			`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`,
			p.jpeg,
		);
		const draw = new TextEncoder().encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
		obj(n + 2, `<< /Length ${draw.length} >>`, draw);
	});

	const count = 3 + pages.length * 3;
	const xref = size;
	put(`xref\n0 ${count}\n0000000000 65535 f \n`);
	for (let n = 1; n < count; n++) put(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
	put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

	const out = new Uint8Array(size);
	let at = 0;
	for (const c of chunks) {
		out.set(c, at);
		at += c.length;
	}
	return out;
}

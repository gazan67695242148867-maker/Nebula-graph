import type { DocType } from "../types";

const DOC_TYPES: Record<string, DocType> = {
	md: "md",
	markdown: "md",
	pdf: "pdf",
	docx: "docx",
	pptx: "pptx",
	txt: "txt",
	csv: "csv",
	html: "html",
	htm: "html",
};

/** Map a file extension (without the dot) to a graph DocType. Case-insensitive. */
export function docTypeOf(extension: string): DocType {
	return DOC_TYPES[extension.toLowerCase()] ?? "other";
}

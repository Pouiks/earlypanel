import { describe, it, expect } from "vitest";
import {
  detectDocumentMime,
  extensionForDocumentMime,
  fileExtension,
  sanitizeFileName,
  formatBytes,
} from "@/lib/document-validation";

const enc = new TextEncoder();

describe("detectDocumentMime (brief client)", () => {
  it("reconnaît un PDF sur ses octets, quel que soit le nom", () => {
    const pdf = enc.encode("%PDF-1.7\n%âãÏÓ\n1 0 obj");
    expect(detectDocumentMime(pdf, "brief.pdf")).toBe("application/pdf");
    expect(detectDocumentMime(pdf, "brief.txt")).toBe("application/pdf");
  });

  it("accepte un texte UTF-8 en .txt ou .md, et distingue les deux", () => {
    const txt = enc.encode("Objectif : comprendre pourquoi 40 % n'émettent pas de facture.");
    expect(detectDocumentMime(txt, "brief.txt")).toBe("text/plain");
    expect(detectDocumentMime(txt, "brief.md")).toBe("text/markdown");
    expect(detectDocumentMime(txt, "brief.MARKDOWN")).toBe("text/markdown");
  });

  it("refuse un binaire renommé en .txt, un fichier vide et une extension inconnue", () => {
    expect(detectDocumentMime(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01]), "brief.txt")).toBeNull(); // zip/docx
    expect(detectDocumentMime(new Uint8Array([0xff, 0xfe, 0x41]), "brief.txt")).toBeNull(); // pas UTF-8
    expect(detectDocumentMime(new Uint8Array([]), "brief.txt")).toBeNull();
    expect(detectDocumentMime(enc.encode("hello"), "brief.docx")).toBeNull();
    expect(detectDocumentMime(enc.encode("hello"), "brief")).toBeNull();
  });

  it("mappe chaque type vers une extension de stockage", () => {
    expect(extensionForDocumentMime("application/pdf")).toBe("pdf");
    expect(extensionForDocumentMime("text/markdown")).toBe("md");
    expect(extensionForDocumentMime("text/plain")).toBe("txt");
  });
});

describe("noms de fichiers et tailles", () => {
  it("fileExtension : minuscule, sans point, vide si absente", () => {
    expect(fileExtension("Brief-Kalio.PDF")).toBe("pdf");
    expect(fileExtension("notes")).toBe("");
    expect(fileExtension("archive.tar.gz")).toBe("gz");
  });

  it("sanitizeFileName : retire les chemins et caractères dangereux, garde les accents", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\x\\Brief été <v2>.pdf")).toBe("Brief été v2.pdf");
    expect(sanitizeFileName("   ")).toBe("document");
    expect(sanitizeFileName("a".repeat(200)).length).toBe(120);
  });

  it("formatBytes : octets, Ko, Mo avec virgule", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2 Ko");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1,5 Mo");
    expect(formatBytes(-1)).toBe("");
  });
});

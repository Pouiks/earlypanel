"use client";

import { useCallback, useRef, useState } from "react";

interface UploadedImage {
  path: string;
  signed_url: string | null;
}

interface ImageUploaderProps {
  missionId: string;
  questionId: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MAX_DIM = 1920; // Redimension max (px)
const QUALITY = 0.82;
const ALLOWED_CLIENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Compresse une image cote client en JPEG (ou PNG si transparence detectee).
 * Rejete les fichiers non image.
 */
async function compressImage(file: File): Promise<Blob> {
  if (!ALLOWED_CLIENT_TYPES.includes(file.type)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP uniquement)");
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression échouée"))),
      "image/jpeg",
      QUALITY
    );
  });
}

export default function ImageUploader({
  missionId,
  questionId,
  images,
  onChange,
  disabled = false,
  maxImages = 3,
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const available = maxImages - images.length;
      if (available <= 0) {
        setError(`Maximum ${maxImages} images par question.`);
        return;
      }
      const list = Array.from(files).slice(0, available);
      if (list.length < Array.from(files).length) {
        setError(`Seules les ${available} premières images ont été ajoutées.`);
      }

      setUploading(true);
      try {
        const newImages: UploadedImage[] = [];
        for (const file of list) {
          try {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append("file", compressed, file.name);
            fd.append("question_id", questionId);

            const res = await fetch(`/api/testers/missions/${missionId}/images`, {
              method: "POST",
              body: fd,
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data?.error || "Erreur upload");
              continue;
            }
            newImages.push({ path: data.path, signed_url: data.signed_url ?? null });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Erreur upload";
            setError(msg);
          }
        }
        if (newImages.length > 0) {
          onChange([...images, ...newImages]);
        }
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, missionId, onChange, questionId]
  );

  async function handleRemove(path: string) {
    try {
      const res = await fetch(`/api/testers/missions/${missionId}/images`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question_id: questionId, path }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Erreur suppression");
        return;
      }
      onChange(images.filter((i) => i.path !== path));
    } catch {
      setError("Erreur suppression");
    }
  }

  return (
    <div>
      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {images.map((img) => (
            <div
              key={img.path}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 10,
                overflow: "hidden",
                background: "#f5f5f7",
                border: "0.5px solid rgba(0,0,0,0.08)",
              }}
            >
              {img.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.signed_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ padding: 10, fontSize: 11, color: "#86868b" }}>
                  Chargement…
                </div>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(img.path)}
                  aria-label="Supprimer l'image"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 980,
                    border: "none",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && images.length < maxImages && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            padding: "20px 16px",
            borderRadius: 12,
            border: `1.5px dashed ${dragOver ? "#0A7A5A" : "rgba(0,0,0,0.18)"}`,
            background: dragOver ? "#f0faf5" : "#fafafa",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            transition: "all 150ms",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>
            {uploading ? "Envoi en cours…" : "Glissez vos captures ou cliquez ici"}
          </div>
          <div style={{ fontSize: 11, color: "#86868b" }}>
            JPEG · PNG · WebP · {maxImages - images.length} emplacement{maxImages - images.length > 1 ? "s" : ""} restant{maxImages - images.length > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#dc2626",
            background: "#fef2f2",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

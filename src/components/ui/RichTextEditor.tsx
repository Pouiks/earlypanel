"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "6px 10px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? "#0A7A5A" : "#6e6e73",
        background: active ? "#f0faf5" : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 150ms",
        fontFamily: "inherit",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Décrivez le projet en détail…",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height: 180px",
          "padding: 16px",
          "outline: none",
          "font-size: 14px",
          "line-height: 1.7",
          "color: #1d1d1f",
          "font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        ].join("; "),
      },
    },
  });

  if (!editor) return null;

  function addLink() {
    const url = window.prompt("URL du lien :");
    if (url) {
      editor!.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div style={{
      border: "0.5px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      overflow: "hidden",
      background: "#fff",
      transition: "border-color 200ms",
    }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        padding: "8px 10px",
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        background: "#fafafa",
      }}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Gras"
        >
          <strong>G</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italique"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Souligné"
        >
          <u>S</u>
        </ToolbarButton>

        <div style={{ width: 1, background: "rgba(0,0,0,0.08)", margin: "0 4px" }} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Titre"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Sous-titre"
        >
          H3
        </ToolbarButton>

        <div style={{ width: 1, background: "rgba(0,0,0,0.08)", margin: "0 4px" }} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Liste à puces"
        >
          • Liste
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Liste numérotée"
        >
          1. Liste
        </ToolbarButton>

        <div style={{ width: 1, background: "rgba(0,0,0,0.08)", margin: "0 4px" }} />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive("link")}
          title="Lien"
        >
          🔗
        </ToolbarButton>
        {editor.isActive("link") && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Supprimer le lien"
          >
            ✕
          </ToolbarButton>
        )}
      </div>

      <EditorContent editor={editor} />

      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 16px 0 8px;
          letter-spacing: -0.02em;
        }
        .tiptap h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 12px 0 6px;
        }
        .tiptap ul, .tiptap ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        .tiptap a {
          color: #0A7A5A;
          text-decoration: underline;
        }
        .tiptap p {
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
}

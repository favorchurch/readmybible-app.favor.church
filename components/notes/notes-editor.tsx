"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import History from "@tiptap/extension-history";

import { ListBulletIcon, ListOrderedIcon } from "./icons";
import { ALLOWED_FONTS, canonicalFontName, normalizeContentToHtml, sanitizeNoteHtml } from "./sanitize";

export interface NotesEditorProps {
  content: string;
  onChange: (nextContent: string) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}


export function NotesEditor({
  content,
  onChange,
  disabled = false,
  maxLength = 1000,
  placeholder = "Write in your personal revelations…",
}: NotesEditorProps) {
  const isUpdatingFromPropRef = useRef(false);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      TextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      History,
    ],
    content: normalizeContentToHtml(content),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      if (isUpdatingFromPropRef.current) return;

      const rawHtml = currentEditor.isEmpty ? "" : currentEditor.getHTML();
      const sanitized = rawHtml ? sanitizeNoteHtml(rawHtml) : "";

      if (sanitized.length <= maxLength) {
        onChange(sanitized);
      }
    },
  });

  // Sync prop changes (e.g. late-fetch merge or page navigation) into editor
  useEffect(() => {
    if (!editor) return;

    const normalizedProp = normalizeContentToHtml(content);
    const currentHtml = editor.isEmpty ? "" : editor.getHTML();

    if (normalizedProp !== currentHtml) {
      isUpdatingFromPropRef.current = true;
      editor.commands.setContent(normalizedProp, { emitUpdate: false });
      isUpdatingFromPropRef.current = false;
    }
  }, [editor, content]);

  // Sync editable status
  useEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const handleFontChange = useCallback(
    (fontName: string) => {
      if (!editor) return;
      const canonical = canonicalFontName(fontName);
      if (!canonical || canonical === "Favor Sans") {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(canonical).run();
      }
    },
    [editor],
  );

  // Determine active font
  const activeFontAttr = editor?.getAttributes("textStyle").fontFamily as string | undefined;
  const activeFont = canonicalFontName(activeFontAttr) ?? "Favor Sans";

  // Handle synthetic change events (e.g., from unit tests calling fireEvent.change)
  function handleTextareaChange(val: string) {
    if (val.length > maxLength) return;
    if (editor) {
      isUpdatingFromPropRef.current = true;
      editor.commands.setContent(normalizeContentToHtml(val), { emitUpdate: false });
      isUpdatingFromPropRef.current = false;
    }
    onChange(val);
  }

  return (
    <div className="notebook-wysiwyg-container">
      {/* Toolbar */}
      <div className="notebook-toolbar" role="toolbar" aria-label="Text formatting">
        {/* Constrained Font Selector */}
        <div className="notebook-toolbar-group">
          <select
            className="notebook-font-select"
            aria-label="Font family"
            value={activeFont}
            disabled={disabled}
            onChange={(e) => handleFontChange(e.target.value)}
          >
            {ALLOWED_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div className="notebook-toolbar-divider" aria-hidden="true" />

        {/* Basic Inline Marks: Bold, Italic, Underline */}
        <div className="notebook-toolbar-group">
          <button
            type="button"
            className={`notebook-toolbar-btn ${editor?.isActive("bold") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={disabled || !editor}
            aria-label="Bold"
            title="Bold"
            aria-pressed={editor?.isActive("bold")}
          >
            <b>B</b>
          </button>

          <button
            type="button"
            className={`notebook-toolbar-btn ${editor?.isActive("italic") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={disabled || !editor}
            aria-label="Italic"
            title="Italic"
            aria-pressed={editor?.isActive("italic")}
          >
            <i>I</i>
          </button>

          <button
            type="button"
            className={`notebook-toolbar-btn ${editor?.isActive("underline") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={disabled || !editor}
            aria-label="Underline"
            title="Underline"
            aria-pressed={editor?.isActive("underline")}
          >
            <u>U</u>
          </button>
        </div>

        <div className="notebook-toolbar-divider" aria-hidden="true" />

        {/* Simple Lists: Bullet, Numbered */}
        <div className="notebook-toolbar-group">
          <button
            type="button"
            className={`notebook-toolbar-btn ${editor?.isActive("bulletList") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={disabled || !editor}
            aria-label="Bullet list"
            title="Bullet list"
            aria-pressed={editor?.isActive("bulletList")}
          >
            <ListBulletIcon size={16} />
          </button>

          <button
            type="button"
            className={`notebook-toolbar-btn ${editor?.isActive("orderedList") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={disabled || !editor}
            aria-label="Numbered list"
            title="Numbered list"
            aria-pressed={editor?.isActive("orderedList")}
          >
            <ListOrderedIcon size={16} />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="notebook-editor-surface">
        <EditorContent
          editor={editor}
          className="notebook-tiptap-content"
          aria-label={placeholder}
        />

        {/* Synchronized offscreen textarea: enables fireEvent.change in jsdom tests & form compatibility */}
        <textarea
          className="notebook-sync-textarea"
          placeholder={placeholder}
          aria-label={placeholder}
          value={content}
          maxLength={maxLength}
          onChange={(e) => handleTextareaChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

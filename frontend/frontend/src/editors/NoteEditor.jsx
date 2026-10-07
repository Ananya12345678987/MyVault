import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";

import FormField from "../components/FormField";
import { safeHref } from "../lib/links";
import "./note.css";

/*
 * Notes: a title and a rich-text body (bold, italic, underline, two
 * heading sizes, bulleted / numbered / checklist, links, code).
 *
 * The saved HTML is only ever loaded back into this editor, which keeps
 * just the elements and attributes it knows (scripts, event handlers and
 * unknown tags are dropped on load). It is never put into the page as
 * raw HTML, and links are limited to http(s)/mailto.
 */

function Tool({ label, active, onClick, children, wide }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={Boolean(active)}
      // keep the text selection while a toolbar button is pressed
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 items-center justify-center border text-sm transition-colors ${
        wide ? "min-w-[2.25rem] px-2" : "w-8"
      } ${
        active
          ? "border-vault-green bg-vault-green/10 text-vault-green"
          : "border-transparent text-text-muted hover:border-border hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;

export default function NoteEditor({ draft, setDraft }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => /^(https?:|mailto:)/i.test(url),
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: draft.noteContent, // the starting content only; the editor owns it afterwards
    editorProps: {
      attributes: {
        class: "note-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Note content",
      },
    },
    onUpdate: ({ editor: current }) =>
      setDraft((d) => ({ ...d, noteContent: current.getHTML() })),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        task: e.isActive("taskList"),
        link: e.isActive("link"),
        code: e.isActive("code") || e.isActive("codeBlock"),
        empty: e.isEmpty,
      },
  });

  if (!editor || !state) return null;
  const run = () => editor.chain().focus();

  function toggleCode() {
    const { from, to } = editor.state.selection;
    const sameBlock = editor.state.doc.resolve(from).sameParent(editor.state.doc.resolve(to));
    // A few selected words become inline code; otherwise it is a code block.
    if (from !== to && sameBlock) run().toggleCode().run();
    else run().toggleCodeBlock().run();
  }

  function openLink() {
    setLinkValue(editor.getAttributes("link").href || "");
    setLinkError("");
    setLinkOpen(true);
  }

  function applyLink() {
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError("Enter a web address starting with http:// or https://");
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as a link.
      run()
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      run().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  function removeLink() {
    run().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div className="space-y-6">
      <FormField label="Title" htmlFor="item-title">
        <input
          id="item-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Note title"
          maxLength={200}
          autoFocus
          className="input-field"
        />
      </FormField>

      <div className="border border-border bg-surface focus-within:border-vault-green">
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
        >
          <Tool label="Bold" active={state.bold} onClick={() => run().toggleBold().run()}>
            <span className="font-bold">B</span>
          </Tool>
          <Tool label="Italic" active={state.italic} onClick={() => run().toggleItalic().run()}>
            <span className="italic">I</span>
          </Tool>
          <Tool label="Underline" active={state.underline} onClick={() => run().toggleUnderline().run()}>
            <span className="underline">U</span>
          </Tool>
          <Divider />
          <Tool label="Heading 1" wide active={state.h1} onClick={() => run().toggleHeading({ level: 1 }).run()}>
            H1
          </Tool>
          <Tool label="Heading 2" wide active={state.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
            H2
          </Tool>
          <Divider />
          <Tool label="Bulleted list" active={state.bullet} onClick={() => run().toggleBulletList().run()}>
            •
          </Tool>
          <Tool label="Numbered list" wide active={state.ordered} onClick={() => run().toggleOrderedList().run()}>
            1.
          </Tool>
          <Tool label="Checklist" active={state.task} onClick={() => run().toggleTaskList().run()}>
            ✓
          </Tool>
          <Divider />
          <Tool label="Link" wide active={state.link} onClick={openLink}>
            Link
          </Tool>
          <Tool label="Code" wide active={state.code} onClick={toggleCode}>
            <span className="font-mono">{"</>"}</span>
          </Tool>
        </div>

        {linkOpen && (
          <div className="border-b border-border bg-surface-alt/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Link address"
                value={linkValue}
                onChange={(e) => {
                  setLinkValue(e.target.value);
                  setLinkError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="https://example.com"
                autoFocus
                className="min-w-0 flex-1 border border-border bg-bg px-3 py-1.5 text-sm outline-none placeholder:text-text-muted focus:border-vault-green"
              />
              <button type="button" onClick={applyLink} className="border border-vault-green/60 px-3 py-1.5 text-sm text-vault-green hover:bg-vault-green/10">
                Apply
              </button>
              {state.link && (
                <button type="button" onClick={removeLink} className="border border-border px-3 py-1.5 text-sm text-text-muted hover:text-danger">
                  Remove link
                </button>
              )}
              <button type="button" onClick={() => setLinkOpen(false)} className="px-2 py-1.5 text-sm text-text-muted hover:text-text">
                Cancel
              </button>
            </div>
            {linkError && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {linkError}
              </p>
            )}
          </div>
        )}

        <div className="relative">
          {state.empty && (
            <p className="pointer-events-none absolute left-4 top-3.5 text-sm text-text-muted" aria-hidden="true">
              Write your note here…
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

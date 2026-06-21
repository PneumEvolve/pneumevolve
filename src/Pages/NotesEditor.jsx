import React, { useRef, useEffect, useCallback } from "react";

const LINE = "#D9D3C4";
const LINE_SOFT = "#EAE5D8";
const MUTED = "#8C8676";
const INK = "#2B2925";
const ACCENT = "#5C7A5C";
const FONT_BODY = "'Inter', system-ui, sans-serif";

// Stores/loads as HTML (contentEditable's native format). Renders a small
// toolbar above an editable area — no markdown syntax for the user to learn.
// Toolbar acts on the current text selection via document.execCommand,
// which is deprecated but still broadly supported and is by far the
// simplest way to get bold/list/link behavior without pulling in a full
// editor library (Slate/TipTap/etc) for what is, for now, a pretty small surface.
//
// Save behavior: every keystroke calls onChange (so parent state + the
// debounced autosave stay current), but onBlur calls onChangeImmediate
// instead — this bypasses the debounce entirely and saves right away, so
// leaving the field (clicking elsewhere, tabbing away, closing the page)
// doesn't leave anything sitting in a pending timer that a refresh could
// wipe out.
export default function NotesEditor({ value, onChange, onChangeImmediate, placeholder = "Notes, thoughts, links…" }) {
  const ref = useRef(null);
  // Intentionally NOT initialized to `value` — if it were, the sync effect
  // below would see value === lastValueRef.current on the very first render
  // and skip writing into the DOM entirely, leaving the contentEditable div
  // empty even though `value` (e.g. loaded notes from the server) is non-empty.
  // Seeding this as null guarantees the first run of the effect always finds
  // a mismatch and actually populates the editor on mount.
  const lastValueRef = useRef(null);

  // Only push external value into the DOM when it actually changed from
  // outside (e.g. loading from server) — never on every keystroke, or the
  // cursor will jump around.
  useEffect(() => {
    if (ref.current && value !== lastValueRef.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || "";
      lastValueRef.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const emitImmediate = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValueRef.current = html;
    // Always tell the parent about the latest value, then ask it to save
    // right now instead of waiting on the debounce timer.
    onChange(html);
    if (onChangeImmediate) onChangeImmediate(html);
  }, [onChange, onChangeImmediate]);

  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL:");
    if (!url) return;
    ref.current?.focus();
    // If text is selected, wrap it; otherwise insert the URL itself as the label.
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      document.execCommand("insertHTML", false, `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand("createLink", false, url);
      // execCommand createLink doesn't set target/rel — patch the link(s) just made.
      const anchors = ref.current.querySelectorAll(`a[href="${cssEscape(url)}"]`);
      anchors.forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    }
    emit();
  };

  const btnStyle = {
    border: `1px solid ${LINE}`,
    background: "white",
    color: INK,
    borderRadius: 5,
    fontSize: 12.5,
    padding: "4px 9px",
    cursor: "pointer",
    fontFamily: FONT_BODY,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
        <button type="button" style={{ ...btnStyle, fontWeight: 700 }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>B</button>
        <button type="button" style={{ ...btnStyle, fontStyle: "italic" }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>i</button>
        <button type="button" style={btnStyle} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>• list</button>
        <button type="button" style={{ ...btnStyle, color: ACCENT }} onMouseDown={(e) => e.preventDefault()} onClick={addLink}>+ link</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emitImmediate}
        data-placeholder={placeholder}
        className="hg-notes-editable"
        style={{
          minHeight: 140,
          border: `1px solid ${LINE}`,
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 14,
          lineHeight: 1.55,
          background: "white",
          color: INK,
          outline: "none",
        }}
      />
      <style>{`
        .hg-notes-editable:empty:before {
          content: attr(data-placeholder);
          color: ${MUTED};
        }
        .hg-notes-editable a { color: ${ACCENT}; text-decoration: underline; }
        .hg-notes-editable ul { margin: 4px 0 4px 18px; padding: 0; }
      `}</style>
    </div>
  );
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function cssEscape(s) {
  return s.replace(/"/g, '\\"');
}
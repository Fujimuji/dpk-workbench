interface OutputSidebarProps {
  copyStatus: string | null;
  onCopy: () => void;
  outputText: string;
}

export function OutputSidebar({ copyStatus, onCopy, outputText }: OutputSidebarProps) {
  return (
    <aside className="workspace-right-rail">
      <section className="workspace-panel output-sidebar">
        <div className="workspace-panel-header">
          <div>
            <p className="eyebrow">Output</p>
            <h2>Project Momentum output</h2>
            <p className="panel-copy">The Workshop block updates immediately as you edit the map.</p>
          </div>
          <button className="button" disabled={!outputText} onClick={onCopy} type="button">
            Copy output
          </button>
        </div>
        <textarea className="workspace-textarea output-textarea" readOnly spellCheck={false} value={outputText} />
        {copyStatus ? <div className="copy-status">{copyStatus}</div> : null}
      </section>
    </aside>
  );
}

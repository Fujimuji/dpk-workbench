import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { workspaceDisclosureVariants } from '@/features/workspace/motion/workspaceMotion';

interface CanvasNodeEditorDisclosureSectionProps {
  children: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  title: string;
}

export function CanvasNodeEditorDisclosureSection({
  children,
  collapsed,
  onToggle,
  title
}: CanvasNodeEditorDisclosureSectionProps) {
  return (
    <div className={`canvas-node-editor-section${collapsed ? ' is-collapsed' : ''}`}>
      <button
        aria-expanded={!collapsed}
        className="canvas-node-editor-section-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="canvas-node-editor-section-title">{title}</span>
        <ChevronDown className={`canvas-node-editor-section-toggle-icon${collapsed ? ' is-collapsed' : ''}`} size={16} />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            animate="expanded"
            className="canvas-node-field-group canvas-node-editor-section-body"
            exit="collapsed"
            initial="collapsed"
            style={{ overflow: 'hidden' }}
            variants={workspaceDisclosureVariants}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

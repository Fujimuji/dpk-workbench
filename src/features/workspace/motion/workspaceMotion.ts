import type { Transition, Variants } from 'motion/react';

const enterEase = [0.22, 1, 0.36, 1] as const;
const exitEase = [0.4, 0, 1, 1] as const;

export const workspaceMotionTransitions = {
  disclosure: {
    duration: 0.2,
    ease: enterEase
  } satisfies Transition,
  disclosureExit: {
    duration: 0.16,
    ease: exitEase
  } satisfies Transition,
  floating: {
    duration: 0.18,
    ease: enterEase
  } satisfies Transition,
  floatingExit: {
    duration: 0.14,
    ease: exitEase
  } satisfies Transition,
  toast: {
    duration: 0.2,
    ease: enterEase
  } satisfies Transition,
  toastExit: {
    duration: 0.16,
    ease: exitEase
  } satisfies Transition,
  tab: {
    duration: 0.18,
    ease: enterEase
  } satisfies Transition,
  tabExit: {
    duration: 0.14,
    ease: exitEase
  } satisfies Transition
};

export const workspaceDisclosureVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: workspaceMotionTransitions.disclosureExit
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: workspaceMotionTransitions.disclosure
  }
};

export const workspaceScrimVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: workspaceMotionTransitions.floating
  },
  exit: {
    opacity: 0,
    transition: workspaceMotionTransitions.floatingExit
  }
};

export const workspaceToastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: workspaceMotionTransitions.toast
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: workspaceMotionTransitions.toastExit
  }
};

export const workspaceTabVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: workspaceMotionTransitions.tab
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: workspaceMotionTransitions.tabExit
  }
};

export function createWorkspaceFloatingVariants(offset = 8): Variants {
  return {
    initial: {
      opacity: 0,
      y: offset
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: workspaceMotionTransitions.floating
    },
    exit: {
      opacity: 0,
      y: Math.max(4, Math.round(offset * 0.5)),
      transition: workspaceMotionTransitions.floatingExit
    }
  };
}

import { useCallback, useEffect, useRef, useState } from "react";

const OPEN_DURATION = 250;
const CLOSE_DURATION = 200;
const POPOVER_WIDTH = 320;
const SIDE_OFFSET = 12;
const COLLISION_PADDING = 16;

interface UseMorphPopoverOptions {
  isOpen: boolean;
  sourceElement: HTMLElement | null;
  onClose: () => void;
  /** CSS selector — clicks on matching elements skip close (they trigger a switch instead) */
  switchSelector?: string;
}

interface MorphPopoverState {
  sourceRect: DOMRect;
}

interface UseMorphPopoverReturn {
  portalRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
  initialStyle: React.CSSProperties | undefined;
}

function computeFinalPosition(
  sourceRect: DOMRect,
  popoverHeight: number,
): { left: number; top: number } {
  let left = sourceRect.right + SIDE_OFFSET;
  let top = sourceRect.top;

  // Flip to left side if overflowing right
  if (left + POPOVER_WIDTH > window.innerWidth - COLLISION_PADDING) {
    left = sourceRect.left - POPOVER_WIDTH - SIDE_OFFSET;
  }

  // Clamp vertically
  if (top + popoverHeight > window.innerHeight - COLLISION_PADDING) {
    top = window.innerHeight - COLLISION_PADDING - popoverHeight;
  }
  if (top < COLLISION_PADDING) {
    top = COLLISION_PADDING;
  }

  return { left, top };
}

export function useMorphPopover({
  isOpen,
  sourceElement,
  onClose,
  switchSelector,
}: UseMorphPopoverOptions): UseMorphPopoverReturn {
  const portalRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const contentAnimationRef = useRef<Animation | null>(null);
  const rafRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const [morphState, setMorphState] = useState<MorphPopoverState | null>(null);
  const isClosingRef = useRef(false);
  const sourceElementRef = useRef(sourceElement);
  const prevSourceRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;
  sourceElementRef.current = sourceElement;

  // Open animation (with source element — FLIP morph)
  useEffect(() => {
    if (!isOpen || !sourceElement) {
      return;
    }

    // Cancel tracked animations
    animationRef.current?.cancel();
    animationRef.current = null;
    contentAnimationRef.current?.cancel();
    contentAnimationRef.current = null;
    cancelAnimationFrame(rafRef.current);
    isClosingRef.current = false;

    // Restore visibility of previous source element when switching tasks
    if (prevSourceRef.current && prevSourceRef.current !== sourceElement) {
      prevSourceRef.current.style.visibility = "";
    }
    prevSourceRef.current = sourceElement;

    const sourceRect = sourceElement.getBoundingClientRect();

    // Cancel ALL animations on the portal/content (including stale fill:forwards
    // from completed animations whose refs were cleared by onfinish)
    const portal = portalRef.current;
    const content = contentRef.current;
    if (portal) {
      for (const anim of portal.getAnimations()) anim.cancel();
      portal.style.transform = "";
    }
    if (content) {
      for (const anim of content.getAnimations()) anim.cancel();
      content.style.opacity = "";
    }

    if (!isVisible) {
      // First open: position portal at source rect to prevent flash at (0,0)
      setMorphState({ sourceRect });
      setIsVisible(true);
    }

    // Defer animation to next frame so portal is mounted and measurable
    rafRef.current = requestAnimationFrame(() => {
      const portal = portalRef.current;
      const content = contentRef.current;
      if (!portal || !content) return;

      // Hide source element now that the portal is visible
      sourceElement.style.visibility = "hidden";

      // Measure final rect using the portal's actual height
      const portalHeight = portal.offsetHeight;
      const { left, top } = computeFinalPosition(sourceRect, portalHeight);

      // Position portal at final location
      portal.style.left = `${left}px`;
      portal.style.top = `${top}px`;
      portal.style.width = `${POPOVER_WIDTH}px`;

      const finalRect = portal.getBoundingClientRect();

      // Compute inverse transform (from source to final)
      const dx = sourceRect.left - finalRect.left;
      const dy = sourceRect.top - finalRect.top;
      const sx = sourceRect.width / finalRect.width;
      const sy = sourceRect.height / finalRect.height;

      // FLIP animate the portal
      animationRef.current = portal.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            borderRadius: "8px",
          },
          {
            transform: "translate(0, 0) scale(1, 1)",
            borderRadius: "8px",
          },
        ],
        {
          duration: OPEN_DURATION,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );

      // Fade in content with delay
      content.style.opacity = "0";
      contentAnimationRef.current = content.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 150,
        delay: 75,
        easing: "ease-out",
        fill: "forwards",
      });

      animationRef.current.onfinish = () => {
        portal.style.transform = "";
        animationRef.current = null;
      };
      contentAnimationRef.current.onfinish = () => {
        content.style.opacity = "";
        contentAnimationRef.current = null;
      };
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, sourceElement]);

  // Open animation (without source element — fade in at center-right)
  useEffect(() => {
    if (!isOpen || sourceElement) {
      return;
    }

    animationRef.current?.cancel();
    animationRef.current = null;
    contentAnimationRef.current?.cancel();
    contentAnimationRef.current = null;
    cancelAnimationFrame(rafRef.current);
    isClosingRef.current = false;

    // Position in the center of the main content area (right of sidebar)
    const sidebarWidth = 320;
    const contentAreaStart = sidebarWidth;
    const contentAreaWidth = window.innerWidth - contentAreaStart;
    const centerLeft = contentAreaStart + contentAreaWidth / 2 - POPOVER_WIDTH / 2;
    const centerTop = window.innerHeight / 3;
    const syntheticRect = new DOMRect(centerLeft, centerTop, POPOVER_WIDTH, 0);

    setMorphState({ sourceRect: syntheticRect });
    setIsVisible(true);

    rafRef.current = requestAnimationFrame(() => {
      const portal = portalRef.current;
      const content = contentRef.current;
      if (!portal || !content) return;

      const portalHeight = portal.offsetHeight;
      const top = Math.min(centerTop, window.innerHeight - COLLISION_PADDING - portalHeight);
      const left = Math.min(centerLeft, window.innerWidth - COLLISION_PADDING - POPOVER_WIDTH);

      portal.style.left = `${Math.max(COLLISION_PADDING, left)}px`;
      portal.style.top = `${Math.max(COLLISION_PADDING, top)}px`;
      portal.style.width = `${POPOVER_WIDTH}px`;

      // Simple fade + slide-up
      animationRef.current = portal.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: OPEN_DURATION,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );

      animationRef.current.onfinish = () => {
        portal.style.transform = "";
        animationRef.current = null;
      };
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, sourceElement]);

  // Close with reverse animation
  const closeWithAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Cancel any pending open animation frame
    cancelAnimationFrame(rafRef.current);

    const portal = portalRef.current;
    const content = contentRef.current;
    const source = sourceElementRef.current;

    const finish = () => {
      setIsVisible(false);
      setMorphState(null);
      if (source) source.style.visibility = "";
      prevSourceRef.current = null;
      onCloseRef.current();
      // Reset after onClose to prevent re-entry during the close call
      isClosingRef.current = false;
      animationRef.current = null;
      contentAnimationRef.current = null;
    };

    if (!portal || !content) {
      finish();
      return;
    }

    // Cancel any running open animation
    animationRef.current?.cancel();
    animationRef.current = null;
    contentAnimationRef.current?.cancel();
    contentAnimationRef.current = null;

    // Check if source element is still in the DOM
    const canReverse = source?.isConnected ?? false;
    const sourceRect = canReverse ? source?.getBoundingClientRect() : null;

    if (!canReverse || !sourceRect) {
      // Just fade out — store in animationRef so it can be canceled by a switch
      animationRef.current = portal.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        easing: "ease-in",
        fill: "forwards",
      });
      animationRef.current.onfinish = finish;
      return;
    }

    const finalRect = portal.getBoundingClientRect();

    // Compute transform to source rect
    const dx = sourceRect.left - finalRect.left;
    const dy = sourceRect.top - finalRect.top;
    const sx = sourceRect.width / finalRect.width;
    const sy = sourceRect.height / finalRect.height;

    // Fade out content first
    contentAnimationRef.current = content.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 100,
      easing: "ease-in",
      fill: "forwards",
    });

    // Morph back to source
    animationRef.current = portal.animate(
      [
        {
          transform: "translate(0, 0) scale(1, 1)",
          borderRadius: "8px",
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          borderRadius: "8px",
        },
      ],
      {
        duration: CLOSE_DURATION,
        easing: "cubic-bezier(0.5, 0, 0.75, 0)",
        fill: "forwards",
      },
    );

    animationRef.current.onfinish = finish;
  }, []);

  // Trigger close animation when isOpen becomes false
  useEffect(() => {
    if (!isOpen && isVisible && !isClosingRef.current) {
      closeWithAnimation();
    }
  }, [isOpen, isVisible, closeWithAnimation]);

  // Click-outside dismiss
  useEffect(() => {
    if (!isVisible) return;

    let attached = false;

    const handleMouseDown = (e: MouseEvent) => {
      const portal = portalRef.current;
      if (!portal) return;

      // Check if click is inside the portal or any Radix select/popover portals
      const target = e.target as HTMLElement;
      if (portal.contains(target)) return;

      // Don't close if clicking inside a Radix portal (select dropdowns, etc.)
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest("[data-slot='select-content']")) return;

      // Don't close if clicking a switch target — the click will open a new popover
      if (switchSelector && target.closest(switchSelector)) return;

      closeWithAnimation();
    };

    // Delay listener registration to avoid closing on the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
      attached = true;
    }, 0);

    return () => {
      clearTimeout(timer);
      if (attached) {
        document.removeEventListener("mousedown", handleMouseDown);
      }
    };
  }, [isVisible, closeWithAnimation]);

  // Escape key dismiss
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeWithAnimation();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, closeWithAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      animationRef.current?.cancel();
      contentAnimationRef.current?.cancel();
      const source = sourceElementRef.current;
      if (source) source.style.visibility = "";
      if (prevSourceRef.current) {
        prevSourceRef.current.style.visibility = "";
      }
    };
  }, []);

  // Initial style: position at source rect so the portal doesn't flash at (0,0)
  const initialStyle: React.CSSProperties | undefined = morphState
    ? {
        left: morphState.sourceRect.left,
        top: morphState.sourceRect.top,
        width: POPOVER_WIDTH,
        transformOrigin: "top left",
      }
    : undefined;

  return { portalRef, contentRef, isVisible, initialStyle };
}

"use client";
// Tiny fade/slide motion helper (no external dependency)
import React from "react";

type MotionProps = {
  initial?: { opacity?: number; y?: number; x?: number; scale?: number };
  animate?: { opacity?: number; y?: number; x?: number; scale?: number };
  transition?: { delay?: number; duration?: number };
};

function makeMotion<T extends keyof React.JSX.IntrinsicElements>(Tag: T) {
  return function MotionComponent({
    children,
    initial,
    animate,
    transition,
    className,
    ...rest
  }: React.ComponentProps<T> & MotionProps) {
    const [style, setStyle] = React.useState<React.CSSProperties>({
      opacity: initial?.opacity ?? 0,
      transform: `translate(${initial?.x ?? 0}px, ${initial?.y ?? 0}px) scale(${initial?.scale ?? 1})`
    });
    React.useEffect(() => {
      const t = setTimeout(() => {
        setStyle({
          opacity: animate?.opacity ?? 1,
          transform: `translate(${animate?.x ?? 0}px, ${animate?.y ?? 0}px) scale(${animate?.scale ?? 1})`,
          transition: `all ${transition?.duration ?? 0.5}s cubic-bezier(.2,.8,.2,1) ${transition?.delay ?? 0}s`
        });
      }, 20);
      return () => clearTimeout(t);
    }, [animate, transition]);
    return React.createElement(Tag, { className, style, ...rest } as never, children);
  };
}

export const motion = {
  div: makeMotion("div"),
  p: makeMotion("p")
};

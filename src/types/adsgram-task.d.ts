import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "adsgram-task": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-block-id"?: string;
        "data-debug"?: string | boolean;
        "data-debug-console"?: string | boolean;
      };
    }
  }
}

export {};


declare module "epubjs" {
  type RelocatedLocation = {
    start: { cfi?: string };
    end: { cfi?: string };
    percentage?: number;
  };

  type Rendition = {
    display: (target?: string) => Promise<void>;
    on: (event: "relocated", callback: (location: RelocatedLocation) => void) => void;
    destroy: () => void;
    themes: {
      default: (styles: Record<string, string>) => void;
    };
  };

  type Book = {
    renderTo: (
      element: HTMLElement,
      options: { width: string; height: string; flow?: string; manager?: string }
    ) => Rendition;
    destroy: () => void;
    loaded: {
      navigation: Promise<{ toc: Array<{ href: string; label: string }> }>;
    };
  };

  export default function ePub(source: string): Book;
}

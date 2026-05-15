import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  headerAction,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="w-full flex items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex-1 flex items-center justify-between py-4 text-left hover-elevate active-elevate-2 -mx-2 px-2 rounded-md"
          aria-expanded={isOpen}
          data-testid={`button-collapsible-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <span className="font-medium text-base">{title}</span>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
        {headerAction && (
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            data-testid={`header-action-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {headerAction}
          </div>
        )}
      </div>
      <div
        style={{ height: isOpen ? contentHeight : 0 }}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
      >
        <div ref={contentRef} className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

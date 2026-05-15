interface MobileStepWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function MobileStepWrapper({
  title,
  subtitle,
  children,
}: MobileStepWrapperProps) {
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-foreground" data-testid="text-step-title">
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-sm text-muted-foreground"
            data-testid="text-step-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="border-t border-border">{children}</div>
    </div>
  );
}

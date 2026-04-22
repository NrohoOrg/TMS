import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-6 border border-tms-error/20 bg-tms-error/5 rounded-lg",
        className,
      )}
    >
      <div className="h-12 w-12 rounded-full bg-tms-error/10 flex items-center justify-center mb-3">
        <AlertTriangle className="h-6 w-6 text-tms-error" />
      </div>
      <p className="text-sm font-display font-semibold text-tms-error">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

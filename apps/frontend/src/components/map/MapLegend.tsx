import { cn } from "@/lib/utils";

interface MapLegendProps {
  items: Array<{ color: string; label: string }>;
  className?: string;
}

export function MapLegend({ items, className }: MapLegendProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/90 backdrop-blur-sm p-2 text-xs shadow-sm",
        className,
      )}
    >
      <div className="font-display font-semibold text-foreground mb-1">Legend</div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

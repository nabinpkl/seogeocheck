import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as = "h1",
  className,
}: SectionHeadingProps) {
  const HeadingTag = as;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className
      )}
    >
      <div className={cn("space-y-3", align === "center" && "max-w-3xl")}>
        {eyebrow ? (
          <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </Badge>
        ) : null}
        <div className="space-y-2">
          <HeadingTag className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {title}
          </HeadingTag>
          {description ? (
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

type PageShellProps = React.ComponentProps<"section"> & {
  containerClassName?: string;
  size?: "default" | "narrow" | "wide";
};

const sizeClasses: Record<NonNullable<PageShellProps["size"]>, string> = {
  default: "max-w-7xl",
  narrow: "max-w-4xl",
  wide: "max-w-[88rem]",
};

export function PageShell({
  className,
  containerClassName,
  children,
  size = "default",
  ...props
}: PageShellProps) {
  return (
    <section className={cn("px-6 py-10 sm:px-8 lg:px-10", className)} {...props}>
      <div className={cn("mx-auto w-full", sizeClasses[size], containerClassName)}>
        {children}
      </div>
    </section>
  );
}

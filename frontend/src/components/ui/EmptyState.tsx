import * as React from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border border-dashed border-border bg-muted/30", className)}>
      <CardHeader className="items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon ?? <SearchX className="size-6" />}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </CardHeader>
      {action ? (
        <CardContent className="flex justify-center">
          {action}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function EmptyStateAction(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />;
}

"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = React.ComponentProps<typeof Button> & {
  idleLabel: string;
  pendingLabel: string;
};

export function AuthSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  ...props
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} disabled={pending} {...props}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

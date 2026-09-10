"use client";

import Link, { useLinkStatus } from "next/link";
import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoadingDots, LoadingLabel } from "@/components/ui/loading-dots";

function LinkContent({
  children,
  dotsClassName,
  onPendingChange,
}: {
  children: ReactNode;
  dotsClassName?: string;
  onPendingChange: (pending: boolean) => void;
}) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  return (
    <>
      <LoadingLabel hidden={pending}>{children}</LoadingLabel>
      <LoadingDots pending={pending} className={dotsClassName} />
    </>
  );
}

type LoadingLinkProps = Omit<
  ComponentProps<typeof Link>,
  "legacyBehavior" | "passHref"
> & {
  dotsClassName?: string;
  pendingClassName?: string;
};

export function LoadingLink({
  children,
  className,
  dotsClassName,
  pendingClassName,
  onClick,
  ...rest
}: LoadingLinkProps) {
  const [pending, setPending] = useState(false);

  const handlePendingChange = useCallback((next: boolean) => {
    setPending(next);
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (pending) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
    [pending, onClick]
  );

  return (
    <Link
      {...rest}
      className={cn(
        "relative",
        className,
        pending && "pointer-events-none",
        pending && pendingClassName
      )}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={handleClick}
    >
      <LinkContent dotsClassName={dotsClassName} onPendingChange={handlePendingChange}>
        {children}
      </LinkContent>
    </Link>
  );
}

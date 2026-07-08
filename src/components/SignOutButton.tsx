"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({
  label = "Esci",
  variant = "button",
}: {
  label?: string;
  variant?: "button" | "link";
}) {
  if (variant === "link") {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm text-muted hover:text-foreground"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn-ghost px-4 py-2 text-sm"
    >
      {label}
    </button>
  );
}

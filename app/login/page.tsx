"use client";

import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      lede="Pick up where your last session left off."
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      switchPrompt="No account yet?"
      switchLabel="Create one"
      switchHref="/register"
      onSubmit={async (form) => {
        const result = await signIn("credentials", {
          email: form.get("email"),
          password: form.get("password"),
          // Handled here so a failure can be shown in place, rather than
          // bouncing back to this page with ?error= in the URL.
          redirect: false,
        });

        // One message for a wrong password and for an email with no account:
        // saying which is which confirms to a stranger that an address exists.
        return result?.error ? "That email and password don't match." : null;
      }}
    >
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field id="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
    </AuthShell>
  );
}

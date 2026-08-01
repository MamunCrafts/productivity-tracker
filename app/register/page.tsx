"use client";

import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create an account"
      lede="One account holds your habits, hours and notes."
      submitLabel="Create account"
      pendingLabel="Creating…"
      switchPrompt="Already have an account?"
      switchLabel="Sign in"
      switchHref="/login"
      onSubmit={async (form) => {
        const password = form.get("password");

        // The browser enforces required and minlength; it can't compare two
        // fields, so this is the one check worth making before the request.
        if (password !== form.get("confirm")) {
          return "Those passwords don't match.";
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            password,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          // The server's message is the specific one — "an account already
          // exists", "password too short" — so pass it straight through.
          return body.error ?? "Could not create the account.";
        }

        // Straight in rather than back to the sign-in screen: they just typed
        // these details, and asking for them twice is a pointless step.
        const result = await signIn("credentials", {
          email: form.get("email"),
          password,
          redirect: false,
        });

        return result?.error
          ? "Account created, but signing in failed. Try signing in."
          : null;
      }}
    >
      <Field id="name" label="Name">
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          required
        />
      </Field>

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
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field id="confirm" label="Confirm password">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
    </AuthShell>
  );
}

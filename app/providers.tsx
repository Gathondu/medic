"use client";

import Link from "next/link";
import {
  ClerkProvider,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/react";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!clerkPublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (required for Clerk)",
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <nav className="mb-12 flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          MediNotes Pro
        </h1>
        <div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-4">
              <Link
                href="/product"
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Go to App
              </Link>
              <UserButton />
            </div>
          </Show>
        </div>
      </nav>
      {children}
    </ClerkProvider>
  );
}

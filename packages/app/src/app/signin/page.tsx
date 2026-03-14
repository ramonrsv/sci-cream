"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const oauthProviders = [
  { id: "google", name: "Google", icon: "/icons/google.svg" },
  { id: "github", name: "GitHub", icon: "/icons/github.svg" },
];

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div id="signin" className="flex min-h-screen items-center justify-center">
      <div className="signin-container w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/favicon.ico" alt="Sci-Cream" width={40} height={40} />
          <h1 className="text-primary text-xl font-bold">Sign in to Sci-Cream</h1>
          <p className="text-secondary text-sm">Choose a provider to continue</p>
        </div>

        {registered && (
          <div className="signin-success mb-4 p-3">Account created! Sign in below.</div>
        )}

        {error && <div className="signin-failed mb-4 p-3">Sign in failed. Please try again.</div>}

        {/* OAuth providers */}
        <div className="flex flex-col gap-3">
          {oauthProviders.map(({ id, name, icon }) => (
            <button
              key={id}
              onClick={() => signIn(id, { redirectTo: callbackUrl })}
              className="signin-provider flex w-full items-center justify-center gap-3 px-4 py-2.5"
            >
              <Image src={icon} alt={name} width={20} height={20} />
              Continue with {name}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="signin-divider h-px flex-1" />
          <span className="text-secondary text-xs">or</span>
          <div className="signin-divider h-px flex-1" />
        </div>

        {/* Credentials form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn("credentials", { email, password, redirectTo: callbackUrl });
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="signin-input w-full px-4 py-2.5"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="signin-input w-full px-4 py-2.5"
          />
          <button type="submit" className="signin-provider w-full px-4 py-2.5 font-medium">
            <Image
              src="/icons/credentials.svg"
              alt="Credentials"
              width={20}
              height={20}
              className="mr-1 inline"
            />
            Sign in with email
          </button>
        </form>

        <p className="text-secondary mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

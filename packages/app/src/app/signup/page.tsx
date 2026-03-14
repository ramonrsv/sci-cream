"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/signin?registered=true");
  }

  return (
    <div id="signup" className="flex min-h-screen items-center justify-center">
      <div className="signin-container w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/favicon.ico" alt="Sci-Cream" width={40} height={40} />
          <h1 className="text-primary text-xl font-bold">Create an account</h1>
          <p className="text-secondary text-sm">Sign up with email and password</p>
        </div>

        {error && <div className="signin-failed mb-4 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="signin-input w-full px-4 py-2.5"
          />
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
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="signin-input w-full px-4 py-2.5"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="signin-input w-full px-4 py-2.5"
          />
          <button
            id="signup-button"
            type="submit"
            disabled={loading}
            className="signin-provider w-full px-4 py-2.5 font-medium"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-secondary mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

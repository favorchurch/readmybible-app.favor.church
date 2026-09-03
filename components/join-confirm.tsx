"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { joinByCode } from "@/app/actions/joinByCode";
import { useEscapeToClose } from "@/components/use-escape-to-close";

export function JoinConfirm({ code, groupName }: { code: string; groupName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEscapeToClose(() => router.push("/"), !pending && !success);

  async function handleJoin() {
    setPending(true);
    setError(null);
    const result = await joinByCode({ code });
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/"), 1200);
    } else {
      setError(result.error);
    }
  }

  if (success) {
    return (
      <p className="join-success">
        You&apos;re in. Welcome to {groupName}.
      </p>
    );
  }

  return (
    <>
      <button className="primary-button" onClick={handleJoin} disabled={pending}>
        <strong>{pending ? "Joining…" : "Join group"}</strong>
      </button>
      {error && <p className="error-note">{error}</p>}
    </>
  );
}

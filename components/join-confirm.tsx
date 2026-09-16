"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { joinByCode } from "@/app/actions/joinByCode";
import { guardWrite, useTestMode } from "@/components/test-mode";
import { ToastProvider, useToastAction } from "@/components/toast";
import { useEscapeToClose } from "@/components/use-escape-to-close";

export function JoinConfirm(props: { code: string; groupName: string }) {
  // This page (/join/[code]) is a standalone route, not rendered inside
  // AppShell -- it needs its own ToastProvider rather than assuming one
  // already wraps it.
  return (
    <ToastProvider hasBottomNav={false}>
      <JoinConfirmInner {...props} />
    </ToastProvider>
  );
}

function JoinConfirmInner({ code, groupName }: { code: string; groupName: string }) {
  const router = useRouter();
  const testMode = useTestMode(true);
  const guardedJoinByCode = useMemo(() => guardWrite(testMode.active, joinByCode), [testMode.active]);
  const runToastAction = useToastAction();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEscapeToClose(() => router.push("/"), !pending && !success);

  async function handleJoin() {
    setPending(true);
    setError(null);
    const result = await runToastAction("Joining group…", "You're in.", () => guardedJoinByCode({ code }));
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
      <p className="onboarding-note">
        Joining here adds you to this Connect Group in Favor&apos;s records.
      </p>
      <button className="primary-button" onClick={handleJoin} disabled={pending}>
        <strong>{pending ? "Joining…" : "Join group"}</strong>
      </button>
      {error && <p className="error-note">{error}</p>}
    </>
  );
}

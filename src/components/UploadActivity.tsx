"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

export default function UploadActivity() {
  const router = useRouter();
  const tr = useT();
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [assessment, setAssessment] = useState<{
    rating?: string;
    assessment?: string;
    planAdvice?: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    setOk(false);
    setAssessment(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await fetch("/api/activities/ingest", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tr("act.uploadErr"));
      } else {
        setOk(true);
        setAssessment(data.assessment ?? null);
        setFiles(null);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch {
      setError(tr("c.retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h3 className="mb-1 font-semibold">{tr("act.uploadTitle")}</h3>
      <p className="mb-4 text-sm text-muted">
        {tr("act.uploadDesc")}
      </p>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="mb-4 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-medium file:text-brand-fg"
      />
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      {ok && (
        <p className="mb-3 text-sm text-green-500">
          {tr("act.imported")}
        </p>
      )}
      {assessment?.assessment && (
        <div className="mb-3 rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold">{tr("assess.sectionTitle")}</span>
            {assessment.rating && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                {assessment.rating}
              </span>
            )}
          </div>
          <p>{assessment.assessment}</p>
          {assessment.planAdvice && (
            <p className="mt-2 text-muted">
              <span className="font-medium text-foreground">
                {tr("assess.planAdvice")}
              </span>{" "}
              {assessment.planAdvice}
            </p>
          )}
        </div>
      )}
      <button
        type="submit"
        className="btn-brand"
        disabled={loading || !files || files.length === 0}
      >
        {loading ? tr("act.analyzing") : tr("act.importBtn")}
      </button>
    </form>
  );
}

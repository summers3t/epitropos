"use client";

import { useMemo, useState } from "react";

type ReportUploadControlProps = {
    caseId: string;
    reportId: string;
    initialStoragePath: string;
    published: boolean;
    inputClass: string;
};

function getFileNameFromStoragePath(storagePath: string) {
    if (!storagePath) return null;

    const parts = storagePath.split("/");
    const lastPart = parts[parts.length - 1]?.trim();

    return lastPart || null;
}

export default function ReportUploadControl({
    caseId,
    reportId,
    initialStoragePath,
    published,
    inputClass,
}: ReportUploadControlProps) {
    const [storagePath, setStoragePath] = useState(initialStoragePath);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(
        getFileNameFromStoragePath(initialStoragePath)
    );
    const [uploading, setUploading] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentFileName = useMemo(
        () => uploadedFileName || getFileNameFromStoragePath(storagePath),
        [uploadedFileName, storagePath]
    );

    async function handleUploadSelection(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const inputElement = event.currentTarget;
        const selectedFile = inputElement.files?.[0];

        if (!selectedFile) {
            return;
        }

        setUploading(true);
        setNotice(null);
        setError(null);
        setUploadedFileName(selectedFile.name);

        try {
            const uploadData = new FormData();
            uploadData.append("file", selectedFile);
            uploadData.append("case_id", caseId);
            uploadData.append("report_id", reportId);

            const response = await fetch("/api/reports/upload", {
                method: "POST",
                body: uploadData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed.");
            }

            setStoragePath(result.storage_path);
            setNotice("Report uploaded. Save Draft or Publish to persist it.");
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Unexpected upload error."
            );
        } finally {
            inputElement.value = "";
            setUploading(false);
        }
    }

    return (
        <div>
            <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                Report file
            </label>

            <input
                type="hidden"
                name="storage_path"
                value={storagePath}
                readOnly
            />

            {!published ? (
                <div className="space-y-3">
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className={inputClass}
                        onChange={handleUploadSelection}
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="text-xs text-white/60">Uploading…</div>
                    ) : null}

                    {notice ? (
                        <div className="text-xs text-emerald-200">{notice}</div>
                    ) : null}

                    {error ? (
                        <div className="text-xs text-red-300">{error}</div>
                    ) : null}

                    {storagePath ? (
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-3">
                            <div className="text-xs text-emerald-100/90">
                                A report file is currently attached to this draft.
                            </div>

                            <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                    Current file
                                </div>
                                <div className="text-sm text-white/80 break-all">
                                    {currentFileName || "Attached PDF"}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={`/api/reports/${reportId}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                >
                                    Open Attached File
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-white/45">
                            No uploaded file saved yet.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="text-xs text-white/55">
                        Published report file is locked until unpublish.
                    </div>

                    {storagePath ? (
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-3">
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                    Published file
                                </div>
                                <div className="text-sm text-white/80 break-all">
                                    {currentFileName || "Attached PDF"}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={`/api/reports/${reportId}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                >
                                    Open Published File
                                </a>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
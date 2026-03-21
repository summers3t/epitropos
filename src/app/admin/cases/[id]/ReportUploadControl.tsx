"use client";

import { useState } from "react";

type ReportUploadControlProps = {
    caseId: string;
    reportId: string;
    initialFileUrl: string;
    published: boolean;
    inputClass: string;
};

export default function ReportUploadControl({
    caseId,
    reportId,
    initialFileUrl,
    published,
    inputClass,
}: ReportUploadControlProps) {
    const [fileUrl, setFileUrl] = useState(initialFileUrl);
    const [uploading, setUploading] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

            setFileUrl(result.file_url);
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

            <input type="hidden" name="file_url" value={fileUrl} readOnly />

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

                    {fileUrl ? (
                        <div className="text-xs text-white/60">
                            Current file linked below.
                        </div>
                    ) : (
                        <div className="text-xs text-white/45">
                            No uploaded file saved yet.
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-xs text-white/55">
                    Published report file is locked until unpublish.
                </div>
            )}
        </div>
    );
}
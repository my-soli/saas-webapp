"use client";

import { useRef } from "react";
import type { ReactElement } from "react";
import { Paperclip, X, Upload } from "lucide-react";

interface QuoteAttachmentsSectionProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
}

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function QuoteAttachmentsSection({
    files,
    onFilesChange,
}: QuoteAttachmentsSectionProps): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const selected = Array.from(e.target.files || []);
        onFilesChange([...files, ...selected]);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleRemove = (index: number): void => {
        onFilesChange(files.filter((_, i) => i !== index));
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer.files);
        onFilesChange([...files, ...dropped]);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
            </h3>

            {/* Drop zone */}
            <div
                onDragOver={(e): void => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-brand-blue/40 transition-colors cursor-pointer"
                onClick={(): void => inputRef.current?.click()}
            >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                    Drag & drop files here, or{" "}
                    <span className="text-brand-blue font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    PDFs, images, Word docs — any file type accepted
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {/* File list */}
            {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {files.map((file, i) => (
                        <li
                            key={`${file.name}-${i}`}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-400 shrink-0">{formatSize(file.size)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e): void => { e.stopPropagation(); handleRemove(i); }}
                                className="p-1 text-gray-400 hover:text-brand-red rounded transition-colors shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

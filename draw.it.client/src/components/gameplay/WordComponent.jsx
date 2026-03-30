import React from "react";

export default function WordComponent({ word }) {
    return (
        <div className="flex items-center justify-center mb-2">
            <div className="text-center">
                <div
                    className="text-2xl font-bold px-4 py-1 rounded-lg shadow-sm"
                    style={{
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-surface)',
                        border: '2px solid var(--color-primary)'
                    }}
                >
                    {word || "Hidden Word"}
                </div>
            </div>
        </div>
    )
}
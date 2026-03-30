import React from "react";

const RoundComponent = ({ currentRound = 1, totalRounds = null }) => {
    return (
        <div
            className="absolute top-4 left-6 z-10 px-4 py-2 rounded-lg shadow-md text-lg font-semibold"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
            <div className="flex items-center space-x-3">
                <div className="text-sm mr-2" style={{ color: 'var(--color-text-muted)' }}>Round</div>
                <div className="px-3 py-1 font-semibold rounded text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                    {currentRound}{totalRounds ? ` / ${totalRounds}` : ""}
                </div>
            </div>
        </div>
    );
};

export default RoundComponent;
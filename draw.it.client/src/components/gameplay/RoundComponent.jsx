import React from "react";

const RoundComponent = ({ currentRound = 1, totalRounds = null }) => {
    return (
        <div className="absolute top-4 left-6 bg-black z-10 px-4 py-2 rounded-lg shadow-md text-lg font-semibold text-white">
            <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-200 mr-2">Round</div>
                <div className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded">
                    {currentRound}{totalRounds ? ` / ${totalRounds}` : ""}
                </div>
            </div>
        </div>
    );
};

export default RoundComponent;
import Modal from "./Modal";

export default function ScoreModal({ isOpen, onClose, scores = [], title = "Scores" }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <ul className="space-y-2">
                    {scores && scores.length > 0 ? (
                        scores.map((s, i) => (
                            <li key={i}
                                className="flex justify-between items-center p-3 rounded"
                                style={{ backgroundColor: 'var(--color-player-card)' }}
                            >
                                <span className="truncate">{s.name}</span>
                                <span className="font-semibold">{s.points}</span>
                            </li>
                        ))
                    ) : (
                        <li style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            No scores available
                        </li>
                    )}
                </ul>
                <div className="mt-6 text-right">
                    <button
                        className="px-4 py-2 rounded"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    )
}
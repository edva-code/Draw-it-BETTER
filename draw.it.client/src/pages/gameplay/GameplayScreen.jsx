import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import DrawingCanvas from "@/components/gameplay/DrawingCanvas";
import ChatComponent from "@/components/gameplay/ChatComponent.jsx";
import { GameplayHubContext } from "@/utils/GameplayHubProvider.jsx";
import { LobbyHubContext } from "@/utils/LobbyHubProvider.jsx";
import ScoreModal from "@/components/modal/ScoreModal.jsx";
import TimerComponent from "@/components/gameplay/TimerComponent.jsx";
import PlayerStatusList from "@/components/gameplay/PlayerStatusList";
import RoundComponent from "@/components/gameplay/RoundComponent";
import api from "@/utils/api.js";

export default function GameplayScreen() {

    const gameplayConnection = useContext(GameplayHubContext);
    const lobbyConnection = useContext(LobbyHubContext);
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [scoreModalOpen, setScoreModalOpen] = useState(false);
    const [scoreModalTitle, setScoreModalTitle] = useState("");
    const [scoreModalScores, setScoreModalScores] = useState([]);
    const [playerStatuses, setPlayerStatuses] = useState([]);
    const [myName, setMyName] = useState("");
    const [currentWord, setCurrentWord] = useState("");
    const [timer, setTimer] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(null);
    const [voteKickSession, setVoteKickSession] = useState(null);
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        const fetchMyName = async () => {
            try {
                const response = await api.get('/auth/me');

                if (response.status === 200) {
                    const username = response.data.name;
                    setMyName(username);
                } else {
                    console.error("Failed to fetch user data. Status:", response.status);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchMyName();
    }, []);
    
    useEffect(() => {
        if (!lobbyConnection) return;

        lobbyConnection.on("ReceiveVoteKickStarted", (session) => {
            setVoteKickSession({
                ...session,
                votesFor: 1, // Initiator automatically voted FOR
                votesAgainst: 0
            });
            // Reset the voted state for the new session
            setHasVoted(false);
        });

        lobbyConnection.on("ReceiveVoteRegistered", (update) => {
            setVoteKickSession(prev => prev ? { ...prev, votesFor: update.votesFor, votesAgainst: update.votesAgainst } : null);
        });

        lobbyConnection.on("ReceiveVoteKickSuccessful", (targetId) => {
            setVoteKickSession(null);
        });

        lobbyConnection.on("ReceiveVoteKickFailed", (reason) => {
            setVoteKickSession(null);
            alert("Vote Kick failed: " + reason);
        });

        lobbyConnection.on("ReceiveVoteKickCancelled", (reason) => {
            setVoteKickSession(null);
            alert("Vote Kick cancelled: " + reason);
        });

        lobbyConnection.on("ReceiveVoteKickError", (message) => {
            alert(message);
        });

        lobbyConnection.on("ReceiveKickedFromRoom", () => {
            alert("You have been kicked from the room.");
            navigate("/");
        });

        lobbyConnection.on("ReceivePlayerList", (updatedUsers) => {
            setPlayerStatuses(prev => prev.filter(ps => updatedUsers.some(u => u.id === ps.id)));
        });

        return () => {
            lobbyConnection.off("ReceiveVoteKickStarted");
            lobbyConnection.off("ReceiveVoteRegistered");
            lobbyConnection.off("ReceiveVoteKickSuccessful");
            lobbyConnection.off("ReceiveVoteKickFailed");
            lobbyConnection.off("ReceiveVoteKickCancelled");
            lobbyConnection.off("ReceiveVoteKickError");
            lobbyConnection.off("ReceiveKickedFromRoom");
            lobbyConnection.off("ReceivePlayerList");
        };
    }, [lobbyConnection]);

    useEffect(() => {
        if (!gameplayConnection) return;

        gameplayConnection.on("ReceiveMessage", (userName, message, isCorrectGuess) => {
            setMessages((prevMessages) => [...prevMessages, { user: userName, message: message, isCorrect: isCorrectGuess ?? false }]);
        })

        gameplayConnection.on("ReceiveWordToDraw", (word) => {
            setCurrentWord(word);
        });

        gameplayConnection.on("ReceiveTurnStarted", () => {
            setScoreModalOpen(false);
            setMessages([]);
        });

        gameplayConnection.on("ReceiveGameRounds", (rounds) => {
            setTotalRounds(rounds);
        });

        gameplayConnection.on("ReceiveRoundStarted", (currentRoundNumber) => {
            setCurrentRound(currentRoundNumber);
        });

        gameplayConnection.on("ReceivePlayerStatuses", (statuses) => {
            setPlayerStatuses(statuses);
        });

        gameplayConnection.on("ReceiveRoundEnded", (scores) => {
            setScoreModalTitle("Round Results");
            setScoreModalScores(scores || []);
            setScoreModalOpen(true);
        });

        gameplayConnection.on("ReceiveGameEnded", (scores) => {
            setScoreModalTitle("Final Scores");
            setScoreModalScores(scores || []);
            setScoreModalOpen(true);
        });

        
        return () => {
            gameplayConnection.off("ReceiveMessage");
            gameplayConnection.off("ReceiveTurnStarted");
            gameplayConnection.off("ReceiveWordToDraw");
            gameplayConnection.off("ReceiveRoundStarted");
            gameplayConnection.off("ReceiveGameRounds");
            gameplayConnection.off("ReceiveRoundEnded");
            gameplayConnection.off("ReceiveGameEnded");
            gameplayConnection.off("ReceivePlayerStatuses");
        };
    }, [gameplayConnection, roomId]);
    
    const handleSendMessage = async (message) => {
        if (!gameplayConnection) return;
        try {
            await gameplayConnection.invoke("SendMessage", message);
        } catch (error) {
            console.log("Could not send message:", error);
            alert("Error sending message. Please try again.");
        }        
    };

    const handleKickPlayer = async (targetId) => {
        if (!lobbyConnection) return;
        if (voteKickSession) {
            alert("A vote is already in progress.");
            return;
        }
        try {
            await lobbyConnection.invoke("InitiateVoteKick", targetId);
        } catch (error) {
            console.error("Could not initiate kick:", error);
            alert("Error initiating vote kick.");
        }
    };

    const handleVote = async (voteFor) => {
        if (!lobbyConnection || !voteKickSession) return;
        try {
            await lobbyConnection.invoke("RegisterVote", voteKickSession.targetUserId, voteFor);
            setHasVoted(true);
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleCancelVoteKick = async () => {
        if (!lobbyConnection) return;
        try {
            await lobbyConnection.invoke("CancelVoteKick");
        } catch (error) {
            console.error("Could not cancel vote kick:", error);
        }
    };

    const getTargetName = () => {
        if (!voteKickSession) return "";
        const target = playerStatuses.find(p => p.id === voteKickSession.targetUserId);
        return target ? target.name : "Unknown User";
    };

    const getInitiatorName = () => {
        if (!voteKickSession) return "";
        const initiator = playerStatuses.find(p => p.id === voteKickSession.initiatorUserId);
        return initiator ? initiator.name : "Unknown User";
    };

    const isDrawer = playerStatuses.some(
        (player) => player.isDrawer && player.name === myName
    );
    
    return (
        <div style={{ display: 'flex', width: '100vw', height: '90vh', backgroundColor: 'var(--color-bg)', padding: '1rem', overflow: 'hidden', boxSizing: 'border-box' }}>

            <div style={{ position: 'relative', width: '75%', height: '100%', backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', marginRight: '1rem', border: '1px solid var(--color-border)' }}>
                <RoundComponent currentRound={currentRound} totalRounds={totalRounds} />
                <TimerComponent />
                <DrawingCanvas isDrawer={isDrawer} word={currentWord}/>
            </div>

            <div style={{ width: '25%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                <PlayerStatusList
                    players={playerStatuses}
                    currentUserName={myName}
                    onKickPlayer={handleKickPlayer}
                />
                <div style={{ flexGrow: 1 }}>
                    <ChatComponent
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        className="h-full rounded-xl shadow-lg"
                    />
                </div>
            </div>

            <ScoreModal
                isOpen={scoreModalOpen}
                onClose={() => setScoreModalOpen(false)}
                scores={scoreModalScores}
                title={scoreModalTitle}
            />

            {voteKickSession && (!hasVoted && voteKickSession.initiatorUserId !== (playerStatuses.find(p => p.name === myName)?.id) || playerStatuses.find(p => p.name === myName)?.isHost) && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border-2 border-red-500 rounded-lg p-4 shadow-2xl z-50 text-white flex flex-col items-center min-w-[300px]">
                    <h3 className="text-xl font-bold text-red-500 mb-2">Vote Kick</h3>
                    <div className="text-xs text-gray-400 mb-1">Started by: {getInitiatorName()}</div>
                    <p className="mb-4">Kick <span className="font-bold">{getTargetName()}</span> from the room?</p>
                    <div className="flex w-full justify-between mb-3 text-sm font-semibold">
                        <span className="text-green-500">YES: {voteKickSession.votesFor}</span>
                        <span className="text-red-500">NO: {voteKickSession.votesAgainst}</span>
                    </div>
                    {playerStatuses.find(p => p.name === myName)?.isHost && (
                        <button
                            onClick={handleCancelVoteKick}
                            style={{ backgroundColor: 'var(--color-surface-hover)', padding: '0.25rem 1rem', fontSize: '0.75rem', borderRadius: '0.25rem', color: 'var(--color-text)', fontWeight: 'bold', marginBottom: '0.75rem', border: 'none', cursor: 'pointer' }}
                        >
                            CANCEL
                        </button>
                    )}
                    {voteKickSession.targetUserId !== (playerStatuses.find(p => p.name === myName)?.id) &&
                     voteKickSession.initiatorUserId !== (playerStatuses.find(p => p.name === myName)?.id) &&
                     !hasVoted && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => handleVote(true)}
                                style={{ backgroundColor: '#16a34a', padding: '0.5rem 1.5rem', borderRadius: '0.25rem', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                            >
                                YES
                            </button>
                            <button
                                onClick={() => handleVote(false)}
                                style={{ backgroundColor: '#dc2626', padding: '0.5rem 1.5rem', borderRadius: '0.25rem', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                            >
                                NO
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api.js";
import Input from "@/components/input/Input.jsx";
import Button from "@/components/button/Button.jsx";
import colors from "@/constants/colors.js";
import "./ProfileModal.css";
import { FaTrophy, FaChartBar, FaUserFriends, FaLock } from "react-icons/fa";

function ProfileModal({ isOpen, onClose, onAuthChange }) {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    // Profile Tabs: 'stats', 'achievements', 'friends'
    const [activeTab, setActiveTab] = useState("stats");

    // Graph mock state
    const [selectedStat, setSelectedStat] = useState("gamesPlayed"); // gamesPlayed, xp, wins
    const [timeframe, setTimeframe] = useState("weekly"); // daily, weekly, monthly
    const profileContentRef = useRef(null);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [friendsError, setFriendsError] = useState("");
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);

    const getAvatarInitials = (value) => {
        if (!value) return "?";
        const parts = value.trim().split(/\s+/);
        const initials = parts.slice(0, 2).map((part) => part[0]).join("");
        return initials.toUpperCase();
    };

    const getAvatarStyle = (value) => {
        if (!value) return { background: "var(--color-surface-hover)" };
        const palette = [
            ["#f97316", "#ef4444"],
            ["#fb7185", "#f43f5e"],
            ["#f59e0b", "#f97316"],
            ["#34d399", "#10b981"],
            ["#22d3ee", "#0ea5e9"],
            ["#60a5fa", "#3b82f6"],
            ["#a78bfa", "#8b5cf6"],
            ["#f472b6", "#ec4899"],
        ];
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash * 31 + value.charCodeAt(i)) % 1000;
        }
        const [from, to] = palette[hash % palette.length];
        return { background: `linear-gradient(135deg, ${from}, ${to})` };
    };

    const calculateXp = (stats) => {
        if (!stats) return 0;
        const totalScore = Number(stats.totalScore) || 0;
        const gamesPlayed = Number(stats.gamesPlayed) || 0;
        const gamesWon = Number(stats.gamesWon) || 0;
        const correctGuesses = Number(stats.correctGuesses) || 0;
        const fastGuesses = Number(stats.fastGuesses) || 0;
        const xp = totalScore + (gamesPlayed * 10) + (gamesWon * 25) + (correctGuesses * 3) + (fastGuesses * 6);
        return Math.max(0, Math.round(xp));
    };

    const fetchMe = async () => {
        try {
            const res = await api.get("auth/me");
            if (res.status === 200) {
                setUser(res.data);
            }
        } catch (err) {
            setUser(null);
        }
    };

    const loadFriends = async () => {
        if (!user || user.isGuest) return;
        setFriendsLoading(true);
        setFriendsError("");
        try {
            const [friendsRes, requestsRes] = await Promise.all([
                api.get("friend"),
                api.get("friend/requests"),
            ]);
            setFriends(friendsRes.data || []);
            setFriendRequests(requestsRes.data || []);
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Failed to load friends");
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) {
            setFriendsError("Search requires at least 2 characters");
            return;
        }
        setFriendsError("");
        try {
            const res = await api.get(`friend/search?username=${encodeURIComponent(searchQuery.trim())}`);
            setSearchResults(res.data || []);
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Search failed");
        }
    };

    const sendFriendRequest = async (username) => {
        try {
            await api.post("friend/request", { username });
            await loadFriends();
            await handleSearch();
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Failed to send request");
        }
    };

    const acceptFriendRequest = async (friendshipId) => {
        try {
            await api.post(`friend/accept/${friendshipId}`);
            await loadFriends();
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Failed to accept request");
        }
    };

    const declineFriendRequest = async (friendshipId) => {
        try {
            await api.post(`friend/decline/${friendshipId}`);
            await loadFriends();
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Failed to decline request");
        }
    };

    const removeFriend = async (friendId) => {
        try {
            await api.delete(`friend/${friendId}`);
            await loadFriends();
        } catch (err) {
            setFriendsError(err.response?.data?.error || "Failed to remove friend");
        }
    };

    const formatLastSeen = (value) => {
        if (!value) return "Unknown";
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return "Unknown";

        const diffMs = Date.now() - dt.getTime();
        const minutes = Math.floor(diffMs / 60000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        return dt.toLocaleDateString();
    };

    const getFriendStats = (friend) => {
        const gamesPlayed = Number(friend?.gamesPlayed) || 0;
        const gamesWon = Number(friend?.gamesWon) || 0;
        const correctGuesses = Number(friend?.correctGuesses) || 0;
        const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

        return {
            gamesPlayed,
            gamesWon,
            correctGuesses,
            winRate,
        };
    };

    const openFriendDetails = (friend) => {
        setSelectedFriend(friend);
    };

    useEffect(() => {
        if (isOpen) {
            fetchMe();
            setActiveTab("stats"); // Reset tab on open
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeTab === "friends" && user && !user.isGuest) {
            loadFriends();
        }
    }, [isOpen, activeTab, user]);

    useEffect(() => {
        if (!isOpen || !profileContentRef.current) return;
        profileContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeTab, isOpen]);

    const handleRegister = async () => {
        try {
            const res = await api.post("auth/register", { name, email, password });
            setUser(res.data);
            onAuthChange(res.data);
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            alert(err.response?.data?.error || "Register failed");
        }
    };

    const handleLogin = async () => {
        try {
            const res = await api.post("auth/login", { email, password });
            setUser(res.data);
            onAuthChange(res.data);
            setEmail("");
            setPassword("");
        } catch (err) {
            alert(err.response?.data?.error || "Login failed");
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("auth/logout");
            setUser(null);
            onAuthChange(null);
            onClose(); // Optional: close profile on logout
        } catch (err) {
            console.error(err);
        }
    };

    const handleEquipTitle = async (achievementId) => {
        try {
            await api.post("auth/equip-title", { achievementId });
            const res = await api.get("auth/me");
            setUser(res.data);
            onAuthChange(res.data);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to equip title");
        }
    };

    if (!isOpen) return null;

    // --- Chart Data Generator ---
    // Note: Daily breakdowns are not stored yet, so this evenly spreads totals across the timeframe.
    const xpValue = user ? calculateXp(user) : 0;

    const getChartData = () => {
        if (!user) return [];

        let baseValue = 0;
        if (selectedStat === "gamesPlayed") baseValue = user.gamesPlayed;
        else if (selectedStat === "xp") baseValue = xpValue;
        else if (selectedStat === "wins") baseValue = user.gamesWon;
        else if (selectedStat === "guesses") baseValue = user.correctGuesses;

        // Calculate how many columns the account actually deserves.
        const createdAt = user.createdAt ? new Date(user.createdAt) : null;
        const now = new Date();

        const getEarnedCount = (maxCount, unitMs) => {
            if (!createdAt) return maxCount;
            const elapsed = Math.floor((now - createdAt) / unitMs);
            return Math.max(1, Math.min(elapsed + 1, maxCount));
        };

        const DAY_MS   = 1000 * 60 * 60 * 24;
        const WEEK_MS  = DAY_MS * 7;
        const MONTH_MS = DAY_MS * 30;

        let count;
        if (timeframe === "daily")   count = getEarnedCount(7, DAY_MS);
        else if (timeframe === "weekly")  count = getEarnedCount(4, WEEK_MS);
        else                              count = getEarnedCount(6, MONTH_MS);

        if (baseValue <= 0) return Array(count).fill(0);

        const data = [];
        let remaining = baseValue;
        for (let i = 0; i < count; i += 1) {
            const slotsLeft = count - i;
            const share = Math.floor(remaining / slotsLeft);
            data.push(share);
            remaining -= share;
        }
        return data;
    };

    const chartData = getChartData();
    const maxVal = Math.max(...chartData, 10); // Prevent divide by zero

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div
                className="profile-modal"
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
            >
                <div className="profile-modal-header">
                    <h2>My Profile</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {!user || user.isGuest ? (
                    // AUTHENTICATION SCREEN
                    <div className="profile-content">
                        {user && user.isGuest && (
                            <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: colors.primary, textAlign: "center", marginBottom: "20px" }}>
                                You are playing as a Guest ({user.name}). Register to save stats and unlock achievements!
                            </p>
                        )}
                        <div className="tab-toggle" style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "20px" }}>
                            <label style={{ cursor: "pointer", color: !isRegistering ? colors.primary : "var(--color-text)" }}>
                                <input type="radio" checked={!isRegistering} onChange={() => setIsRegistering(false)} style={{ display: "none" }} />
                                <span style={{ fontWeight: !isRegistering ? "bold" : "normal", textDecoration: !isRegistering ? "underline" : "none", fontSize: "1.2rem" }}>Login</span>
                            </label>
                            <label style={{ cursor: "pointer", color: isRegistering ? colors.primary : "var(--color-text)" }}>
                                <input type="radio" checked={isRegistering} onChange={() => setIsRegistering(true)} style={{ display: "none" }} />
                                <span style={{ fontWeight: isRegistering ? "bold" : "normal", textDecoration: isRegistering ? "underline" : "none", fontSize: "1.2rem" }}>Register</span>
                            </label>
                        </div>
                        <div className="auth-container">
                            {isRegistering && (
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Username" />
                            )}
                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                            <div style={{ marginTop: "10px" }}>
                                {isRegistering ? (
                                    <Button onClick={handleRegister}>Create Account</Button>
                                ) : (
                                    <Button onClick={handleLogin}>Login</Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // LOGGED IN USER PROFILE
                    <>
                        <div className="profile-tabs">
                            <div
                                className={`profile-tab ${activeTab === "stats" ? "profile-tab--active" : ""}`}
                                onClick={() => setActiveTab("stats")}
                            >
                                <FaChartBar aria-hidden="true" style={{ marginRight: 5 }} /> Stats
                            </div>
                            <div
                                className={`profile-tab ${activeTab === "achievements" ? "profile-tab--active" : ""}`}
                                onClick={() => setActiveTab("achievements")}
                            >
                                <FaTrophy aria-hidden="true" style={{ marginRight: 5 }} /> Achievements
                            </div>
                            <div
                                className={`profile-tab ${activeTab === "friends" ? "profile-tab--active" : ""}`}
                                onClick={() => setActiveTab("friends")}
                            >
                                <FaUserFriends aria-hidden="true" style={{ marginRight: 5 }} /> Friends
                                {friendRequests.length > 0 && <span className="profile-tab-badge">{friendRequests.length}</span>}
                            </div>
                        </div>

                        <div className="profile-content" ref={profileContentRef}>
                            {/* User Header matches across tabs */}
                            <div className="user-header-info">
                                <div className="user-avatar" style={getAvatarStyle(user.name)}>
                                    {getAvatarInitials(user.name)}
                                </div>
                                <div className="user-details">
                                    <h3>{user.name}</h3>
                                    {user.equippedTitle && (
                                        <div className="equipped-title" style={{ color: colors.primary }}>
                                            {user.equippedTitle}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {activeTab === "stats" && (
                                <div className="tab-pane-stats">
                                    {/* Graph Area */}
                                    <div className="stats-chart-container">
                                        <div className="chart-header">
                                            <strong style={{ fontSize: "1.1rem" }}>Activity Overview</strong>
                                            <div className="chart-filters">
                                                <select value={timeframe} onChange={e => setTimeframe(e.target.value)}>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="chart-bars">
                                            {chartData.map((val, idx) => {
                                                const heightPerc = Math.max(10, Math.floor((val / maxVal) * 100));
                                                // Create labels based on timeframe length
                                                let label = "";
                                                if (timeframe === "daily") label = ["M", "T", "W", "T", "F", "S", "S"][idx];
                                                if (timeframe === "weekly") label = `W${idx + 1}`;
                                                if (timeframe === "monthly") label = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][idx];

                                                return (
                                                    <div key={idx} className="chart-bar-wrapper">
                                                        <div
                                                            className="chart-bar"
                                                            style={{ height: `${heightPerc}%`, color: colors.primary }}
                                                            title={`${val} ${selectedStat}`}
                                                        ></div>
                                                        <span className="chart-label">{label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="stat-toggles">
                                            <button
                                                className={`stat-toggle-btn ${selectedStat === "xp" ? "active" : ""}`}
                                                onClick={() => setSelectedStat("xp")}
                                                title="XP = score + (games played x 10) + (wins x 25) + (guesses x 3) + (fast guesses x 6)"
                                            >
                                                XP ({xpValue})
                                            </button>
                                            <button className={`stat-toggle-btn ${selectedStat === "gamesPlayed" ? "active" : ""}`} onClick={() => setSelectedStat("gamesPlayed")}>Games ({user.gamesPlayed})</button>
                                            <button className={`stat-toggle-btn ${selectedStat === "wins" ? "active" : ""}`} onClick={() => setSelectedStat("wins")}>Wins ({user.gamesWon})</button>
                                            <button className={`stat-toggle-btn ${selectedStat === "guesses" ? "active" : ""}`} onClick={() => setSelectedStat("guesses")}>Guesses ({user.correctGuesses})</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "friends" && (
                                <div className="tab-pane-friends">
                                    {user.isGuest ? (
                                        <div className="friends-empty">
                                            Guests cannot use friends. Register or log in to add friends.
                                        </div>
                                    ) : (
                                        <>
                                            {friendsError && (
                                                <div className="friends-error">
                                                    <span>{friendsError}</span>
                                                    <button
                                                        type="button"
                                                        className="friends-error-close"
                                                        onClick={() => setFriendsError("")}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}

                                            <div className="friends-section">
                                                <div className="friends-section-header">
                                                    <h4>Friend Requests</h4>
                                                    <span className="friends-section-count">{friendRequests.length}</span>
                                                </div>

                                                {friendRequests.length === 0 ? (
                                                    <div className="friends-empty">No pending requests.</div>
                                                ) : (
                                                    <div className="friends-list">
                                                        {friendRequests.map((req) => (
                                                            <div key={req.friendshipId} className="friend-card">
                                                                <div className="friend-meta">
                                                                    <div className="friend-avatar-wrap">
                                                                        <div
                                                                            className="friend-avatar-sm"
                                                                            style={getAvatarStyle(req.requesterUsername)}
                                                                        >
                                                                            {getAvatarInitials(req.requesterUsername)}
                                                                        </div>
                                                                        <span className="status-dot offline" />
                                                                    </div>

                                                                    <div>
                                                                        <div className="friend-name">{req.requesterUsername}</div>
                                                                        <div className="friend-sub">Sent {formatLastSeen(req.sentAt)}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="friend-actions">
                                                                    <Button onClick={() => acceptFriendRequest(req.friendshipId)}>Accept</Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => declineFriendRequest(req.friendshipId)}
                                                                    >
                                                                        Decline
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="friends-section">
                                                <div className="friends-section-header">
                                                    <h4>Your Friends</h4>
                                                    <span className="friends-section-count">{friends.length}</span>
                                                </div>

                                                {friendsLoading ? (
                                                    <div className="friends-list">
                                                        {[1, 2, 3].map((item) => (
                                                            <div key={item} className="friend-card skeleton-card">
                                                                <div className="friend-meta">
                                                                    <div className="skeleton skeleton-avatar-sm"></div>
                                                                    <div className="friend-skeleton-text">
                                                                        <div className="skeleton skeleton-line skeleton-line--lg"></div>
                                                                        <div className="skeleton skeleton-line skeleton-line--sm"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : friends.length === 0 ? (
                                                    <div className="friends-empty friends-empty-cta">
                                                        <div className="friends-empty-icon">👥</div>
                                                        <div className="friends-empty-title">No friends yet</div>
                                                        <div className="friends-empty-subtitle">
                                                            Search for players below and send your first friend request.
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="friends-list">
                                                        {friends.map((friend) => {
                                                            const stats = getFriendStats(friend);
                                                            return (
                                                                <div
                                                                    key={friend.userId}
                                                                    className={`friend-card friend-card--interactive ${selectedFriend?.userId === friend.userId ? "friend-card--selected" : ""}`}
                                                                    onClick={() => openFriendDetails(friend)}
                                                                >
                                                                    <div className="friend-meta">
                                                                        <div className="friend-avatar-wrap">
                                                                            <div
                                                                                className="friend-avatar-sm"
                                                                                style={getAvatarStyle(friend.username)}
                                                                            >
                                                                                {getAvatarInitials(friend.username)}
                                                                            </div>
                                                                            <span className={`status-dot ${friend.isOnline ? "online" : "offline"}`} />
                                                                        </div>

                                                                        <div>
                                                                            <div className="friend-name">{friend.username}</div>
                                                                            <div className="friend-sub">
                                                                                {friend.isOnline ? "Online now" : `Last seen ${formatLastSeen(friend.lastSeenAt)}`}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="friend-actions">
                                                                        {friend.currentRoomId && (
                                                                            <span className="friend-chip friend-chip--ingame">In Match</span>
                                                                        )}
                                                                        <Button
                                                                            variant="danger"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removeFriend(friend.userId);
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>

                                                                    <div className="friend-stats-preview">
                                                                        <div className="friend-stat-preview-item">
                                                                            <span className="friend-stat-preview-value">{stats.gamesPlayed}</span>
                                                                            <span className="friend-stat-preview-label">Games</span>
                                                                        </div>
                                                                        <div className="friend-stat-preview-item">
                                                                            <span className="friend-stat-preview-value">{stats.gamesWon}</span>
                                                                            <span className="friend-stat-preview-label">Wins</span>
                                                                        </div>
                                                                        <div className="friend-stat-preview-item">
                                                                            <span className="friend-stat-preview-value">{stats.winRate}%</span>
                                                                            <span className="friend-stat-preview-label">Win rate</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="friends-section">
                                                <div className="friends-section-header">
                                                    <h4>Find Friends</h4>
                                                </div>

                                                <div className="friends-search">
                                                    <Input
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                handleSearch();
                                                            }
                                                        }}
                                                        placeholder="Search username"
                                                    />
                                                    <Button onClick={handleSearch}>Search</Button>
                                                </div>

                                                {searchResults.length > 0 && (
                                                    <div className="friends-list">
                                                        {searchResults.map((result) => (
                                                            <div key={result.userId} className="friend-card">
                                                                <div className="friend-meta">
                                                                    <div className="friend-avatar-wrap">
                                                                        <div
                                                                            className="friend-avatar-sm"
                                                                            style={getAvatarStyle(result.username)}
                                                                        >
                                                                            {getAvatarInitials(result.username)}
                                                                        </div>
                                                                        <span className={`status-dot ${result.isOnline ? "online" : "offline"}`} />
                                                                    </div>

                                                                    <div>
                                                                        <div className="friend-name">{result.username}</div>
                                                                        <div className="friend-sub">
                                                                            {result.isOnline ? "Online now" : `Last seen ${formatLastSeen(result.lastSeenAt)}`}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="friend-actions">
                                                                    {result.isFriend ? (
                                                                        <span className="friend-chip friend-chip--confirmed">Friends</span>
                                                                    ) : result.hasPendingRequestToMe ? (
                                                                        <>
                                                                            <Button onClick={() => result.pendingFriendshipId && acceptFriendRequest(result.pendingFriendshipId)}>
                                                                                Accept
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                onClick={() => result.pendingFriendshipId && declineFriendRequest(result.pendingFriendshipId)}
                                                                            >
                                                                                Decline
                                                                            </Button>
                                                                        </>
                                                                    ) : result.hasPendingRequestFromMe ? (
                                                                        <span className="friend-chip friend-chip--pending">Request sent</span>
                                                                    ) : (
                                                                        <Button onClick={() => sendFriendRequest(result.username)}>Add</Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedFriend && (
                                                <div className="friends-section friend-details-panel">
                                                    <div className="friends-section-header">
                                                        <h4>Friend Stats</h4>
                                                        <button
                                                            type="button"
                                                            className="friends-error-close"
                                                            onClick={() => setSelectedFriend(null)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>

                                                    <div className="friend-details-header">
                                                        <div
                                                            className="user-avatar friend-details-avatar"
                                                            style={getAvatarStyle(selectedFriend.username)}
                                                        >
                                                            {getAvatarInitials(selectedFriend.username)}
                                                        </div>

                                                        <div>
                                                            <div className="friend-details-name">{selectedFriend.username}</div>
                                                            <div className="friend-sub">
                                                                {selectedFriend.isOnline ? "Online now" : `Last seen ${formatLastSeen(selectedFriend.lastSeenAt)}`}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="friend-details-stats-grid">
                                                        <div className="friend-details-stat-card">
                                                            <span className="friend-details-stat-value">{getFriendStats(selectedFriend).gamesPlayed}</span>
                                                            <span className="friend-details-stat-label">Games Played</span>
                                                        </div>
                                                        <div className="friend-details-stat-card">
                                                            <span className="friend-details-stat-value">{getFriendStats(selectedFriend).gamesWon}</span>
                                                            <span className="friend-details-stat-label">Wins</span>
                                                        </div>
                                                        <div className="friend-details-stat-card">
                                                            <span className="friend-details-stat-value">{getFriendStats(selectedFriend).correctGuesses}</span>
                                                            <span className="friend-details-stat-label">Correct Guesses</span>
                                                        </div>
                                                        <div className="friend-details-stat-card">
                                                            <span className="friend-details-stat-value">{getFriendStats(selectedFriend).winRate}%</span>
                                                            <span className="friend-details-stat-label">Win Rate</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === "achievements" && (
                                <div className="tab-pane-achievements">
                                    <div className="achievements-grid">
                                        {Object.entries(user.achievements || {}).map(([id, unlocked]) => {
                                            const displayNames = {
                                                ArtisticRookie: "Artistic Rookie",
                                                QuickDraw: "Quick Draw",
                                                Centurion: "Centurion",
                                                Master: "Master",
                                                TheGrandmaster: "The Grandmaster",
                                                MindReader: "Mind Reader",
                                                ArtisticSoul: "Artistic Soul",
                                            };
                                            const isEquipped = user.equippedTitle === displayNames[id];

                                            // Optional icons for fun
                                            let Icon = FaTrophy;
                                            if (!unlocked) Icon = FaLock;

                                            return (
                                                <div key={id} className={`achievement-card ${!unlocked ? "locked" : ""}`}>
                                                    <div className="achievement-icon" style={{ color: unlocked ? colors.primary : "#888" }}>
                                                        <Icon />
                                                    </div>
                                                    <div className="achievement-info">
                                                        <h4>{displayNames[id]}</h4>
                                                        <p>{unlocked ? "Unlocked!" : "Keep playing to unlock"}</p>
                                                    </div>
                                                    {unlocked && (
                                                        <button
                                                            className="equip-btn"
                                                            onClick={() => handleEquipTitle(isEquipped ? null : id)}
                                                            style={{
                                                                backgroundColor: isEquipped ? colors.primary : "transparent",
                                                                color: isEquipped ? "var(--color-text)" : colors.primary
                                                            }}
                                                        >
                                                            {isEquipped ? "Equipped" : "Equip"}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                                <Button onClick={handleLogout}>Logout</Button>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ProfileModal;
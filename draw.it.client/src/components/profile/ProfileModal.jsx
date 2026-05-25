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

    useEffect(() => {
        if (isOpen) {
            fetchMe();
            setActiveTab("stats"); // Reset tab on open
        }
    }, [isOpen]);

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

        // Spread the total across chunks for a stable, readable trend.
        const count = timeframe === "daily" ? 7 : (timeframe === "weekly" ? 4 : 6);
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
                        <div className="tab-toggle" style={{ display: "flex", justifyContent:"center", gap: "20px", marginBottom: "20px" }}>
                            <label style={{ cursor: "pointer", color: !isRegistering ? colors.primary : "var(--color-text)" }}>
                                <input type="radio" checked={!isRegistering} onChange={() => setIsRegistering(false)} style={{ display: "none"}} /> 
                                <span style={{ fontWeight: !isRegistering ? "bold" : "normal", textDecoration: !isRegistering ? "underline" : "none", fontSize: "1.2rem" }}>Login</span>
                            </label>
                            <label style={{ cursor: "pointer", color: isRegistering ? colors.primary : "var(--color-text)" }}>
                                <input type="radio" checked={isRegistering} onChange={() => setIsRegistering(true)} style={{ display: "none"}} /> 
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
                                className="profile-tab" 
                                style={{ 
                                    color: activeTab === "stats" ? colors.primary : "var(--color-text)",
                                    borderBottomColor: activeTab === "stats" ? colors.primary : "transparent"
                                }}
                                onClick={() => setActiveTab("stats")}
                            >
                                <FaChartBar style={{ marginRight: 5 }} /> Stats
                            </div>
                            <div 
                                className="profile-tab"
                                style={{ 
                                    color: activeTab === "achievements" ? colors.primary : "var(--color-text)",
                                    borderBottomColor: activeTab === "achievements" ? colors.primary : "transparent"
                                }}
                                onClick={() => setActiveTab("achievements")}
                            >
                                <FaTrophy style={{ marginRight: 5 }} /> Achievements
                            </div>
                            <div 
                                className="profile-tab"
                                style={{ 
                                    color: activeTab === "friends" ? colors.primary : "var(--color-text)",
                                    borderBottomColor: activeTab === "friends" ? colors.primary : "transparent"
                                }}
                                onClick={() => setActiveTab("friends")}
                            >
                                <FaUserFriends style={{ marginRight: 5 }} /> Friends
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
                                                if (timeframe === "daily") label = ["M","T","W","T","F","S","S"][idx];
                                                if (timeframe === "weekly") label = `W${idx+1}`;
                                                if (timeframe === "monthly") label = ["Jan","Feb","Mar","Apr","May","Jun"][idx];

                                                return (
                                                <div key={idx} className="chart-bar-wrapper">
                                                    <div 
                                                        className="chart-bar" 
                                                        style={{ height: `${heightPerc}%`, color: colors.primary }}
                                                        title={`${val} ${selectedStat}`}
                                                    ></div>
                                                    <span className="chart-label">{label}</span>
                                                </div>
                                            )})}
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
                                    <div className="friends-section">
                                        <div className="friends-list">
                                            Connect with friends (Coming Soon!)
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "achievements" && (
                                <div className="tab-pane-achievements">
                                    <div className="achievements-grid">
                                        {Object.entries(user.achievements || {}).map(([id, unlocked]) => {
                                            const displayNames = {
                                                ArtisticRookie:  "Artistic Rookie",
                                                QuickDraw:       "Quick Draw",
                                                Centurion:       "Centurion",
                                                Master:          "Master",
                                                TheGrandmaster:  "The Grandmaster",
                                                MindReader:      "Mind Reader",
                                                ArtisticSoul:    "Artistic Soul",
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
import React, { useState, useEffect } from "react";
import api from "@/utils/api.js";
import Input from "@/components/input/Input.jsx";
import Button from "@/components/button/Button.jsx";
import "./AccountSidebar.css";
import colors from "@/constants/colors.js";

function AccountSidebar({ isOpen, onClose, onAuthChange }) {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    const fetchMe = async () => {
        try {
            const res = await api.get("auth/me");
            if (res.status === 200) {
                // If it's a guest, we might not want to treat them as a fully registered user in this panel,
                // but let's show their guest profile anyway, or we can prompt them to register.
                setUser(res.data);
            }
        } catch (err) {
            setUser(null);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMe();
        }
    }, [isOpen]);

    const handleRegister = async () => {
        try {
            const res = await api.post("auth/register", { name, email, password });
            setUser(res.data);
            onAuthChange(res.data);  // Notify parent component of auth change
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
            setUser(res.data);          // ← set immediately from response
            onAuthChange(res.data);  // Notify parent component of auth change
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
            onAuthChange(null);  // Notify parent component of auth change
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={`account-sidebar ${isOpen ? "open" : ""}`} style={{ backgroundColor: "var(--primary-bg)", borderColor: colors.secondaryDark }}>
            <div className="sidebar-header">
                <h2>Account & Stats</h2>
                <button className="close-btn" onClick={onClose} style={{ color: colors.secondaryDark }}>&times;</button>
            </div>
            
            <div className="sidebar-content">
                {user && !user.isGuest ? (
                    <div className="user-profile">
                        <p><strong>Username:</strong> {user.name}</p>
                        <p><strong>Total Score:</strong> {user.totalScore}</p>
                        <p><strong>Games Played:</strong> {user.gamesPlayed}</p>
                        <p><strong>Games Won:</strong> {user.gamesWon}</p>
                        <p><strong>Correct Guesses:</strong> {user.correctGuesses}</p>
                        <p><strong>Fast Guesses:</strong> {user.fastGuesses}</p>
                        <div className="sidebar-actions" style={{ marginTop: "20px" }}>
                            <Button onClick={handleLogout}>Logout</Button>
                        </div>
                    </div>
                ) : (
                    <div className="auth-form">
                        {user && user.isGuest && (
                            <p style={{ marginBottom: "15px", fontStyle: "italic", fontSize: "0.9rem" }}>
                                You are currently playing as a Guest ({user.name}). Register or login to save your stats!
                            </p>
                        )}
                        <div className="tab-toggle" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                            <label style={{ cursor: "pointer", color: !isRegistering ? colors.primary : "" }}>
                                <input type="radio" checked={!isRegistering} onChange={() => setIsRegistering(false)} style={{ display: "none"}} /> 
                                <span style={{ fontWeight: !isRegistering ? "bold" : "normal", textDecoration: !isRegistering ? "underline" : "none" }}>Login</span>
                            </label>
                            <label style={{ cursor: "pointer", color: isRegistering ? colors.primary : "" }}>
                                <input type="radio" checked={isRegistering} onChange={() => setIsRegistering(true)} style={{ display: "none"}} /> 
                                <span style={{ fontWeight: isRegistering ? "bold" : "normal", textDecoration: isRegistering ? "underline" : "none" }}>Register</span>
                            </label>
                        </div>

                        {isRegistering && (
                            <div className="form-group">
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Username" />
                            </div>
                        )}
                        <div className="form-group">
                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                        </div>
                        <div className="form-group">
                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                        </div>

                        <div className="form-actions" style={{ marginTop: "20px" }}>
                            {isRegistering ? (
                                <Button onClick={handleRegister}>Create Account</Button>
                            ) : (
                                <Button onClick={handleLogin}>Login</Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AccountSidebar;

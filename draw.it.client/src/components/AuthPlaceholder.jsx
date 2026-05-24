import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import Input from "@/components/input/Input.jsx";
import Button from "@/components/button/Button.jsx";

function AuthPlaceholder() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

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
        fetchMe();
    }, []);

    const handleLogin = async () => {
        try {
            await api.post("auth/login", { email, password });
            await fetchMe();
            setEmail("");
            setPassword("");
        } catch (err) {
            alert(err.response?.data?.error || "Login failed");
        }
    };

    const handleRegister = async () => {
        try {
            await api.post("auth/register", { name, email, password });
            await fetchMe();
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            alert(err.response?.data?.error || "Register failed");
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("auth/logout");
            setUser(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ padding: "20px", background: "var(--primary-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", marginBottom: "20px" }}>
            <h2 style={{ marginBottom: "10px" }}>Auth Placeholder</h2>
            
            {user ? (
                <div>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Guest:</strong> {user.isGuest ? "Yes" : "No"}</p>
                    <p><strong>Total Score:</strong> {user.totalScore}</p>
                    <div style={{ marginTop: "10px" }}>
                        <Button onClick={handleLogout}>Logout</Button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <label>
                            <input type="radio" checked={!isRegistering} onChange={() => setIsRegistering(false)} /> Login
                        </label>
                        <label>
                            <input type="radio" checked={isRegistering} onChange={() => setIsRegistering(true)} /> Register
                        </label>
                    </div>

                    {isRegistering && (
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
                    )}
                    <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />

                    <div>
                        {isRegistering ? (
                            <Button onClick={handleRegister}>Register</Button>
                        ) : (
                            <Button onClick={handleLogin}>Login</Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuthPlaceholder;

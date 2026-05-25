import "./Index.css"
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import api from "@/utils/api.js";
import colors from "@/constants/colors.js";
import Input from "@/components/input/Input.jsx"
import Button from "@/components/button/Button.jsx";
import Modal from "@/components/modal/Modal.jsx";
import ProfileModal from "@/components/profile/ProfileModal.jsx";
import { FaUserCircle } from "react-icons/fa";

function Index() {
    const [nameInputText, setNameInputText] = useState("");
    const [roomCodeInputText, setRoomCodeInputText] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get("auth/me");
                if (res.status === 200 && res.data) {
                    setNameInputText(res.data.name);
                    setIsLoggedIn(true);
                }
            } catch {
                setIsLoggedIn(false);
            }
        };
        fetchMe();
    }, []);

    const navigate = useNavigate();

    // Try to get current user. If not authenticated (401) then create a new user by calling join
    const createUserIfNotSignedIn = async (name) => {
        let userData = null;

        // Check if user exists
        try {
            const meResponse = await api.get("auth/me");
            if (meResponse.status === 200) {
                userData = meResponse.data;
            }
        } catch (err) { }

        if (userData) {
            return userData;
        }

        // Create user
        try {
            const joinResponse = await api.post("auth/join", {
                name: name
            });

            if (joinResponse.status === 201) {
                return joinResponse.data;
            }
        } catch (err) {
            console.error("Error creating user:", err);
            alert(err.response?.data?.error || "Could not sign in. Please try again.");
            throw err;
        }
    }

    // Join room and navigate to it
    const joinRoomAndNavigate = async (name, roomId) => {
        await createUserIfNotSignedIn(name);

        try {
            const roomResponse = await api.post(`room/${roomId}/join`);

            if (roomResponse.status === 204) {
                navigate(`/room/${roomId}`);
            }
        } catch (err) {
            console.error("Error joining room:", err);
            alert(err.response?.data?.error || "Could not join room. Please check the room code and try again.");
        }
    }

    // Create room and navigate to it
    const createRoomAndNavigate = async (name) => {
        await createUserIfNotSignedIn(name);

        try {
            const roomResponse = await api.post("room");

            if (roomResponse.status === 201) {
                const roomId = roomResponse.data.roomId;
                navigate(`/host/${roomId}`);
            }
        } catch (err) {
            console.error("Error creating room:", err);
            alert(err.response?.data?.error || "Could not create room. Please try again.");
        }
    }

    //for smooth updating of user info in sidebar after login/logout without needing to refresh the page
    const handleAuthChange = (userData) => {
        if (userData) {
            setNameInputText(userData.name);
            setIsLoggedIn(true);
        } else {
            // Logout
            setNameInputText("");
            setIsLoggedIn(false);
        }
    };


    return (
        <div className="index-container">
            <ProfileModal
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onAuthChange={handleAuthChange}
            />

            <div
                style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    cursor: "pointer",
                    opacity: sidebarOpen ? 0 : 1,
                    pointerEvents: sidebarOpen ? "none" : "auto",
                    transition: "opacity 0.3s ease-in-out"
                }}
                onClick={() => setSidebarOpen(true)}
            >
                <FaUserCircle size={40} color={colors.primary} />
            </div>

            <h1 id="app-title">
                Draw <span className="highlight" style={{ backgroundColor: colors.primary, color: colors.secondaryDark }}>.it</span>
            </h1>

            <div className="action-container">
                <Input
                    value={nameInputText}
                    onChange={(e) => {
                        if (!isLoggedIn) {
                            const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                            setNameInputText(sanitized);
                        }
                    }}
                    placeholder="Enter name"
                    disabled={isLoggedIn}
                    maxLength={20}
                />

                <div className="action-button-container">
                    <Button onClick={() => nameInputText.trim() ? setModalOpen(!modalOpen) : alert("Name is required")}>Join Room</Button>
                    <Button onClick={() => nameInputText.trim() ? createRoomAndNavigate(nameInputText) : alert("Name is required")}>Create Room</Button>
                </div>

                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                    <div className="modal-container">
                        <h1>Enter room code</h1>
                        <Input value={roomCodeInputText} placeholder="12..." onChange={(e) => setRoomCodeInputText(e.target.value)} />
                        <Button onClick={() => roomCodeInputText.trim() ? joinRoomAndNavigate(nameInputText, roomCodeInputText) : alert("Room code is required")}>Join</Button>
                    </div>
                </Modal>
            </div>
        </div>
    )
}

export default Index;
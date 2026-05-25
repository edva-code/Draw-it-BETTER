import React from "react";
import "./Input.css";
import colors from "@/constants/colors.js";

export default function Input({ type = "text", value, onChange, placeholder, disabled = false }) {
    return (
        <input
            className="input"
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            style={{ 
                borderColor: colors.secondaryDark, 
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'text'
            }}
        />
    );
}

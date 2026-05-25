import React from "react";
import colors from "../../constants/colors";
import "./Button.css";

export default function Button({
    children,
    onClick,
    variant = "primary",
    type = "button",
    disabled = false,
    className = "",
}) {
    const variantClass = `button button--${variant} ${className}`.trim();

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={variantClass}
            style={
                variant === "primary"
                    ? { backgroundColor: colors.primary, "--button-primary-hover": colors.primaryDark }
                    : undefined
            }
        >
            {children}
        </button>
    );
}
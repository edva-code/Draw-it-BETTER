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

    const initialStyle =
        variant === "primary"
            ? { backgroundColor: colors.primary }
            : undefined;

    const handleMouseOver = (e) => {
        if (variant === "primary") {
            e.currentTarget.style.backgroundColor = colors.primaryDark;
        }
    };

    const handleMouseOut = (e) => {
        if (variant === "primary") {
            e.currentTarget.style.backgroundColor = colors.primary;
        }
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={variantClass}
            style={initialStyle}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            {children}
        </button>
    );
}
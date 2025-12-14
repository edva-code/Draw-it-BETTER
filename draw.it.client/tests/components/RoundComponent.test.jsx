import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect} from 'vitest';
import '@testing-library/jest-dom';
import RoundComponent from '@/components/gameplay/RoundComponent.jsx';

describe("RoundComponent", () => {
    test("renders currentRound and totalRounds when provided", () => {
        render(<RoundComponent currentRound={3} totalRounds={5} />);

        expect(screen.getByText("3 / 5")).toBeInTheDocument();

        expect(screen.getByText("Round")).toBeInTheDocument();
    });
});
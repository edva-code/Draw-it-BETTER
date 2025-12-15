import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrawingCanvas from '@/components/gameplay/DrawingCanvas';
import { GameplayHubContext } from '@/utils/GameplayHubProvider.jsx';
import '@testing-library/jest-dom';

beforeAll(() => {
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        setTransform: vi.fn(),
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        closePath: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
    }));

    global.ResizeObserver = class {
        constructor(callback) {
            this.callback = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

describe('DrawingCanvas', () => {
    const mockConnection = {
        on: vi.fn(),
        off: vi.fn(),
        invoke: vi.fn(),
    };

    const renderCanvas = (props = {}) =>
        render(
            <GameplayHubContext.Provider value={mockConnection}>
                <DrawingCanvas isDrawer={true} word="APPLE" {...props} />
            </GameplayHubContext.Provider>
        );

    it('renders the WordComponent with the provided word', () => {
        renderCanvas();
        expect(screen.getByText('APPLE')).toBeInTheDocument();
    });

    it('registers SignalR listeners on mount', () => {
        renderCanvas();
        expect(mockConnection.on).toHaveBeenCalledWith('ReceiveDraw', expect.any(Function));
        expect(mockConnection.on).toHaveBeenCalledWith('ReceiveClear', expect.any(Function));
        expect(mockConnection.on).toHaveBeenCalledWith('ReceiveCanvasState', expect.any(Function));
    });

    it('unregisters SignalR listeners on unmount', () => {
        const { unmount } = renderCanvas();
        unmount();
        expect(mockConnection.off).toHaveBeenCalledWith('ReceiveDraw', expect.any(Function));
        expect(mockConnection.off).toHaveBeenCalledWith('ReceiveClear', expect.any(Function));
        expect(mockConnection.off).toHaveBeenCalledWith('ReceiveCanvasState');
    });
});

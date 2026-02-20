import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockGameplayConnection = {
    on: vi.fn(),
    off: vi.fn(),
    invoke: vi.fn(),
};

vi.mock('@/utils/GameplayHubProvider.jsx', () => ({
    GameplayHubContext: React.createContext(null),
}));

vi.mock('@/components/gameplay/WordComponent.jsx', () => ({
    default: () => <div data-testid="word-component">WordComponent</div>,
}));

vi.mock('@/components/gameplay/DrawingCanvas.module.css', () => ({
    default: {
        colorButton: 'colorButton',
        toolButtonActive: 'toolButtonActive',
        toolButtonInactive: 'toolButtonInactive',
        clearButton: 'clearButton',
        brushLabel: 'brushLabel',
        brushSlider: 'brushSlider',
        brushValueDisplay: 'brushValueDisplay',
    },
}));

import { GameplayHubContext } from '@/utils/GameplayHubProvider.jsx';
import DrawingCanvas from '@/components/gameplay/DrawingCanvas.jsx';

const makeMock2dContext = () => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    strokeStyle: 'black',
    lineWidth: 1,
    lineCap: 'round',
    fillStyle: 'white',
});

describe('DrawingCanvas', () => {
    let ctx;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // btoa used by snapshot effect
        globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

        // requestAnimationFrame used by ResizeObserver effect
        globalThis.requestAnimationFrame = (cb) => cb();

        // ResizeObserver used by resize effect
        globalThis.ResizeObserver = class {
            constructor() {}
            observe() {}
            disconnect() {}
        };

        // Stable DPI
        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            configurable: true,
        });

        ctx = makeMock2dContext();

        // Canvas API stubs
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);

        vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
            left: 0,
            top: 0,
            width: 200,
            height: 100,
            right: 200,
            bottom: 100,
            x: 0,
            y: 0,
            toJSON: () => {},
        }));

        Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
            value: 200,
            configurable: true,
        });
        Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
            value: 100,
            configurable: true,
        });

        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
            const blobLike = {
                type: 'image/png',
                arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer, // => base64 "AQID"
            };
            cb(blobLike);
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const renderWithContext = (ui, connection = mockGameplayConnection) =>
        render(<GameplayHubContext.Provider value={connection}>{ui}</GameplayHubContext.Provider>);

    const getCanvas = (container) => container.querySelector('canvas');

    it('renders the canvas and WordComponent', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);
        expect(screen.getByTestId('word-component')).toBeInTheDocument();
        expect(getCanvas(container)).toBeInTheDocument();
    });

    it('shows drawing controls only when isDrawer=true', () => {
        const { rerender } = renderWithContext(<DrawingCanvas isDrawer />);
        expect(screen.getByText(/Current Tool:/i)).toBeInTheDocument();
        expect(screen.getByText(/Brush Size:/i)).toBeInTheDocument();

        rerender(
            <GameplayHubContext.Provider value={mockGameplayConnection}>
                <DrawingCanvas isDrawer={false} />
            </GameplayHubContext.Provider>
        );

        expect(screen.queryByText(/Current Tool:/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Brush Size:/i)).not.toBeInTheDocument();
    });

    it('registers ReceiveDraw / ReceiveClear / AiGuessedCorrectly handlers on mount', () => {
        renderWithContext(<DrawingCanvas isDrawer />);

        expect(mockGameplayConnection.on).toHaveBeenCalledWith('ReceiveDraw', expect.any(Function));
        expect(mockGameplayConnection.on).toHaveBeenCalledWith('ReceiveClear', expect.any(Function));
        expect(mockGameplayConnection.on).toHaveBeenCalledWith(
            'AiGuessedCorrectly',
            expect.any(Function)
        );
    });

    it('cleans up handlers on unmount', () => {
        const { unmount } = renderWithContext(<DrawingCanvas isDrawer />);

        const receiveDrawHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'ReceiveDraw')?.[1];
        const receiveClearHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'ReceiveClear')?.[1];
        const aiHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'AiGuessedCorrectly')?.[1];

        unmount();

        expect(mockGameplayConnection.off).toHaveBeenCalledWith('ReceiveDraw', receiveDrawHandler);
        expect(mockGameplayConnection.off).toHaveBeenCalledWith('ReceiveClear', receiveClearHandler);
        expect(mockGameplayConnection.off).toHaveBeenCalledWith('AiGuessedCorrectly', aiHandler);
    });

    it('does not draw or invoke SendDraw when isDrawer=false', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer={false} />);
        const canvas = getCanvas(container);

        fireEvent.mouseDown(canvas, { clientX: 50, clientY: 25 });
        fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseUp(canvas);

        expect(mockGameplayConnection.invoke).not.toHaveBeenCalledWith('SendDraw', expect.anything());
    });

    it('sends normalized start/move/end draw events when drawing locally', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);
        const canvas = getCanvas(container);

        mockGameplayConnection.invoke.mockClear();

        fireEvent.mouseDown(canvas, { clientX: 50, clientY: 25 }); // norm: (0.25, 0.25)
        fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50 }); // norm: (0.5, 0.5)
        fireEvent.mouseUp(canvas);

        expect(mockGameplayConnection.invoke).toHaveBeenCalledWith('SendDraw', {
            point: { x: 0.25, y: 0.25 },
            type: 'start',
            color: 'black',
            size: 5,
            eraser: false,
        });

        expect(mockGameplayConnection.invoke).toHaveBeenCalledWith('SendDraw', {
            point: { x: 0.5, y: 0.5 },
            type: 'move',
            color: 'black',
            size: 5,
            eraser: false,
        });

        expect(mockGameplayConnection.invoke).toHaveBeenCalledWith('SendDraw', {
            point: { x: 0, y: 0 },
            type: 'end',
            color: 'black',
            size: 5,
            eraser: false,
        });
    });

    it('updates brush size and uses it in subsequent SendDraw payloads', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);
        const canvas = getCanvas(container);

        const slider = container.querySelector('input[type="range"]');
        expect(slider).toBeInTheDocument();

        fireEvent.change(slider, { target: { valueAsNumber: 20 } });
        expect(screen.getByText('20')).toBeInTheDocument();

        mockGameplayConnection.invoke.mockClear();
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });

        expect(mockGameplayConnection.invoke).toHaveBeenCalledWith(
            'SendDraw',
            expect.objectContaining({ type: 'start', size: 20 })
        );
    });

    it('toggles eraser and updates the UI indicator', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);
        expect(screen.getByText(/Current Tool:/i)).toHaveTextContent('Pen');

        const eraserButton = container.querySelector('button.toolButtonInactive');
        expect(eraserButton).toBeInTheDocument();

        fireEvent.click(eraserButton);
        expect(screen.getByText(/Current Tool:/i)).toHaveTextContent('Eraser');

        // Color dot should be hidden when eraser is active
        const colorDot = container.querySelector('span[style*="background-color"]');
        expect(colorDot).not.toBeInTheDocument();
    });

    it('selects a color and updates the color dot', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);

        const colorButtons = container.querySelectorAll('button.colorButton');
        expect(colorButtons.length).toBeGreaterThanOrEqual(5);

        // click the red color button (2nd)
        fireEvent.click(colorButtons[1]);

        const dot = container.querySelector('span[style*="background-color"]');
        expect(dot).toBeInTheDocument();
        expect(dot.style.backgroundColor).toBe('red');
    });

    it('Clear button invokes SendClear and clears the canvas (fillRect)', () => {
        const { container } = renderWithContext(<DrawingCanvas isDrawer />);

        const clearBtn = screen.getByRole('button', { name: /clear/i });
        expect(clearBtn).toBeInTheDocument();

        ctx.fillRect.mockClear();
        mockGameplayConnection.invoke.mockClear();

        fireEvent.click(clearBtn);

        expect(mockGameplayConnection.invoke).toHaveBeenCalledWith('SendClear');
        expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('ReceiveDraw draws remote strokes using denormalized coordinates', () => {
        renderWithContext(<DrawingCanvas isDrawer={false} />);

        const receiveDrawHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'ReceiveDraw')?.[1];
        expect(receiveDrawHandler).toBeDefined();

        ctx.beginPath.mockClear();
        ctx.moveTo.mockClear();
        ctx.lineTo.mockClear();
        ctx.stroke.mockClear();

        act(() => {
            receiveDrawHandler({
                point: { x: 0.1, y: 0.2 },
                type: 'start',
                color: 'blue',
                size: 5,
                eraser: false,
            });
        });

        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.moveTo).toHaveBeenCalledWith(20, 20); // 0.1*200, 0.2*100

        act(() => {
            receiveDrawHandler({
                point: { x: 0.2, y: 0.3 },
                type: 'move',
                color: 'blue',
                size: 5,
                eraser: false,
            });
        });

        expect(ctx.lineTo).toHaveBeenCalledWith(40, 30); // 0.2*200, 0.3*100
        expect(ctx.stroke).toHaveBeenCalled();

        act(() => {
            receiveDrawHandler({
                point: { x: 0, y: 0 },
                type: 'end',
                color: 'blue',
                size: 5,
                eraser: false,
            });
        });
    });

    it('ReceiveClear clears recorded strokes and clears the canvas', () => {
        renderWithContext(<DrawingCanvas isDrawer={false} />);

        const receiveClearHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'ReceiveClear')?.[1];
        expect(receiveClearHandler).toBeDefined();

        ctx.fillRect.mockClear();

        act(() => {
            receiveClearHandler();
        });

        expect(ctx.fillRect).toHaveBeenCalled();
    });

    describe('AI snapshot sending', () => {
        it('sends a canvas snapshot every 13 seconds when isDrawer=true', async () => {
            renderWithContext(<DrawingCanvas isDrawer />);

            mockGameplayConnection.invoke.mockClear();

            await act(async () => {
                vi.advanceTimersByTime(13_000);
                await Promise.resolve();
            });

            expect(mockGameplayConnection.invoke).toHaveBeenCalledWith('SendCanvasSnapshot', {
                imageBytes: 'AQID',
                mimeType: 'image/png',
            });
        });

        it('stops sending snapshots after AiGuessedCorrectly', async () => {
            renderWithContext(<DrawingCanvas isDrawer />);

            const aiHandler = mockGameplayConnection.on.mock.calls.find((c) => c[0] === 'AiGuessedCorrectly')?.[1];
            expect(aiHandler).toBeDefined();

            // First tick -> snapshot sent
            mockGameplayConnection.invoke.mockClear();
            await act(async () => {
                vi.advanceTimersByTime(13_000);
                await Promise.resolve();
            });
            expect(mockGameplayConnection.invoke).toHaveBeenCalledWith(
                'SendCanvasSnapshot',
                expect.any(Object)
            );

            // AI guessed -> disable snapshots
            mockGameplayConnection.invoke.mockClear();
            act(() => aiHandler());

            await act(async () => {
                vi.advanceTimersByTime(13_000);
                await Promise.resolve();
            });

            expect(mockGameplayConnection.invoke).not.toHaveBeenCalledWith(
                'SendCanvasSnapshot',
                expect.anything()
            );
        });

        it('does not send snapshots when isDrawer=false', async () => {
            renderWithContext(<DrawingCanvas isDrawer={false} />);

            mockGameplayConnection.invoke.mockClear();

            await act(async () => {
                vi.advanceTimersByTime(30_000);
                await Promise.resolve();
            });

            expect(mockGameplayConnection.invoke).not.toHaveBeenCalledWith(
                'SendCanvasSnapshot',
                expect.anything()
            );
        });
    });
});

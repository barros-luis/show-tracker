import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MouseAura() {
    const [mounted, setMounted] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);

    const requestRef = useRef<number>(0);
    const particlesRef = useRef<HTMLDivElement[]>([]);
    const mouseRef = useRef({ x: 0, y: 0 });

    // State for interactive element detection
    // Using ref for performance in the animation loop
    const interactionRef = useRef({
        isHovering: false,
        globalAlpha: 1.0
    });

    // Initialize particles
    const particlesData = useRef(
        Array.from({ length: 15 }, () => ({
            x: 0,
            y: 0,
            currentX: 0, // coordinates
            currentY: 0
        }))
    );

    useEffect(() => {
        setMounted(true);

        // Check and watch for theme changes
        const checkTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        };

        checkTheme();

        // Watch for class changes on html element
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };

            // Interaction Detection using ElementFromPoint or checking target
            // Checking target is faster but requires the event. 
            // Since this is a global mousemove, e.target is the element under cursor.
            const target = e.target as HTMLElement;

            // Check if hovering actionable items
            const clickable = target.closest('button, a, input, [role="button"], .cursor-pointer');
            interactionRef.current.isHovering = !!clickable;
        };

        const animate = () => {
            const mouseX = mouseRef.current.x;
            const mouseY = mouseRef.current.y;
            const count = 15;

            // 1. UPDATE GLOBAL ALPHA PROPS
            // If hovering, target 0.3 opacity, else 1.0
            const targetAlpha = interactionRef.current.isHovering ? 0.2 : 1.0;
            // Smooth lerp for the transition
            interactionRef.current.globalAlpha += (targetAlpha - interactionRef.current.globalAlpha) * 0.05;

            const currentGlobalAlpha = interactionRef.current.globalAlpha;

            // 2. Leader follows mouse
            particlesData.current[0].x = mouseX;
            particlesData.current[0].y = mouseY;

            // 3. Physics & DOM Updates
            particlesData.current.forEach((p, i) => {
                // Follow logic
                if (i > 0) {
                    const prev = particlesData.current[i - 1];
                    p.x += (prev.currentX - p.x) * 0.5;
                    p.y += (prev.currentY - p.y) * 0.5;
                }

                // Smooth ease to target position
                p.currentX += (p.x - p.currentX) * 0.18;
                p.currentY += (p.y - p.currentY) * 0.18;

                // Sync with DOM
                if (particlesRef.current[i]) {
                    const element = particlesRef.current[i];

                    const scale = (count - i) / count;
                    const size = 70 + (scale * 110);

                    // Multiply base opacity by our global interaction alpha
                    const opacity = (scale * 0.6) * currentGlobalAlpha;

                    element.style.left = `${p.currentX}px`;
                    element.style.top = `${p.currentY}px`;

                    element.style.width = `${size}px`;
                    element.style.height = `${size}px`;
                    element.style.opacity = opacity.toString();

                    // Add a slight scale down when hovering interactive (optional polish)
                    const extraScale = interactionRef.current.isHovering ? 0.8 : 1.0;
                    element.style.transform = `translate(-50%, -50%) scale(${extraScale})`;
                }
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        window.addEventListener("mousemove", handleMouseMove);
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(requestRef.current);
            observer.disconnect();
        };
    }, []);

    if (!mounted) return null;

    // Different gradients for light vs dark mode
    const particleGradient = isDarkMode
        ? 'radial-gradient(circle, rgba(30, 64, 175, 0.6) 0%, rgba(23, 37, 84, 0.3) 30%, rgba(15, 23, 42, 0.1) 60%, transparent 100%)'
        : 'radial-gradient(circle, rgba(166, 147, 253, 0.41) 0%, rgba(191, 219, 254, 0.25) 30%, rgba(224, 242, 254, 0.1) 60%, transparent 100%)';

    const blendMode = isDarkMode ? 'screen' : 'normal';

    return createPortal(
        <>
            {/* STATIC BACKGROUND */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-overlay"
                style={{
                    backgroundImage: isDarkMode
                        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    top: 0,
                    left: 0
                }}
            />

            {/* TRAIL PARTICLES */}
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        if (el) particlesRef.current[i] = el;
                    }}
                    className="fixed pointer-events-none rounded-full transition-transform duration-75"
                    style={{
                        zIndex: 9999,
                        background: particleGradient,
                        filter: 'blur(20px)',
                        mixBlendMode: blendMode,

                        top: 0,
                        left: 0,
                        width: '0px',
                        height: '0px',
                        transform: 'translate(-50%, -50%)',
                        willChange: 'width, height, left, top, opacity, transform'
                    }}
                />
            ))}
        </>,
        document.body
    );
}

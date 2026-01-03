import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastState {
    message: string;
    type: ToastType;
    duration?: number;
}

export function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = useCallback((message: string, type: ToastType = "success", duration?: number) => {
        setToast({ message, type, duration });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    return { toast, showToast, hideToast };
}

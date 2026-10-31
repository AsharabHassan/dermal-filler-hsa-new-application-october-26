// Shared cinematic easing, typed as a cubic-bezier tuple so it satisfies
// Motion's `Easing` type even when used in standalone (non-contextual) objects.
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

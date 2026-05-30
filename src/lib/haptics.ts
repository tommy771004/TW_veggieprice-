/**
 * Safe wrapper for Web Vibrate API to provide tactile/haptic feedback.
 */
export function triggerHaptic(pattern: number | number[]) {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore errors if browser blocks vibration due to user gesture requirements
    }
  }
}

/**
 * Haptic patterns
 */
export const hapticPatterns = {
  /**
   * Extremely light tick/vibration for drag segments, discrete value changes
   */
  tick: 8,
  
  /**
   * Medium vibration for toggles, select options, or button clicks
   */
  toggle: 15,
  
  /**
   * Double tap or heavier tick for alert or secondary confirmation
   */
  warning: [15, 40, 15],
  
  /**
   * Distinct successful vibration sequence (double light pulse)
   */
  success: [15, 30, 20],
}

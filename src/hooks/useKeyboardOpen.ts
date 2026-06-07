import { useEffect, useState } from 'react'

// True while the on-screen (virtual) keyboard is open, detected via the visualViewport API: when the
// keyboard slides up it shrinks the *visual* viewport well below the *layout* viewport, so a large
// height gap is the reliable cross-platform signal. iOS Safari never resizes the layout viewport for
// the keyboard, so `window.innerHeight` alone can't tell us — the gap can. The 150px threshold sits
// above the URL-bar show/hide delta (~60–100px) but below any real keyboard (~250px+), so URL-bar
// chrome changes don't read as a keyboard. Used to drop the fixed bottom nav while typing: on iOS a
// `position: fixed` bar anchors to the layout viewport and fights the keyboard, jittering the scroll.
const KEYBOARD_MIN_GAP = 150

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setOpen(window.innerHeight - vv.height > KEYBOARD_MIN_GAP)
    update()
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  return open
}

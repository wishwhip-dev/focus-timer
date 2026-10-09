/**
 * This app's sounds, generated on the shared AudioContext from `lib/audio` — nothing to fetch,
 * nothing to fail to load. All timing is on the audio clock, every gain moves with ramps so
 * nothing clicks, and everything connects to the master gain so one mute covers all.
 */
import { getAudioContext, getMasterGain } from "@/lib/audio";

/** One struck bell partial: a sine with a fast attack and a long exponential decay. */
function strike(frequency: number, when: number, duration: number, peak: number): void {
  const ctx = getAudioContext();
  const out = getMasterGain();
  if (!ctx || !out) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(out);
  osc.start(when);
  osc.stop(when + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * The soft chime played when a focus session or a break ends: two gentle bell tones a fifth
 * apart, the second a little softer. Silent (never throwing) when sound has not been unlocked
 * yet — the audio status row on the page is where that state is shown.
 */
export function playChime(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;
  const start = ctx.currentTime + 0.02;
  strike(880, start, 1.2, 0.22);
  strike(1318.5, start + 0.28, 1.6, 0.16);
}

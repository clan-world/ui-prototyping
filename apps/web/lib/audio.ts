let context: AudioContext | undefined;
let enabled = true;
export function setSound(value: boolean) {
  enabled = value;
}
export function sound(
  type: "tap" | "gather" | "deploy" | "rip" | "reveal" | "win" | "error",
) {
  if (!enabled || typeof window === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const ctx = context;
    const notes = {
      tap: [440],
      gather: [660, 880],
      deploy: [220, 330, 440],
      rip: [80, 100, 140, 180, 240, 320],
      reveal: [440, 554, 659, 880],
      win: [330, 440, 554, 659, 880],
      error: [160, 120],
    }[type];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = type === "rip" ? "sawtooth" : "triangle";
      osc.frequency.value = frequency;
      const time = ctx.currentTime + index * (type === "rip" ? 0.035 : 0.075);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        type === "rip" ? 0.028 : 0.065,
        time + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.26);
    });
  } catch {
    /* Audio is optional when the browser denies playback. */
  }
}

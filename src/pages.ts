// The twelve pages of four, in the order E1 walks them. The words in `word`
// are four's own footer words. Sources: doc/manual.md and doc/controls.md in
// the four repo.

export type Key = { key: "K2" | "K3" | "E2" | "E3"; word: string; says: string };
export type Page = {
  id: string;
  name: string;
  does: string;
  keys: Key[];
  shift?: string; // what holding K1 adds
  picture: string;
  clips: string[];
};

export const PAGES: Page[] = [
  {
    id: "take",
    name: "TAKE",
    does: "Record what comes in, up to 60 seconds for each track, and choose the part that loops.",
    keys: [
      { key: "K2", word: "REC", says: "Record. Press again to stop." },
      { key: "K3", word: "SNAP", says: "Snap the loop to the take. Hold to undo." },
      { key: "E2", word: "START", says: "Where the loop starts." },
      { key: "E3", word: "END", says: "Where it ends." },
    ],
    shift: "Hold K1 to move the whole loop, or to let its edges wander.",
    picture:
      "The waveform of the take. The bracketed part is the loop: bright inside, dim outside. While you record, the head writes, the seconds count up and the IN meter shows your level.",
    clips: ["take"],
  },
  {
    id: "voice",
    name: "VOICE",
    does: "Choose how the track plays its take: PLAY, GRAIN, WARP, PV or CLOUD.",
    keys: [
      { key: "K2", word: "FRZ", says: "Freeze the sound where it is." },
      { key: "K3", word: "MODE", says: "The next voice. Hold for the next track." },
      { key: "E2", word: "SPEED", says: "Speed, or grain size for the granular voices." },
      { key: "E3", word: "PITCH", says: "Pitch, or grain density." },
    ],
    picture:
      "Each voice draws its own mechanism. PLAY is one unbroken wave, GRAIN a living cloud of grains, WARP its stretch windows, PV the columns of its spectrum.",
    clips: ["voice_play", "voice_grain", "voice_warp", "voice_pv", "voice_cloud"],
  },
  {
    id: "tracks",
    name: "TRACKS",
    does: "All four tracks at a glance: which are on, how each one plays, and how loud.",
    keys: [
      { key: "K2", word: "ON", says: "Turn the track on or off." },
      { key: "K3", word: "MODE", says: "Its next voice." },
      { key: "E2", word: "TRACK", says: "Pick a track." },
      { key: "E3", word: "LEVEL", says: "Its level." },
    ],
    shift: "Hold K1 for the sends: any track into another track, the delay or the reverb.",
    picture:
      "One row for each track, with its voice, its loop on the take and a moving head. The arrow marks the track the other pages edit.",
    clips: ["tracks", "tracks_sends"],
  },
  {
    id: "tape",
    name: "TAPE",
    does: "A loop deck for the input or the whole mix, like a looper pedal at your feet.",
    keys: [
      { key: "K2", word: "REC", says: "Record onto the loop." },
      { key: "K3", word: "REV", says: "Play it backwards." },
      { key: "E2", word: "RATE", says: "Tape speed." },
      { key: "E3", word: "LOOP", says: "Loop length." },
    ],
    picture: "Two reels turn at the real speed of the tape, backwards in reverse and still when stopped.",
    clips: ["tape"],
  },
  {
    id: "filter",
    name: "FILTER",
    does: "Low-pass, high-pass or band-pass for the track, with drive and crush.",
    keys: [
      { key: "K2", word: "OPEN", says: "Open the filter all the way." },
      { key: "K3", word: "TYPE", says: "LP, HP or BP." },
      { key: "E2", word: "CUTOFF", says: "The cutoff." },
      { key: "E3", word: "RESO", says: "Resonance." },
    ],
    shift: "Hold K1 for DRIVE and CRUSH.",
    picture: "The filter's curve over 100 Hz, 1 kHz and 10 kHz. Drive roughens the line and crush turns it into stairs.",
    clips: ["filter"],
  },
  {
    id: "effect",
    name: "EFFECT",
    does: "Two effects in a row on each track: chorus, flanger, wobble, resonator, ring or echo.",
    keys: [
      { key: "K2", word: "ON", says: "Turn the effect on." },
      { key: "K3", word: "TYPE", says: "The next type. Hold for the next track." },
      { key: "E2", word: "AMOUNT", says: "How much." },
      { key: "E3", word: "RATE", says: "How fast." },
    ],
    shift: "Hold K1 for the second effect's amount and rate.",
    picture: "Every type draws its own trace: drifting copies for chorus, a ringing string and its note for the resonator, a burst and its repeats for echo.",
    clips: ["effect"],
  },
  {
    id: "delay",
    name: "DELAY",
    does: "A delay that every track can send into, from TRACKS.",
    keys: [
      { key: "K2", word: "INF", says: "Hold the echoes forever." },
      { key: "K3", word: "KILL", says: "Cut them." },
      { key: "E2", word: "WET", says: "How loud the echoes are." },
      { key: "E3", word: "FEEDBACK", says: "How many come back." },
    ],
    shift: "Hold K1 for the delay time and its sync to the clock.",
    picture: "A spike and its echoes, spaced by the delay time and fading with the feedback, on a ruler of one and two seconds.",
    clips: ["delay"],
  },
  {
    id: "reverb",
    name: "REVERB",
    does: "A room that every track can send into.",
    keys: [
      { key: "K2", word: "WASH", says: "Flood the room." },
      { key: "K3", word: "BLOOM", says: "Shimmer: the tail climbs in octaves." },
      { key: "E2", word: "WET", says: "How loud the tail is." },
      { key: "E3", word: "DECAY", says: "How long it lasts." },
    ],
    shift: "Hold K1 for SIZE and DAMP.",
    picture: "Four squares make the room. A line from each corner is a track's send, and pulses leave the centre while a sending track sounds.",
    clips: ["reverb"],
  },
  {
    id: "mix",
    name: "MIX",
    does: "Balance the tracks against the tape loop, and set the output.",
    keys: [
      { key: "K2", word: "ENG", says: "Throw the tracks out of the mix, and back." },
      { key: "K3", word: "TAPE", says: "The same for the tape." },
      { key: "E2", word: "MIX", says: "Tracks against tape." },
      { key: "E3", word: "OUT", says: "Output level." },
    ],
    picture: "The input, the tracks and the tape drawn at the level you hear them. A lane you throw out lies flat and dim.",
    clips: ["mix"],
  },
  {
    id: "pads",
    name: "PADS",
    does: "The loop cut into eight slices to play, with a step sequencer.",
    keys: [
      { key: "K2", word: "PAD", says: "Play the slice while you hold." },
      { key: "K3", word: "ROUTE", says: "Send MIDI notes to the pads." },
      { key: "E2", word: "SLICE", says: "Pick a slice." },
      { key: "E3", word: "PITCH", says: "Its pitch." },
    ],
    picture: "The loop with its cuts, eight numbered cells that light while they sound, and the sequencer's steps below.",
    clips: ["pads"],
  },
  {
    id: "motion",
    name: "MOTION",
    does: "Record your knob moves and loop them, and set four modulators that sway the sound.",
    keys: [
      { key: "K2", word: "REC", says: "Record what your hands do." },
      { key: "K3", word: "PLAY", says: "Loop it back." },
      { key: "E2", word: "LANE", says: "Pick a lane or a modulator." },
      { key: "E3", word: "DEPTH", says: "How far it moves." },
    ],
    picture: "Each recorded knob is a lane with its curve, and each modulator a moving wave with a dot for now.",
    clips: ["motion"],
  },
  {
    id: "scene",
    name: "SCENE",
    does: "Keep a whole sound in a slot, call it back, or morph toward it.",
    keys: [
      { key: "K2", word: "RCL", says: "Recall the slot. Hold to peek." },
      { key: "K3", word: "CAP", says: "Capture the sound." },
      { key: "E2", word: "SLOT", says: "Pick a slot." },
      { key: "E3", word: "MORPH", says: "Glide toward it." },
    ],
    shift: "Hold K1 to set the orbit: the sound drifts around the slots on its own.",
    picture: "Eight slots and a way back to where you started. The rail shows how far the sound has travelled toward the slot.",
    clips: ["scene"],
  },
];

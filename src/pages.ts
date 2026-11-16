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

// ---- the machines --------------------------------------------------------
export type Machine = { id: string; name: string; text: string; clips: string[] };

/** The five voices: the machines that make the sound. */
export const VOICES: Machine[] = [
  {
    id: "m-play",
    name: "PLAY",
    text: "The take as a tape loop. Pitch bends it like varispeed, and at pitch 1 it comes back bit for bit. On track 1, erosion rewrites the loop a little darker and quieter on every pass, and HEAL stops it.",
    clips: ["voice_play"],
  },
  {
    id: "m-grain",
    name: "GRAIN",
    text: "A cloud of short slices of the take, in stereo pairs, sprayed around the playhead. They arrive anywhere from a steady pulse to random timing, up to 48 pairs at once. Size and density shape the cloud.",
    clips: ["voice_grain"],
  },
  {
    id: "m-warp",
    name: "WARP",
    text: "Slow or fast at the same pitch. Each grain picks up where the last one left off, so the waves line up and drums keep their edge. At speed 1 it is the take, sample for sample.",
    clips: ["voice_warp"],
  },
  {
    id: "m-pv",
    name: "PV",
    text: "A phase vocoder. It plays the take's spectrum back at any speed, and a standing head freezes the sound into a drone that you can still pitch.",
    clips: ["voice_pv"],
  },
  {
    id: "m-cloud",
    name: "CLOUD",
    text: "A texture granulator for washes and smears. It is MiClouds when the mi-UGens are installed on the norns, and a stock granulator when they are not.",
    clips: ["voice_cloud"],
  },
];

/** The machines that play on their own while your hands are busy. */
export const AUTOMATA: Machine[] = [
  {
    id: "m-seq",
    name: "SEQUENCER",
    text: "Plays the eight pads on the clock. It walks them up, down, back and forth or at random. Step chance skips hits and step gate shortens them. The header shows SQ while it runs.",
    clips: ["pads"],
  },
  {
    id: "m-lfo",
    name: "MODULATORS",
    text: "Four of them. Each one swings a knob around where you left it: sine, triangle, square, ramp, random, or ENV, the envelope of what comes in. Free from 0.01 to 6 Hz, or locked to the clock from a beat to eight bars.",
    clips: ["motion"],
  },
  {
    id: "m-motion",
    name: "MOTION",
    text: "Records what your hands do to the knobs and plays it back as a loop. A loop close to a musical length snaps to it, so it stays on the clock.",
    clips: ["motion"],
  },
  {
    id: "m-orbit",
    name: "ORBIT",
    text: "Wanders between the scenes you stored. It picks one, morphs part of the way, rests, and picks the next. Drift sets how long it takes, reach how far it goes.",
    clips: ["scene"],
  },
];

// ---- the ideas behind it -------------------------------------------------
export type Idea = { id: string; title: string; text: string; sketch: string };

export const IDEAS: Idea[] = [
  {
    id: "i-grains",
    title: "Granular clouds",
    sketch: "grains",
    text: "Many short slices of the take play at once, each faded in and out by a Hann window. They come in stereo pairs and arrive on a steady pulse, at random (Poisson) times, or anywhere between. The level follows the overlap, density times size, so a thicker cloud is denser, not louder.",
  },
  {
    id: "i-wsola",
    title: "Time stretch by WSOLA",
    sketch: "wsola",
    text: "WARP places each new grain where it continues the last one. It searches about 10 ms around the planned spot for the best match by cross-correlation, so the waves line up instead of fluttering. A grain that starts on an attack is copied whole.",
  },
  {
    id: "i-pv",
    title: "A phase vocoder with locked phases",
    sketch: "pv",
    text: "PV cuts the take into frames of 2048 samples at 75% overlap and plays their spectra back at any speed. Only the peaks carry their phase forward, and every other bin follows its peak (Laroche and Dolson, 1999), so a note stays one note. A sudden attack resets the phases and stays sharp.",
  },
  {
    id: "i-sinc",
    title: "Windowed sinc resampling",
    sketch: "sinc",
    text: "Pitch is a resampler: a sinc kernel with 16 taps and a Kaiser window, read from a table of 512 fractional positions. Above pitch 1 its cutoff falls with the ratio, so up to pitch 2 the top of the sound does not fold back as noise. At pitch 1 the take comes out bit for bit.",
  },
  {
    id: "i-bbd",
    title: "A bucket brigade delay",
    sketch: "bbd",
    text: "An analog delay chip is a chain of capacitors that pass a charge along on every clock tick. four models one. The TIME knob moves the clock, so a change of time bends the echoes in pitch like tape, and a long delay means a slow clock and a darker echo. That darkness is the sampling theorem at work.",
  },
  {
    id: "i-room",
    title: "A room from eight delay lines",
    sketch: "room",
    text: "The reverb is a feedback delay network: eight delay lines feed each other through a Householder matrix, which keeps the energy until the walls take some away. SIZE sets the room and DAMP darkens the reflections, as air and soft walls do. Shimmer sends the tail around again an octave up.",
  },
  {
    id: "i-ladder",
    title: "A diode ladder filter",
    sketch: "ladder",
    text: "The filter models a diode ladder: a low-pass whose resonance sings just short of oscillation. High-pass is its mirror, and band-pass is the low-pass peak with the lows taken away. A change of type crossfades in 20 ms, so it never clicks.",
  },
  {
    id: "i-colour",
    title: "Drive and crush",
    sketch: "colour",
    text: "Drive pushes the track into a tanh curve, the soft clip of an overdriven amplifier, through four's own fast copy of it. Crush lowers the sample rate and the bit depth together, for aliasing on purpose.",
  },
  {
    id: "i-lanes",
    title: "Only what you hear runs",
    sketch: "lanes",
    text: "Each track's filter, colour and effects are small synths in a lane, and only the ones you hear exist. An effect that is off costs nothing, so the audio thread only carries what you can hear.",
  },
];

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
    does: "Record up to a minute from the input, then choose the part that loops.",
    keys: [
      { key: "K2", word: "REC", says: "Tap to record, tap again to stop. Or hold it and record just that long." },
      { key: "K3", word: "SNAP", says: "Open the loop to the whole buffer, and back. Hold to undo the last change to the take." },
      { key: "E2", word: "START", says: "Move the start of the loop." },
      { key: "E3", word: "END", says: "Move the end." },
    ],
    shift: "Hold K1 and E2 slides the whole loop along the take. E3 sprays GRAIN's grains across it.",
    picture:
      "The take's waveform, with the loop bright between its brackets and the rest dimmed. While you record, the head writes, the seconds count up and the IN meter shows your level.",
    clips: ["take"],
  },
  {
    id: "voice",
    name: "VOICE",
    does: "How the track reads its take: as tape, as grains, stretched, as a spectrum, or through Clouds.",
    keys: [
      { key: "K2", word: "FRZ", says: "Freeze GRAIN, PV or CLOUD where they are. In PLAY on track 1 this key is HEAL." },
      { key: "K3", word: "MODE", says: "Next voice. Hold to jump to the next track." },
      { key: "E2", word: "SPEED", says: "Speed. Grain size in GRAIN and CLOUD, the window in WARP." },
      { key: "E3", word: "PITCH", says: "Pitch. Density in GRAIN and CLOUD, randomness in WARP." },
    ],
    shift:
      "Hold K1 for a second pair, which depends on the voice: speed and pitch in WARP and CLOUD, spray and detune in GRAIN, erosion and wear in PLAY on track 1.",
    picture:
      "Each voice draws how it works. PLAY is one unbroken wave, GRAIN and CLOUD a cloud of ticks, WARP its overlapping windows, PV the columns of its spectrum.",
    clips: ["voice_play", "voice_grain", "voice_warp", "voice_pv", "voice_cloud"],
  },
  {
    id: "tracks",
    name: "TRACKS",
    does: "All four tracks in one list. This is where you pick the track that TAKE, VOICE, FILTER and EFFECT edit.",
    keys: [
      { key: "K2", word: "ON", says: "Track on or off." },
      { key: "K3", word: "MODE", says: "Its next voice." },
      { key: "E2", word: "TRACK", says: "Pick a track." },
      { key: "E3", word: "LEVEL", says: "How loud it is." },
    ],
    shift:
      "Hold K1 for the sends. E2 picks where to (another track, D for the delay, R for the reverb) and E3 how much. Every send starts at zero.",
    picture:
      "A row per track: its voice, its loop on the take and a moving head. The arrow marks the track the other pages are editing.",
    clips: ["tracks", "tracks_sends"],
  },
  {
    id: "tape",
    name: "TAPE",
    does: "A softcut loop under the whole instrument, for overdubs of the input or of four itself.",
    keys: [
      { key: "K2", word: "REC", says: "Record into the loop." },
      { key: "K3", word: "REV", says: "Play it backwards." },
      { key: "E2", word: "RATE", says: "Tape speed. The pitch goes with it." },
      { key: "E3", word: "LOOP", says: "How long the loop is." },
    ],
    shift:
      "Hold K1 for PRE, how much of the old pass survives an overdub, and SOURCE, which fades what the tape hears from the dry input to four's own output.",
    picture: "Two reels turn at the tape's real speed. They run backwards in reverse and stand still when it stops.",
    clips: ["tape"],
  },
  {
    id: "filter",
    name: "FILTER",
    does: "Low-pass, high-pass or band-pass on the track, with drive and crush after it.",
    keys: [
      { key: "K2", word: "OPEN", says: "Throw the filter wide open. Tap again to go back." },
      { key: "K3", word: "TYPE", says: "LP, HP or BP. Hold for the next track." },
      { key: "E2", word: "CUTOFF", says: "Sweep the cutoff." },
      { key: "E3", word: "RESO", says: "How hard it rings at the cutoff." },
    ],
    shift: "Hold K1 for DRIVE and CRUSH.",
    picture: "The response curve over 100 Hz, 1 kHz and 10 kHz. Drive roughens the line and crush breaks it into stairs.",
    clips: ["filter"],
  },
  {
    id: "effect",
    name: "EFFECT",
    does: "Two effect slots in a row on each track: chorus, flanger, wobble, resonator, ring or echo.",
    keys: [
      { key: "K2", word: "ON", says: "Effect on or off." },
      { key: "K3", word: "TYPE", says: "Next type. Hold for the next track." },
      { key: "E2", word: "AMOUNT", says: "How much." },
      { key: "E3", word: "RATE", says: "How fast. On the resonator it picks the note." },
    ],
    shift: "Hold K1 for the second slot's amount and rate. Its type is in PARAMS for now.",
    picture: "Each type draws its own trace: drifting copies for chorus, a ringing string and its note for the resonator, a burst and its repeats for echo.",
    clips: ["effect"],
  },
  {
    id: "delay",
    name: "DELAY",
    does: "The shared delay. It stays silent until a track sends to it from TRACKS.",
    keys: [
      { key: "K2", word: "INF", says: "Feedback to the top, so the echoes hang. Tap again to let go." },
      { key: "K3", word: "KILL", says: "Mute the echoes." },
      { key: "E2", word: "WET", says: "How loud the echoes are." },
      { key: "E3", word: "FEEDBACK", says: "How many come back." },
    ],
    shift: "Hold K1 for the time, free or synced to the clock.",
    picture: "A spike and its echoes on a ruler of one and two seconds. The gaps are the delay time and the fade is the feedback.",
    clips: ["delay"],
  },
  {
    id: "reverb",
    name: "REVERB",
    does: "The shared room. Like the delay, it only hears the tracks that send to it.",
    keys: [
      { key: "K2", word: "WASH", says: "Stretch the decay to nearly forever." },
      { key: "K3", word: "BLOOM", says: "More shimmer. The tail climbs in octaves." },
      { key: "E2", word: "WET", says: "How loud the tail is." },
      { key: "E3", word: "DECAY", says: "How long it rings." },
    ],
    shift: "Hold K1 for SIZE and DAMP.",
    picture: "Four squares, one inside the other, are the room. A line from each corner is a track's send, and pulses leave the centre while that track plays into it.",
    clips: ["reverb"],
  },
  {
    id: "mix",
    name: "MIX",
    does: "The tracks against the tape loop, and the level that leaves the norns.",
    keys: [
      { key: "K2", word: "ENG", says: "Only the tracks. Tap again to bring the tape back." },
      { key: "K3", word: "TAPE", says: "Only the tape." },
      { key: "E2", word: "MIX", says: "Fade from the tracks to the tape." },
      { key: "E3", word: "OUT", says: "Output level." },
    ],
    shift: "Hold K1 for INPUT, the norns input level, and DRY/WET, the live input against four's sound.",
    picture: "The input, the tracks and the tape, each drawn at the level you hear. Throw one out and it lies flat and dim.",
    clips: ["mix"],
  },
  {
    id: "pads",
    name: "PADS",
    does: "The loop cut into eight slices, for your fingers, a MIDI keyboard or the sequencer.",
    keys: [
      { key: "K2", word: "PAD", says: "Play the slice while you hold." },
      { key: "K3", word: "ROUTE", says: "Let MIDI or a typing keyboard play the slices." },
      { key: "E2", word: "SLICE", says: "Pick a slice." },
      { key: "E3", word: "PITCH", says: "Its pitch." },
    ],
    shift: "Hold K1 for the slice's voice, grains or the plain slice, and its release.",
    picture: "The loop with its cuts, eight numbered cells that light up as they play, and the sequencer's steps underneath.",
    clips: ["pads"],
  },
  {
    id: "motion",
    name: "MOTION",
    does: "Loop your knob moves, and run four modulators.",
    keys: [
      { key: "K2", word: "REC", says: "Record what your hands do." },
      { key: "K3", word: "PLAY", says: "Play it back as a loop." },
      { key: "E2", word: "LANE", says: "Pick a lane. Turn past the last one for the modulators." },
      { key: "E3", word: "DEPTH", says: "How far it moves." },
    ],
    shift: "Hold K1 for the loop's length. With a modulator picked, K1 gives its period and its target.",
    picture: "Every recorded knob is a lane with its curve. Every modulator is a moving wave with a dot on now.",
    clips: ["motion"],
  },
  {
    id: "scene",
    name: "SCENE",
    does: "Eight slots that each hold a whole sound, and a crossfader between two of them.",
    keys: [
      { key: "K2", word: "RCL", says: "Land the selected slot. Hold to peek, let go to come back." },
      { key: "K3", word: "CAP", says: "Capture the sound into the slot." },
      { key: "E2", word: "SLOT", says: "Pick B, the right side of the fader." },
      { key: "E3", word: "MORPH", says: "Fade between A and B, either way." },
    ],
    shift: "Hold K1 and turn E2 to pick A, the left side: LIVE or any stored slot. The orbit's drift and reach are in PARAMS.",
    picture: "The eight slots and the way back to where you started. The rail shows where the sound sits between A and B.",
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
    text: "The take as a tape loop. SPEED and PITCH both work like varispeed, and at pitch 1 you hear the recording bit for bit. Track 1 can also erode: every pass rewrites the loop a little darker and quieter, until you press HEAL.",
    clips: ["voice_play"],
  },
  {
    id: "m-grain",
    name: "GRAIN",
    text: "Short slices of the take in stereo pairs, sprayed around the play head. The timing goes from a steady pulse to pure chance. E2 is the grain size, E3 the density, and with the plugin the cloud holds up to 48 pairs.",
    clips: ["voice_grain"],
  },
  {
    id: "m-warp",
    name: "WARP",
    text: "Change the speed, keep the pitch. Every new grain starts where the last one would have carried on, so the waves meet in phase and nothing flutters. E2 sets the window, and speed and pitch sit under K1.",
    clips: ["voice_warp"],
  },
  {
    id: "m-pv",
    name: "PV",
    text: "A phase vocoder: the take as a spectrum, played back at any speed. Stop the head and the sound freezes into a drone that you can still pitch around.",
    clips: ["voice_pv"],
  },
  {
    id: "m-cloud",
    name: "CLOUD",
    text: "CLOUD is Mutable Instruments Clouds, for washes and smears. E2 and E3 are size and density, and K1 gives you speed and pitch.",
    clips: ["voice_cloud"],
  },
];

/** The machines that play on their own while your hands are busy. */
export const AUTOMATA: Machine[] = [
  {
    id: "m-seq",
    name: "SEQUENCER",
    text: "Plays the eight pads on the norns clock, up, down, back and forth or at random. Step chance drops hits and step gate shortens them. It lives in PARAMS, and SQ shows in the header while it runs. Map sequencer run to a footswitch.",
    clips: ["pads"],
  },
  {
    id: "m-lfo",
    name: "MODULATORS",
    text: "Four of them, each on any track. A modulator swings the sound around where you left the knob, and the knob itself stays put. The shapes are sine, triangle, square, ramp, random and ENV, which follows the input. They run free from 0.01 to 6 Hz, or lock to the clock from a beat to eight bars.",
    clips: ["motion"],
  },
  {
    id: "m-motion",
    name: "MOTION",
    text: "Records what your hands do to the knobs and plays it back as a loop. If the loop comes out close to a musical length, it snaps to that length and stays on the clock.",
    clips: ["motion"],
  },
  {
    id: "m-orbit",
    name: "ORBIT",
    text: "Wanders between your stored scenes by itself. It picks one, drifts part of the way there, rests, and picks another. Start it with orbit run in PARAMS, where its drift and reach live too.",
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
    text: "GRAIN plays lots of short slices of the take at once, each faded in and out by a Hann window. A left and a right grain always start together, so the stereo image survives. Their timing slides from a steady pulse to random (Poisson) arrivals. The level is scaled by the overlap, density times size, so a thicker cloud gets denser without getting louder.",
  },
  {
    id: "i-wsola",
    title: "Time stretch by WSOLA",
    sketch: "wsola",
    text: "Stretch a sound by laying grains over each other and the waves rarely line up. You hear it as a flutter at the grain rate. WSOLA fixes that. Before WARP places a grain, it looks at where the previous grain would naturally carry on. If that spot is within 10 ms of the head, the new grain starts right there. If not, WARP searches 10 ms either side of the head for the best match by cross-correlation. At speed 1 every grain continues the last one, and out comes the take.",
  },
  {
    id: "i-pv",
    title: "A phase vocoder with locked phases",
    sketch: "pv",
    text: "PV cuts the take into frames of 2048 samples, a new one every 512, and plays their spectra back at any speed. The hard part is phase. Move every bin's phase on its own and the bins of one note drift apart into that hollow, phasey stretch sound. Here only the peaks carry their phase forward, and the bins around each peak keep their offset from it (Laroche and Dolson, 1999), so a note stays one note. A sudden jump in level resets the phases, so an attack comes through as it was played.",
  },
  {
    id: "i-sinc",
    title: "Windowed sinc resampling",
    sketch: "sinc",
    text: "A pitch change means reading the take between its samples. Instead of a cubic guess, four reads with a sinc kernel under a Kaiser window, 16 taps wide. Above pitch 1 the kernel grows to 32 taps and its cutoff drops with the ratio, so up to pitch 2 the top of the sound does not fold back down as aliasing. At pitch 1 every read lands on a whole sample and you get the take bit for bit.",
  },
  {
    id: "i-bbd",
    title: "A bucket brigade delay",
    sketch: "bbd",
    text: "An analog delay chip is a row of capacitors that hand a charge along, one step per clock tick. four models one. TIME changes the clock, so turning it bends the echoes in pitch the way tape does. A long delay needs a slow clock, and a slow clock carries less treble, so long echoes come back darker. That is Nyquist, the same as in the hardware.",
  },
  {
    id: "i-room",
    title: "A room from eight delay lines",
    sketch: "room",
    text: "The reverb is a feedback delay network: eight delay lines that feed each other through a Householder matrix. The matrix loses no energy, and a filter in each line takes a little away on every trip, the way air and soft walls do. SIZE sets the room and DAMP darkens it. BLOOM's shimmer sends the tail around again an octave up.",
  },
  {
    id: "i-ladder",
    title: "A diode ladder filter",
    sketch: "ladder",
    text: "FILTER is DFM1 from sc3-plugins, a diode ladder model. Its resonance sings up to just short of self-oscillation and stops there. High-pass is the same ladder turned around, and band-pass is the resonant low-pass peak with the lows cut away under it. A change of type crossfades over 20 ms instead of jumping.",
  },
  {
    id: "i-colour",
    title: "Drive and crush",
    sketch: "colour",
    text: "Drive pushes the track into a tanh curve, the soft clip of an overdriven amp. tanh is slow on a Pi, so four carries its own copy that matches it to within two parts in ten million at about ten times the speed. Crush holds each sample for longer and rounds it to fewer bits, down to a 32nd of the sample rate and 4 bits at the top of the knob, for aliasing on purpose.",
  },
  {
    id: "i-lanes",
    title: "Only what you hear runs",
    sketch: "lanes",
    text: "Each track's filter, colour and effects are small synths in a lane, and a part only exists while you can hear it. An effect that is off is not running. Neither is the colour stage while drive and crush sit at zero, or the filter family you are not using. When lanes went in, four PLAY tracks dropped from 36% of the audio thread to 25%.",
  },
];

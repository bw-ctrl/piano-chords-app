import React, { useState, useEffect } from 'react';
import {
  Music,
  RotateCw,
  Eye,
  EyeOff,
  Settings,
  ChevronRight,
  Guitar,
  Keyboard,
  Check,
  X,
} from 'lucide-react';

// ====== DELAYS (je kunt deze tunen) ======
const CHORD_DETECT_DELAY_MS = 100;   // tijd tussen laatste input en check (akkoorden)
const SCALE_DETECT_DELAY_MS = 50;   // tijd tussen laatste input en check (schaalnoten)
const CHORD_NEXT_DELAY_MS = 400;     // na goede akkoord naar volgende
const SCALE_NEXT_DELAY_MS = 50;     // na goede toon naar volgende toon

// ====== Muziek helper-data ======
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_INDEX = NOTE_NAMES.reduce((acc, note, i) => {
  acc[note] = i;
  return acc;
}, {});

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_QUALITIES = ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'];
const MINOR_QUALITIES = ['m', 'dim', 'maj', 'm', 'm', 'maj', 'maj'];

const normalizeNoteName = (note) => {
  const map = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  return map[note] || note;
};

const transpose = (root, semitones) => {
  const norm = normalizeNoteName(root);
  const idx = NOTE_INDEX[norm];
  if (idx == null) return norm;
  return NOTE_NAMES[(idx + semitones + 12) % 12];
};

const createScale = (root, mode) => {
  const intervals = mode === 'minor' ? MINOR_INTERVALS : MAJOR_INTERVALS;
  const qualities = mode === 'minor' ? MINOR_QUALITIES : MAJOR_QUALITIES;

  const notes = intervals.map((semitones) => transpose(root, semitones));

  const chords = notes.map((note, i) => {
    const q = qualities[i];
    if (q === 'maj') return note;
    if (q === 'm') return `${note}m`;
    if (q === 'dim') return `${note}dim`;
    return note;
  });

  return { notes, chords };
};

// ==== Extra uitgewerkte akkoorden (7's, sus, add) ====
const chordNotesOverrides = {
  C: 'C–E–G',
  Dm: 'D–F–A',
  Em: 'E–G–B',
  F: 'F–A–C',
  G: 'G–B–D',
  Am: 'A–C–E',
  Bdim: 'B–D–F',
  D: 'D–F#–A',
  'F#m': 'F#–A–C#',
  A: 'A–C#–E',
  Bm: 'B–D–F#',
  'C#dim': 'C#–E–G',
  E: 'E–G#–B',
  'C#m': 'C#–E–G#',
  'G#dim': 'G#–B–D',
  Bb: 'Bb–D–F',
  Gm: 'G–Bb–D',
  Edim: 'E–G–Bb',
  'F#dim': 'F#–A–C',
  Cmaj7: 'C–E–G–B',
  Fmaj7: 'F–A–C–E',
  Gmaj7: 'G–B–D–F#',
  Dmaj7: 'D–F#–A–C#',
  Amaj7: 'A–C#–E–G#',
  Am7: 'A–C–E–G',
  Dm7: 'D–F–A–C',
  Em7: 'E–G–B–D',
  Bm7: 'B–D–F#–A',
  'F#m7': 'F#–A–C#–E',
  G7: 'G–B–D–F',
  D7: 'D–F#–A–C',
  A7: 'A–C#–E–G',
  C7: 'C–E–G–Bb',
  E7: 'E–G#–B–D',
  Csus2: 'C–D–G',
  Csus4: 'C–F–G',
  Cadd9: 'C–E–G–D',
  Gsus2: 'G–A–D',
  Gsus4: 'G–C–D',
  Gadd9: 'G–B–D–A',
  Dsus2: 'D–E–A',
  Dsus4: 'D–G–A',
  Dadd9: 'D–F#–A–E',
  Asus2: 'A–B–E',
  Asus4: 'A–D–E',
  Aadd9: 'A–C#–E–B',
};

const seventhChords = [
  'Cmaj7',
  'Fmaj7',
  'Gmaj7',
  'Dmaj7',
  'Amaj7',
  'Am7',
  'Dm7',
  'Em7',
  'Em7',
  'Bm7',
  'F#m7',
  'G7',
  'D7',
  'A7',
  'C7',
  'E7',
];

const extendedChords = [
  'Csus2',
  'Csus4',
  'Cadd9',
  'Gsus2',
  'Gsus4',
  'Gadd9',
  'Dsus2',
  'Dsus4',
  'Dadd9',
  'Asus2',
  'Asus4',
  'Aadd9',
];

const allRoots = NOTE_NAMES; // alle 12 noten

const midiNoteToName = (midiNote) => {
  return NOTE_NAMES[midiNote % 12];
};

const normalizeNote = (note) => normalizeNoteName(note);

// autom. triad als er geen override is
const computeTriad = (chordName) => {
  // 7, sus, add laten we over aan overrides
  if (chordName.includes('7') || chordName.includes('sus') || chordName.includes('add')) {
    return null;
  }

  let quality = 'maj';
  let root = chordName;

  if (chordName.endsWith('dim')) {
    quality = 'dim';
    root = chordName.slice(0, -3);
  } else if (chordName.endsWith('m')) {
    quality = 'min';
    root = chordName.slice(0, -1);
  }

  root = normalizeNoteName(root);
  const idx = NOTE_INDEX[root];
  if (idx == null) return null;

  let intervals;
  if (quality === 'maj') intervals = [0, 4, 7];
  else if (quality === 'min') intervals = [0, 3, 7];
  else if (quality === 'dim') intervals = [0, 3, 6];
  else intervals = [0, 4, 7];

  const notes = intervals.map((semitones) => NOTE_NAMES[(idx + semitones) % 12]);
  return notes;
};

const getChordNoteSets = (chord, difficulty) => {
  let arr;

  if (chordNotesOverrides[chord]) {
    arr = chordNotesOverrides[chord].split('–').map((n) => normalizeNote(n.trim()));
  } else {
    const triad = computeTriad(chord);
    if (!triad) return { required: new Set(), all: new Set() };
    arr = triad;
  }

  let required = new Set(arr);
  let all = new Set(arr);

  // 7e optioneel in 7th-modes
  const isSeventhMode = difficulty === 'seventh' || difficulty === 'extended';
  const isSeventhChord = /7/.test(chord) && arr.length > 3;

  if (isSeventhMode && isSeventhChord) {
    required = new Set(arr.slice(0, 3)); // triad verplicht
    all = new Set(arr); // 7e optioneel
  }

  return { required, all };
};

const getRomanNumeral = (chord, root, mode) => {
  const { chords } = createScale(root, mode);
  const index = chords.indexOf(chord);

  if (index === -1) return '';

  if (mode === 'minor') {
    const numerals = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
    return numerals[index] || '';
  }

  const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  return numerals[index] || '';
};

const ChordLearningApp = () => {
  const [mode, setMode] = useState('single'); // 'single' | 'progression' | 'scale'
  const [difficulty, setDifficulty] = useState('triads'); // 'triads' | 'seventh' | 'extended'

  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedMode, setSelectedMode] = useState('major'); // 'major' | 'minor'

  const [chordPoolMode, setChordPoolMode] = useState('inKey'); // 'inKey' | 'all'

  const [currentChord, setCurrentChord] = useState(null);
  const [currentProgression, setCurrentProgression] = useState({ chords: [], name: '' });
  const [progressionIndex, setProgressionIndex] = useState(0);
  const [progressionResults, setProgressionResults] = useState([]); // 'correct' | 'wrong' | null per chord
  const [progressionDone, setProgressionDone] = useState(false);

  const [currentScale, setCurrentScale] = useState(null); // {root, mode, notes: []}
  const [scaleNoteIndex, setScaleNoteIndex] = useState(0);

  const [showNotes, setShowNotes] = useState(false);
  const [showGuitar, setShowGuitar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [midiEnabled, setMidiEnabled] = useState(false);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  const [showMidiSetup, setShowMidiSetup] = useState(false);
  const [midiError, setMidiError] = useState(null);
  const [midiDevices, setMidiDevices] = useState([]);

  const [cardFlash, setCardFlash] = useState(null); // 'success' | 'error' | null

  const [gameStats, setGameStats] = useState({
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
  });

  const [scaleStats, setScaleStats] = useState({
    runs: 0,
    errors: 0,
  });

  // ====== MIDI ======
  const setupMIDI = async () => {
    try {
      setMidiError(null);

      if (!navigator.requestMIDIAccess) {
        setMidiError('Je browser ondersteunt geen MIDI. Probeer Chrome, Edge of Opera.');
        return;
      }

      const access = await navigator.requestMIDIAccess();
      const inputs = Array.from(access.inputs.values());

      if (inputs.length === 0) {
        setMidiError('Geen MIDI keyboard gevonden. Sluit aan en herlaad de pagina.');
        return;
      }

      setMidiDevices(inputs.map((i) => i.name || 'Unknown device'));
      setMidiEnabled(true);

      for (let input of inputs) {
        input.onmidimessage = handleMIDIMessage;
      }
    } catch (error) {
      setMidiError(`MIDI fout: ${error.message}. Zorg dat je toestemming geeft in je browser.`);
    }
  };

  const handleMIDIMessage = (message) => {
    const [command, note, velocity] = message.data;

    if (command === 144 && velocity > 0) {
      setPressedNotes((prev) => {
        const ns = new Set(prev);
        ns.add(note);
        return ns;
      });
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      setPressedNotes((prev) => {
        const ns = new Set(prev);
        ns.delete(note);
        return ns;
      });
    }
  };

  // ====== Chord evaluatie (single & progression) ======
  const evaluateChord = (chordName) => {
    if (!chordName || pressedNotes.size === 0) return null;

    const playedNotes = Array.from(pressedNotes).map((n) =>
      normalizeNote(midiNoteToName(n))
    );
    const playedSet = new Set(playedNotes);

    const { required, all } = getChordNoteSets(chordName, difficulty);

    const correctNotes = [...playedSet].filter((n) => all.has(n));
    const missingNotes = [...required].filter((n) => !playedSet.has(n));
    const wrongNotes = [...playedSet].filter((n) => !all.has(n));

    const isCorrect =
      missingNotes.length === 0 &&
      wrongNotes.length === 0 &&
      correctNotes.length > 0;

    return {
      chordName,
      isCorrect,
      correctNotes,
      missingNotes,
      wrongNotes,
      playedNotes: [...playedSet],
    };
  };

  const checkChordSingle = () => {
    if (!currentChord || pressedNotes.size === 0) return;
    const result = evaluateChord(currentChord);
    if (!result) return;

    setFeedback(result);
    setCardFlash(result.isCorrect ? 'success' : 'error');

    setGameStats((prev) => {
      const attempts = prev.attempts + 1;
      const correct = prev.correct + (result.isCorrect ? 1 : 0);
      const streak = result.isCorrect ? prev.streak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, streak);
      return { attempts, correct, streak, bestStreak };
    });

    if (midiEnabled) {
      setTimeout(() => {
        newCard();
      }, CHORD_NEXT_DELAY_MS);
    }
  };

  const checkChordProgression = () => {
    if (!currentProgression.chords.length || pressedNotes.size === 0) return;
    if (progressionDone) return;

    const expectedChord = currentProgression.chords[progressionIndex];
    const result = evaluateChord(expectedChord);
    if (!result) return;

    setFeedback(result);
    setCardFlash(result.isCorrect ? 'success' : 'error');

    setProgressionResults((prev) => {
      const copy = [...prev];
      copy[progressionIndex] = result.isCorrect ? 'correct' : 'wrong';
      return copy;
    });

    const isLast = progressionIndex === currentProgression.chords.length - 1;

    if (isLast) {
      setProgressionDone(true);
      // niet auto nieuwe progression -> user drukt Enter of klikt knop
    } else {
      setProgressionIndex((prev) => prev + 1);
    }
  };

  // ====== Schaal-noten check ======
  const checkScaleNote = () => {
    if (!currentScale || !currentScale.notes || currentScale.notes.length === 0) return;
    if (pressedNotes.size === 0) return;

    const target = normalizeNote(currentScale.notes[scaleNoteIndex]);
    const playedNotes = Array.from(pressedNotes).map((n) =>
      normalizeNote(midiNoteToName(n))
    );
    const playedSet = new Set(playedNotes);

    const isCorrect = playedSet.size === 1 && playedSet.has(target);

    if (isCorrect) {
      setFeedback({
        isCorrect: true,
        correctNotes: [target],
        missingNotes: [],
        wrongNotes: [],
        playedNotes: [...playedSet],
      });
      setCardFlash('success');

      const isLast = scaleNoteIndex === currentScale.notes.length - 1;
      if (isLast) {
        setScaleStats((prev) => ({ ...prev, runs: prev.runs + 1 }));
      }

      if (midiEnabled) {
        setTimeout(() => {
          setScaleNoteIndex((prev) => {
            if (!currentScale || !currentScale.notes) return 0;
            // na laatste noot -> terug naar index 0 (nieuwe run)
            return (prev + 1) % currentScale.notes.length;
          });
          setFeedback(null);
          setPressedNotes(new Set());
        }, SCALE_NEXT_DELAY_MS);
      }
    } else {
      setFeedback({
        isCorrect: false,
        correctNotes: [],
        missingNotes: [target],
        wrongNotes: [...playedSet].filter((n) => n !== target),
        playedNotes: [...playedSet],
      });
      setCardFlash('error');
      setScaleStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
    }
  };

  // ====== MIDI detectie effect ======
  useEffect(() => {
    if (!midiEnabled || pressedNotes.size === 0) return;

    const delay =
      mode === 'scale' ? SCALE_DETECT_DELAY_MS : CHORD_DETECT_DELAY_MS;

    const timer = setTimeout(() => {
      if (mode === 'scale') {
        checkScaleNote();
      } else if (mode === 'progression') {
        checkChordProgression();
      } else {
        checkChordSingle();
      }
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressedNotes, mode, currentChord, currentProgression, currentScale, midiEnabled, progressionIndex, progressionDone]);

  // flash resetten
  useEffect(() => {
    if (!cardFlash) return;
    const t = setTimeout(() => setCardFlash(null), 220);
    return () => clearTimeout(t);
  }, [cardFlash]);

  // ====== Gitaar diagrams ======
  const guitarChords = {
    C: { frets: ['x', 3, 2, 0, 1, 0], name: 'C open' },
    D: { frets: ['x', 'x', 0, 2, 3, 2], name: 'D open' },
    E: { frets: [0, 2, 2, 1, 0, 0], name: 'E open' },
    F: { frets: [1, 3, 3, 2, 1, 1], name: 'F barre' },
    G: { frets: [3, 2, 0, 0, 0, 3], name: 'G open' },
    A: { frets: ['x', 0, 2, 2, 2, 0], name: 'A open' },
    Am: { frets: ['x', 0, 2, 2, 1, 0], name: 'Am open' },
    Bm: { frets: ['x', 2, 4, 4, 3, 2], name: 'Bm barre' },
    'C#m': { frets: ['x', 4, 6, 6, 5, 4], name: 'C#m barre' },
    Dm: { frets: ['x', 'x', 0, 2, 3, 1], name: 'Dm open' },
    Em: { frets: [0, 2, 2, 0, 0, 0], name: 'Em open' },
    'F#m': { frets: [2, 4, 4, 2, 2, 2], name: 'F#m barre' },
    Gm: { frets: [3, 5, 5, 3, 3, 3], name: 'Gm barre' },
    Bb: { frets: ['x', 1, 3, 3, 3, 1], name: 'Bb barre' },
    Cmaj7: { frets: ['x', 3, 2, 0, 0, 0], name: 'Cmaj7' },
    Dmaj7: { frets: ['x', 'x', 0, 2, 2, 2], name: 'Dmaj7' },
    Fmaj7: { frets: ['x', 'x', 3, 2, 1, 0], name: 'Fmaj7' },
    Gmaj7: { frets: [3, 2, 0, 0, 0, 2], name: 'Gmaj7' },
    Amaj7: { frets: ['x', 0, 2, 1, 2, 0], name: 'Amaj7' },
    Am7: { frets: ['x', 0, 2, 0, 1, 0], name: 'Am7' },
    Bm7: { frets: ['x', 2, 4, 2, 3, 2], name: 'Bm7' },
    Dm7: { frets: ['x', 'x', 0, 2, 1, 1], name: 'Dm7' },
    Em7: { frets: [0, 2, 0, 0, 0, 0], name: 'Em7' },
    'F#m7': { frets: [2, 4, 2, 2, 2, 2], name: 'F#m7' },
    G7: { frets: [3, 2, 0, 0, 0, 1], name: 'G7' },
    D7: { frets: ['x', 'x', 0, 2, 1, 2], name: 'D7' },
    A7: { frets: ['x', 0, 2, 0, 2, 0], name: 'A7' },
    C7: { frets: ['x', 3, 2, 3, 1, 0], name: 'C7' },
    E7: { frets: [0, 2, 0, 1, 0, 0], name: 'E7' },
    Csus2: { frets: ['x', 3, 0, 0, 1, 3], name: 'Csus2' },
    Csus4: { frets: ['x', 3, 3, 0, 1, 1], name: 'Csus4' },
    Cadd9: { frets: ['x', 3, 2, 0, 3, 0], name: 'Cadd9' },
    Gsus2: { frets: [3, 'x', 0, 0, 3, 3], name: 'Gsus2' },
    Gsus4: { frets: [3, 3, 0, 0, 1, 3], name: 'Gsus4' },
    Gadd9: { frets: [3, 'x', 0, 2, 0, 3], name: 'Gadd9' },
    Dsus2: { frets: ['x', 'x', 0, 2, 3, 0], name: 'Dsus2' },
    Dsus4: { frets: ['x', 'x', 0, 2, 3, 3], name: 'Dsus4' },
    Dadd9: { frets: ['x', 'x', 0, 2, 3, 0], name: 'Dadd9' },
    Asus2: { frets: ['x', 0, 2, 2, 0, 0], name: 'Asus2' },
    Asus4: { frets: ['x', 0, 2, 2, 3, 0], name: 'Asus4' },
    Aadd9: { frets: ['x', 0, 2, 4, 2, 0], name: 'Aadd9' },
  };

  const GuitarDiagram = ({ chord }) => {
    const guitarData = guitarChords[chord];
    if (!guitarData) return <div className="text-gray-400">Geen gitaargreep beschikbaar</div>;

    const strings = ['E', 'A', 'D', 'G', 'B', 'e'];
    const frets = guitarData.frets;
    const numFrets = 4;
    const stringSpacing = 30;
    const fretSpacing = 40;

    return (
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-300 mb-4">{guitarData.name}</div>
        <div className="relative inline-block bg-amber-900/20 p-6 rounded-xl">
          <div
            className="relative"
            style={{ width: `${stringSpacing * 5 + 20}px`, height: `${fretSpacing * numFrets + 80}px` }}
          >
            {strings.map((string, i) => (
              <div key={`header-${i}`}>
                <div
                  className="absolute text-xs text-gray-300 font-bold"
                  style={{
                    left: `${i * stringSpacing + 10}px`,
                    top: '0px',
                    width: '20px',
                    textAlign: 'center',
                  }}
                >
                  {string}
                </div>

                {frets[i] === 'x' && (
                  <div
                    className="absolute text-red-400 font-bold text-xl leading-none"
                    style={{
                      left: `${i * stringSpacing + 10}px`,
                      top: '18px',
                      width: '20px',
                      textAlign: 'center',
                    }}
                  >
                    ×
                  </div>
                )}
                {frets[i] === 0 && (
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${i * stringSpacing + 10}px`,
                      top: '18px',
                      width: '20px',
                      height: '20px',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-green-400" />
                  </div>
                )}
              </div>
            ))}

            <div
              className="absolute bg-gray-200"
              style={{
                left: '10px',
                top: '45px',
                width: `${stringSpacing * 5}px`,
                height: '4px',
              }}
            />

            {[...Array(numFrets)].map((_, fretIndex) => (
              <div
                key={`fret-${fretIndex}`}
                className="absolute bg-gray-500"
                style={{
                  left: '10px',
                  top: `${(fretIndex + 1) * fretSpacing + 45}px`,
                  width: `${stringSpacing * 5}px`,
                  height: '1px',
                }}
              />
            ))}

            {strings.map((_, stringIndex) => (
              <div
                key={`string-${stringIndex}`}
                className="absolute bg-gray-400"
                style={{
                  left: `${stringIndex * stringSpacing + 20}px`,
                  top: '45px',
                  width: '1px',
                  height: `${fretSpacing * numFrets + 4}px`,
                }}
              />
            ))}

            {frets.map((fret, stringIndex) => {
              if (fret === 'x' || fret === 0) return null;
              const fretNum = parseInt(fret);

              return (
                <div
                  key={`pos-${stringIndex}`}
                  className="absolute w-7 h-7 rounded-full bg-blue-400 border-2 border-blue-600 flex items-center justify-center text-xs font-bold text-gray-900"
                  style={{
                    left: `${stringIndex * stringSpacing + 20}px`,
                    top: `${(fretNum - 0.5) * fretSpacing + 45}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {fretNum}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center max-w-xs">
          × = niet spelen | ○ = open | nummer = fret
        </div>
      </div>
    );
  };

  // ====== Helpers voor spel ======
  const getRandomChord = () => {
    let availableChords = [];

    if (chordPoolMode === 'inKey') {
      const { chords } = createScale(selectedRoot, selectedMode);
      availableChords = chords;
    } else {
      const set = new Set();
      allRoots.forEach((root) => {
        ['major', 'minor'].forEach((m) => {
          const { chords } = createScale(root, m);
          chords.forEach((c) => set.add(c));
        });
      });
      availableChords = Array.from(set);
    }

    if (difficulty === 'seventh' || difficulty === 'extended') {
      availableChords = [...new Set([...availableChords, ...seventhChords])];
    }
    if (difficulty === 'extended') {
      availableChords = [...new Set([...availableChords, ...extendedChords])];
    }

    return availableChords[Math.floor(Math.random() * availableChords.length)];
  };

  const getRandomProgression = () => {
  // MAJOR progressies (gebruikt als selectedMode === 'major')
  const majorPatterns = [
    // 4-chord pop classics
    { name: 'I–V–vi–IV',        pattern: [0, 4, 5, 3] },
    { name: 'vi–IV–I–V',        pattern: [5, 3, 0, 4] },
    { name: 'I–vi–IV–V',        pattern: [0, 5, 3, 4] },
    { name: 'I–IV–V–IV',        pattern: [0, 3, 4, 3] },
    { name: 'I–V–IV–V',         pattern: [0, 4, 3, 4] },
    { name: 'I–IV–I–V',         pattern: [0, 3, 0, 4] },
    { name: 'I–V–I–IV',         pattern: [0, 4, 0, 3] },
    { name: 'I–IV–ii–V',        pattern: [0, 3, 1, 4] },
    { name: 'ii–V–I–IV',        pattern: [1, 4, 0, 3] },
    { name: 'ii–V–vi–IV',       pattern: [1, 4, 5, 3] },
    { name: 'I–V–iii–vi',       pattern: [0, 4, 2, 5] },
    { name: 'I–V–ii–IV',        pattern: [0, 4, 1, 3] },
    { name: 'I–V–vi–iii',       pattern: [0, 4, 5, 2] },
    { name: 'I–iii–vi–IV',      pattern: [0, 2, 5, 3] },
    { name: 'I–IV–vi–V',        pattern: [0, 3, 5, 4] },
    { name: 'I–IV–V–vi',        pattern: [0, 3, 4, 5] },
    { name: 'IV–I–V–I',         pattern: [3, 0, 4, 0] },
    { name: 'IV–V–I–V',         pattern: [3, 4, 0, 4] },
    { name: 'IV–V–vi–IV',       pattern: [3, 4, 5, 3] },
    { name: 'IV–I–ii–V',        pattern: [3, 0, 1, 4] },
    { name: 'IV–vi–ii–V',       pattern: [3, 5, 1, 4] },
    { name: 'V–vi–IV–V',        pattern: [4, 5, 3, 4] },
    { name: 'V–IV–I–V',         pattern: [4, 3, 0, 4] },
    { name: 'V–IV–I–IV',        pattern: [4, 3, 0, 3] },
    { name: 'V–IV–vi–V',        pattern: [4, 3, 5, 4] },
    { name: 'V–ii–I–V',         pattern: [4, 1, 0, 4] },
    { name: 'V–iii–vi–IV',      pattern: [4, 2, 5, 3] },
    { name: 'ii–IV–V–I',        pattern: [1, 3, 4, 0] },
    { name: 'ii–V–I–vi',        pattern: [1, 4, 0, 5] },
    { name: 'ii–V–IV–I',        pattern: [1, 4, 3, 0] },
    { name: 'ii–V–iii–vi',      pattern: [1, 4, 2, 5] },
    { name: 'iii–vi–IV–V',      pattern: [2, 5, 3, 4] },
    { name: 'iii–IV–I–V',       pattern: [2, 3, 0, 4] },
    { name: 'iii–IV–ii–V',      pattern: [2, 3, 1, 4] },
    { name: 'iii–V–vi–IV',      pattern: [2, 4, 5, 3] },

    // 4-chord met herhaling
    { name: 'I–V–I–V',          pattern: [0, 4, 0, 4] },
    { name: 'vi–IV–vi–V',       pattern: [5, 3, 5, 4] },
    { name: 'IV–vi–IV–V',       pattern: [3, 5, 3, 4] },
    { name: 'I–ii–IV–V',        pattern: [0, 1, 3, 4] },
    { name: 'I–V–IV–iii',       pattern: [0, 4, 3, 2] },
    { name: 'I–IV–iii–vi',      pattern: [0, 3, 2, 5] },
    { name: 'vi–V–IV–V',        pattern: [5, 4, 3, 4] },
    { name: 'vi–IV–ii–V',       pattern: [5, 3, 1, 4] },
    { name: 'IV–I–vi–V',        pattern: [3, 0, 5, 4] },
    { name: 'I–vi–ii–V',        pattern: [0, 5, 1, 4] },

    // 3-chord major
    { name: 'I–IV–V',           pattern: [0, 3, 4] },
    { name: 'I–V–IV',           pattern: [0, 4, 3] },
    { name: 'I–ii–V',           pattern: [0, 1, 4] },
    { name: 'I–vi–IV',          pattern: [0, 5, 3] },
    { name: 'I–V–vi',           pattern: [0, 4, 5] },
    { name: 'vi–IV–V',          pattern: [5, 3, 4] },
    { name: 'ii–V–I',           pattern: [1, 4, 0] },
    { name: 'I–iii–IV',         pattern: [0, 2, 3] },
    { name: 'IV–I–V',           pattern: [3, 0, 4] },
    { name: 'V–IV–I',           pattern: [4, 3, 0] },
    { name: 'IV–V–vi',          pattern: [3, 4, 5] },

    // 2-chord grooves major
    { name: 'I–V',              pattern: [0, 4] },
    { name: 'I–vi',             pattern: [0, 5] },
    { name: 'vi–IV',            pattern: [5, 3] },
    { name: 'IV–V',             pattern: [3, 4] },
    { name: 'ii–V',             pattern: [1, 4] },

    // 5- en 6-chord journeys
    { name: 'I–V–vi–IV–I',      pattern: [0, 4, 5, 3, 0] },
    { name: 'I–IV–I–V–vi',      pattern: [0, 3, 0, 4, 5] },
    { name: 'I–V–IV–I–V',       pattern: [0, 4, 3, 0, 4] },
    { name: 'I–ii–IV–V–I',      pattern: [0, 1, 3, 4, 0] },
    { name: 'I–V–vi–IV–ii–V',   pattern: [0, 4, 5, 3, 1, 4] },
    { name: 'I–vi–ii–V–I–V',    pattern: [0, 5, 1, 4, 0, 4] },
    { name: 'I–IV–V–vi–IV–V',   pattern: [0, 3, 4, 5, 3, 4] },
  ];

  // MINOR progressies (gebruikt als selectedMode === 'minor')
  // indices: 0=i, 1=ii°, 2=III, 3=iv, 4=v, 5=VI, 6=VII
  const minorPatterns = [
    { name: 'i–VI–III–VII',     pattern: [0, 5, 2, 6] },
    { name: 'i–VII–VI–VII',     pattern: [0, 6, 5, 6] },
    { name: 'i–VI–VII–VII',     pattern: [0, 5, 6, 6] },
    { name: 'i–VII–III–VI',     pattern: [0, 6, 2, 5] },
    { name: 'i–v–VI–VII',       pattern: [0, 4, 5, 6] },
    { name: 'i–iv–VI–VII',      pattern: [0, 3, 5, 6] },
    { name: 'i–iv–v–VI',        pattern: [0, 3, 4, 5] },
    { name: 'vi–III–VII–i',     pattern: [5, 2, 6, 0] },

    // 3-chord minor
    { name: 'i–VII–VI',         pattern: [0, 6, 5] },
    { name: 'i–iv–v',           pattern: [0, 3, 4] },
    { name: 'i–VI–VII',         pattern: [0, 5, 6] },
    { name: 'i–III–VII',        pattern: [0, 2, 6] },
    { name: 'iv–VI–VII',        pattern: [3, 5, 6] },

    // 2-chord minor grooves
    { name: 'i–VII',            pattern: [0, 6] },
    { name: 'i–VI',             pattern: [0, 5] },
    { name: 'III–VI',           pattern: [2, 5] },
    { name: 'iv–i',             pattern: [3, 0] },
    { name: 'v–VI',             pattern: [4, 5] },

    // iets langere minor journeys
    { name: 'i–VI–III–VII–i',   pattern: [0, 5, 2, 6, 0] },
    { name: 'i–iv–VI–III–VII',  pattern: [0, 3, 5, 2, 6] },
    { name: 'i–VII–VI–iv–i',    pattern: [0, 6, 5, 3, 0] },
    { name: 'i–v–VI–VII–i',     pattern: [0, 4, 5, 6, 0] },
  ];

  const patterns =
    selectedMode === 'minor'
      ? minorPatterns
      : majorPatterns;

  const prog = patterns[Math.floor(Math.random() * patterns.length)];
  const { chords } = createScale(selectedRoot, selectedMode);
  const progChords = prog.pattern.map((i) => chords[i]);

  return {
    chords: progChords,
    name: prog.name,
  };
};

  const refreshScale = () => {
  const { notes: core } = createScale(selectedRoot, selectedMode);

  let seq = [];
  if (core && core.length > 0) {
    const ascend = [...core, core[0]];   // C D E F G A B C
    const descend = [...core].reverse(); // B A G F E D C
    seq = [...ascend, ...descend];       // C D E F G A B C B A G F E D C
  }

  setCurrentScale({
    root: selectedRoot,
    mode: selectedMode,
    notes: seq,
  });
  setScaleNoteIndex(0);
  setPressedNotes(new Set());
  setFeedback(null);
  setScaleStats({ runs: 0, errors: 0 });
  setCardFlash(null);
};

  const newCard = () => {
    setShowNotes(false);
    setShowGuitar(false);
    setFeedback(null);
    setPressedNotes(new Set());
    setCardFlash(null);

    if (mode === 'progression') {
      const prog = getRandomProgression();
      setCurrentProgression(prog);
      setProgressionIndex(0);
      setProgressionResults(Array(prog.chords.length).fill(null));
      setProgressionDone(false);
    } else if (mode === 'scale') {
      refreshScale();
    } else {
      setCurrentChord(getRandomChord());
    }
  };

  const resetGame = () => {
    setGameStats({
      streak: 0,
      bestStreak: 0,
      correct: 0,
      attempts: 0,
    });
    setFeedback(null);
    setPressedNotes(new Set());
    newCard();
  };

  const resetScaleGame = () => {
    refreshScale();
  };

  // init / changes in settings
  useEffect(() => {
    if (mode === 'scale') {
      refreshScale();
    } else {
      newCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, selectedRoot, selectedMode, chordPoolMode]);

  // Enter = nieuwe progression als progressionDone
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && mode === 'progression' && progressionDone) {
        newCard();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, progressionDone, newCard]); // eslint-disable-line react-hooks/exhaustive-deps

  const scaleLabel =
    currentScale && currentScale.mode === 'minor'
      ? `${currentScale.root} mineur`
      : currentScale && currentScale.mode === 'major'
      ? `${currentScale.root} majeur`
      : '';

  const currentScaleNote =
    currentScale && currentScale.notes && currentScale.notes.length > 0
      ? currentScale.notes[scaleNoteIndex]
      : null;

  const selectedKeyLabel =
    selectedMode === 'minor' ? `${selectedRoot} mineur` : `${selectedRoot} majeur`;

  const cardBorderClass =
    cardFlash === 'success'
      ? 'border-green-400 shadow-lg shadow-green-500/40'
      : cardFlash === 'error'
      ? 'border-red-400 shadow-lg shadow-red-500/40'
      : 'border-white/20';

  // ==== RENDER ====
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Akkoorden Leren</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMidiSetup(!showMidiSetup)}
              className={`p-2 rounded-lg transition-colors ${
                midiEnabled ? 'bg-green-500/20 text-green-300' : 'bg-white/10'
              }`}
            >
              <Keyboard className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* MIDI setup */}
        {showMidiSetup && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Keyboard className="w-6 h-6" />
              MIDI Keyboard Setup
            </h2>

            {!midiEnabled ? (
              <div>
                <p className="text-gray-300 mb-4">
                  Sluit je MIDI keyboard aan via USB en klik op de knop hieronder.
                </p>

                {midiError && (
                  <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 mb-4">
                    <p className="text-red-300 text-sm">{midiError}</p>
                  </div>
                )}

                <button
                  onClick={setupMIDI}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transition-all shadow-lg"
                >
                  Activeer MIDI Keyboard
                </button>

                <div className="mt-4 text-sm text-gray-400">
                  <p className="font-semibold mb-2">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Gebruik Chrome, Edge of Opera (Safari ondersteunt geen MIDI)</li>
                    <li>Sluit je keyboard aan voordat je de pagina laadt</li>
                    <li>Geef toestemming in de browser popup</li>
                    <li>Herlaad de pagina als het niet werkt</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-300">
                  <Check className="w-5 h-5" />
                  <span>MIDI keyboard geactiveerd!</span>
                </div>

                {midiDevices.length > 0 && (
                  <div className="bg-blue-500/20 rounded-lg p-3">
                    <div className="text-sm font-semibold mb-2">Aangesloten apparaten:</div>
                    {midiDevices.map((device, i) => (
                      <div key={i} className="text-sm text-gray-300">
                        • {device}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-300">
                  Speel nu akkoorden, progressies of toonladders en krijg direct feedback.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4">Instellingen</h2>

            {/* Mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'single'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Enkel akkoord (spel)
                </button>
                <button
                  onClick={() => setMode('progression')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'progression'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Progressie (spel)
                </button>
                <button
                  onClick={() => setMode('scale')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'scale'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Schaal (noten spel)
                </button>
              </div>
            </div>

            {/* Moeilijkheid */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Moeilijkheidsgraad</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDifficulty('triads')}
                  className={`p-3 rounded-lg transition-all ${
                    difficulty === 'triads'
                      ? 'bg-green-500 shadow-lg shadow-green-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Triads
                </button>
                <button
                  onClick={() => setDifficulty('seventh')}
                  className={`p-3 rounded-lg transition-all ${
                    difficulty === 'seventh'
                      ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  + 7&apos;s (triad ok)
                </button>
                <button
                  onClick={() => setDifficulty('extended')}
                  className={`p-3 rounded-lg transition-all ${
                    difficulty === 'extended'
                      ? 'bg-red-500 shadow-lg shadow-red-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  + Sus/Add9
                </button>
              </div>
            </div>

            {/* Key: root + mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Toonsoort (voor akkoorden, progressies & schalen)
              </label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {allRoots.map((note) => (
                  <button
                    key={note}
                    onClick={() => setSelectedRoot(note)}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      selectedRoot === note
                        ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-1">
                <button
                  onClick={() => setSelectedMode('major')}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedMode === 'major'
                      ? 'bg-indigo-500 shadow-lg shadow-indigo-500/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Majeur
                </button>
                <button
                  onClick={() => setSelectedMode('minor')}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedMode === 'minor'
                      ? 'bg-indigo-500 shadow-lg shadow-indigo-500/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Mineur
                </button>
              </div>
              <p className="text-xs text-gray-400">Huidige key: {selectedKeyLabel}</p>
            </div>

            {/* Akkoorden-pool voor enkel akkoord spel */}
            <div className="mb-2">
              <label className="block text-sm font-medium mb-2">
                Akkoorden bron (enkel akkoord spel)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setChordPoolMode('inKey')}
                  className={`p-3 rounded-lg text-sm transition-all ${
                    chordPoolMode === 'inKey'
                      ? 'bg-teal-500 shadow-lg shadow-teal-500/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Alleen akkoorden in {selectedKeyLabel}
                </button>
                <button
                  onClick={() => setChordPoolMode('all')}
                  className={`p-3 rounded-lg text-sm transition-all ${
                    chordPoolMode === 'all'
                      ? 'bg-teal-500 shadow-lg shadow-teal-500/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Alle keys (random)
                </button>
              </div>
            </div>

            {mode === 'progression' && (
              <p className="mt-3 text-xs text-gray-400">
                In het progressie-spel speel je de akkoorden in deze key in de juiste volgorde.
              </p>
            )}
          </div>
        )}

        {/* Feedback blok */}
        {feedback && midiEnabled && (
          <div
            className={`mb-6 p-6 rounded-2xl border-2 backdrop-blur-lg ${
              feedback.isCorrect
                ? 'bg-green-500/20 border-green-400'
                : 'bg-red-500/20 border-red-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {feedback.isCorrect ? (
                <>
                  <Check className="w-8 h-8 text-green-400" />
                  <h3 className="text-2xl font-bold text-green-300">
                    {mode === 'scale' ? 'Goede noot! 🎉' : 'Correct! 🎉'}
                  </h3>
                </>
              ) : (
                <>
                  <X className="w-8 h-8 text-red-400" />
                  <h3 className="text-2xl font-bold text-red-300">
                    {mode === 'scale' ? 'Niet de juiste toon...' : 'Niet helemaal...'}
                  </h3>
                </>
              )}
            </div>

            {mode !== 'scale' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {feedback.correctNotes.length > 0 && (
                  <div className="bg-green-500/20 rounded-lg p-3">
                    <div className="font-semibold text-green-300 mb-2">✓ Correct:</div>
                    <div className="flex flex-wrap gap-1">
                      {feedback.correctNotes.map((note) => (
                        <span key={note} className="px-2 py-1 bg-green-500/30 rounded">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {feedback.missingNotes.length > 0 && (
                  <div className="bg-yellow-500/20 rounded-lg p-3">
                    <div className="font-semibold text-yellow-300 mb-2">⚠ Ontbreekt:</div>
                    <div className="flex flex-wrap gap-1">
                      {feedback.missingNotes.map((note) => (
                        <span key={note} className="px-2 py-1 bg-yellow-500/30 rounded">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {feedback.wrongNotes.length > 0 && (
                  <div className="bg-red-500/20 rounded-lg p-3">
                    <div className="font-semibold text-red-300 mb-2">✗ Fout:</div>
                    <div className="flex flex-wrap gap-1">
                      {feedback.wrongNotes.map((note) => (
                        <span key={note} className="px-2 py-1 bg-red-500/30 rounded">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hoofdkaart */}
        <div
          className={`bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl mb-6 border transition-colors transition-shadow ${cardBorderClass}`}
        >
          {mode === 'progression' ? (
            <div className="text-center">
              <div className="text-sm text-blue-300 mb-2">{selectedKeyLabel}</div>
              <div className="text-sm text-gray-300 mb-6">{currentProgression.name}</div>
              <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
                {currentProgression.chords?.map((chord, i) => {
                  const status = progressionResults[i];
                  const isCurrent = i === progressionIndex && !progressionDone;

                  let border = 'border-transparent';
                  if (status === 'correct') border = 'border-green-400';
                  else if (status === 'wrong') border = 'border-red-400';
                  else if (isCurrent) border = 'border-blue-400';

                  return (
                    <React.Fragment key={i}>
                      <div
                        className={`text-center px-3 py-2 rounded-2xl border-2 ${border} bg-black/20`}
                      >
                        <div className="text-5xl font-bold mb-1">{chord}</div>
                        <div className="text-xs text-gray-400 mb-1">
                          {getRomanNumeral(chord, selectedRoot, selectedMode)}
                        </div>
                        {status === 'correct' && (
                          <div className="text-green-300 text-xs flex items-center justify-center gap-1">
                            <Check className="w-4 h-4" /> Goed
                          </div>
                        )}
                        {status === 'wrong' && (
                          <div className="text-red-300 text-xs flex items-center justify-center gap-1">
                            <X className="w-4 h-4" /> Fout
                          </div>
                        )}
                        {status == null && isCurrent && (
                          <div className="text-blue-300 text-xs">Nu spelen</div>
                        )}
                      </div>
                      {i < currentProgression.chords.length - 1 && (
                        <ChevronRight className="w-7 h-7 text-gray-400" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {showNotes && (
                <div className="space-y-2 bg-black/20 rounded-xl p-6 mb-4">
                  {currentProgression.chords?.map((chord, i) => (
                    <div key={i} className="text-lg">
                      <span className="font-semibold">{chord}:</span>{' '}
                      {chordNotesOverrides[chord] || (computeTriad(chord) || []).join('–')}
                    </div>
                  ))}
                </div>
              )}

              {showGuitar && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                  {currentProgression.chords?.map((chord, i) => (
                    <div key={i} className="bg-black/20 rounded-xl p-4">
                      <div className="text-2xl font-bold mb-3">{chord}</div>
                      <GuitarDiagram chord={chord} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : mode === 'scale' ? (
            <div className="text-center">
              {scaleLabel && <div className="text-sm text-blue-300 mb-4">Schaal: {scaleLabel}</div>}
              <div className="text-7xl font-bold mb-4">{currentScaleNote || '-'}</div>
              {currentScale && (
                <div className="text-sm text-gray-300 mb-4">
                  Noot {scaleNoteIndex + 1} van {currentScale.notes.length}
                </div>
              )}

              {showNotes && currentScale && (
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {currentScale.notes.map((note, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm ${
                        i === scaleNoteIndex ? 'bg-blue-500/80' : 'bg-black/30'
                      }`}
                    >
                      {note}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm text-blue-300 mb-2">{selectedKeyLabel}</div>
              <div className="text-7xl font-bold mb-8">{currentChord}</div>

              {showNotes && currentChord && (
                <div className="text-2xl bg-black/20 rounded-xl p-6 mb-6">
                  {chordNotesOverrides[currentChord] ||
                    (computeTriad(currentChord) || []).join('–')}
                </div>
              )}

              {showGuitar && currentChord && (
                <div className="bg-black/20 rounded-xl p-6 inline-block">
                  <GuitarDiagram chord={currentChord} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progressie-result info */}
        {mode === 'progression' && progressionDone && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-200">
            <div className="font-semibold mb-2">
              Progressie afgerond — druk op Enter of klik &quot;Nieuwe progressie&quot; om nog een te doen.
            </div>
            <div className="flex flex-wrap gap-2">
              {currentProgression.chords.map((chord, i) => {
                const status = progressionResults[i];
                return (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                      status === 'correct'
                        ? 'bg-green-500/30 text-green-100'
                        : status === 'wrong'
                        ? 'bg-red-500/30 text-red-100'
                        : 'bg-gray-500/20 text-gray-100'
                    }`}
                  >
                    {chord}
                    {status === 'correct' && <Check className="w-3 h-3" />}
                    {status === 'wrong' && <X className="w-3 h-3" />}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Game stats */}
        {mode === 'single' && (
          <div className="mt-2 mb-4 flex flex-wrap justify-center gap-3 text-sm text-gray-200">
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="font-semibold">Streak: </span>
              {gameStats.streak}
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="font-semibold">Beste streak: </span>
              {gameStats.bestStreak}
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="font-semibold">Score: </span>
              {gameStats.correct}/{gameStats.attempts || 0}
            </div>
          </div>
        )}

        {mode === 'scale' && (
          <div className="mt-2 mb-4 flex flex-wrap justify-center gap-3 text-sm text-gray-200">
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="font-semibold">Hele schaal (op & neer) goed gespeeld: </span>
              {scaleStats.runs}
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
              <span className="font-semibold">Fouten: </span>
              {scaleStats.errors}
            </div>
          </div>
        )}

        {/* Onderste knoppen */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm border border-white/20"
          >
            {showNotes ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showNotes ? 'Verberg' : 'Toon'} {mode === 'scale' ? 'schaal' : 'noten'}
          </button>

          {mode !== 'scale' && (
            <button
              onClick={() => setShowGuitar(!showGuitar)}
              className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm border border-white/20"
            >
              <Guitar className="w-5 h-5" />
              {showGuitar ? 'Verberg' : 'Toon'} Gitaar
            </button>
          )}

          <button
            onClick={newCard}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all shadow-lg shadow-blue-500/50"
          >
            <RotateCw className="w-5 h-5" />
            {mode === 'scale'
              ? 'Nieuwe schaal'
              : mode === 'progression'
              ? 'Nieuwe progressie'
              : 'Nieuw akkoord'}
          </button>

          {mode === 'single' && (
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all backdrop-blur-sm border border-red-400/60"
            >
              <X className="w-5 h-5" />
              Reset akkoord-spel
            </button>
          )}

          {mode === 'scale' && (
            <button
              onClick={resetScaleGame}
              className="flex items-center gap-2 px-6 py-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all backdrop-blur-sm border border-red-400/60"
            >
              <X className="w-5 h-5" />
              Reset schaal-spel
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="font-semibold mb-3">💡 Tips voor effectief oefenen:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Speel het akkoord in verschillende inversies</li>
            <li>• Zeg de noten hardop voordat je speelt</li>
            <li>• Begin met triads voordat je 7&apos;s toevoegt</li>
            <li>• Speel toonladders rustig & gelijkmatig (metronoom helpt)</li>
            <li>• Oefen progressies in verschillende keys</li>
            <li>• Let op de fingering bij gitaargrepen (barre vs open)</li>
            {midiEnabled && (
              <li>
                • <span className="text-green-300 font-semibold">MIDI actief:</span> gebruik de spellen voor
                directe feedback!
              </li>
            )}
            <li>• 25 min per dag: 5 min scales, 10 min losse akkoorden, 10 min progressies</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChordLearningApp;
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

const ChordLearningApp = () => {
  const [mode, setMode] = useState('single');
  const [difficulty, setDifficulty] = useState('triads');
  const [selectedKey, setSelectedKey] = useState('C');
  const [currentChord, setCurrentChord] = useState(null);
  const [currentProgression, setCurrentProgression] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [showGuitar, setShowGuitar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  const [showMidiSetup, setShowMidiSetup] = useState(false);
  const [midiError, setMidiError] = useState(null);
  const [midiDevices, setMidiDevices] = useState([]);

  // GAME STATE voor single-chord mode
  const [gameStats, setGameStats] = useState({
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempts: 0,
  });

  const keys = ['C', 'G', 'D', 'A', 'F', 'Am', 'Em', 'Bm', 'F#m', 'Dm'];

  // Diatonische akkoorden (incl. diminished)
  const diatonicChords = {
    C: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    G: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    D: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    A: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    F: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    Am: ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
    Em: ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
    Bm: ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
    'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
    Dm: ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
  };

  const chordNotes = {
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

  const midiNoteToName = (midiNote) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[midiNote % 12];
  };

  const normalizeNote = (note) => {
    const map = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    return map[note] || note;
  };

  const getChordNoteSet = (chord) => {
    if (!chordNotes[chord]) return new Set();
    return new Set(chordNotes[chord].split('–').map((n) => normalizeNote(n.trim())));
  };

  // ===== GAME CHECK =====
  const checkChord = () => {
    if (!currentChord || pressedNotes.size === 0) return;

    const playedNotes = Array.from(pressedNotes).map(midiNoteToName);
    const playedNoteSet = new Set(playedNotes);
    const expectedNoteSet = getChordNoteSet(currentChord);

    const correctNotes = [...playedNoteSet].filter((n) => expectedNoteSet.has(n));
    const missingNotes = [...expectedNoteSet].filter((n) => !playedNoteSet.has(n));
    const wrongNotes = [...playedNoteSet].filter((n) => !expectedNoteSet.has(n));

    const isCorrect =
      missingNotes.length === 0 &&
      wrongNotes.length === 0 &&
      correctNotes.length > 0;

    setFeedback({
      isCorrect,
      correctNotes,
      missingNotes,
      wrongNotes,
      playedNotes: [...playedNoteSet],
    });

    // Alleen game-logica in single mode
    if (mode === 'single') {
      setGameStats((prev) => {
        const attempts = prev.attempts + 1;
        const correct = prev.correct + (isCorrect ? 1 : 0);
        const streak = isCorrect ? prev.streak + 1 : 0;
        const bestStreak = Math.max(prev.bestStreak, streak);
        return { attempts, correct, streak, bestStreak };
      });

      // Kleine delay zodat je de feedback ziet, dan nieuw akkoord
      if (midiEnabled) {
        setTimeout(() => {
          newCard();
        }, 800);
      }
    }
  };

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
        setMidiError(
          'Geen MIDI keyboard gevonden. Zorg dat het is aangesloten en probeer de pagina opnieuw te laden.'
        );
        return;
      }

      setMidiDevices(inputs.map((input) => input.name || 'Unknown device'));
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
      // Note on
      setPressedNotes((prev) => {
        const newSet = new Set(prev);
        newSet.add(note);
        return newSet;
      });
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      // Note off
      setPressedNotes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }
  };

  // WACHT EVEN MET CHECKEN → ~0.7s nadat noten "stabiel" zijn
  useEffect(() => {
    if (!midiEnabled) return;
    if (!currentChord) return;
    if (pressedNotes.size === 0) return;

    const timer = setTimeout(() => {
      checkChord();
    }, 200); // 0,2 seconde voelt lekker natuurlijk

    return () => clearTimeout(timer);
  }, [pressedNotes, currentChord, midiEnabled]);

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

  const seventhChords = [
    'Cmaj7',
    'Fmaj7',
    'Gmaj7',
    'Dmaj7',
    'Amaj7',
    'Am7',
    'Dm7',
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

  const progressions = [
    { name: 'I–V–vi–IV', pattern: [0, 4, 5, 3] },
    { name: 'vi–IV–I–V', pattern: [5, 3, 0, 4] },
    { name: 'I–vi–IV–V', pattern: [0, 5, 3, 4] },
    { name: 'ii–V–I', pattern: [1, 4, 0] },
    { name: 'I–IV–V', pattern: [0, 3, 4] },
  ];

  const getRomanNumeral = (chord, key) => {
    const chords = diatonicChords[key];
    const index = chords.indexOf(chord);
    const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    return index !== -1 ? numerals[index] : '';
  };

  const getRandomChord = () => {
    let availableChords = [];

    if (mode === 'key') {
      availableChords = [...diatonicChords[selectedKey]];
    } else {
      Object.values(diatonicChords).forEach((chords) => {
        availableChords.push(...chords);
      });
    }

    if (difficulty === 'seventh' || difficulty === 'extended') {
      availableChords.push(...seventhChords);
    }

    if (difficulty === 'extended') {
      availableChords.push(...extendedChords);
    }

    // Alle unieke akkoorden, incl. diminished (NIET meer filteren op gitaarshape)
    availableChords = [...new Set(availableChords)];

    return availableChords[Math.floor(Math.random() * availableChords.length)];
  };

  const getRandomProgression = () => {
    const prog = progressions[Math.floor(Math.random() * progressions.length)];
    const keyChords = diatonicChords[selectedKey];
    const chords = prog.pattern.map((i) => keyChords[i]);

    return {
      chords,
      name: prog.name,
      key: selectedKey,
    };
  };

  const newCard = () => {
    setShowNotes(false);
    setShowGuitar(false);
    setFeedback(null);
    setPressedNotes(new Set());

    if (mode === 'progression') {
      setCurrentProgression(getRandomProgression());
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

  useEffect(() => {
    newCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, selectedKey]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
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

        {showMidiSetup && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Keyboard className="w-6 h-6" />
              MIDI Keyboard Setup
            </h2>

            {!midiEnabled ? (
              <div>
                <p className="text-gray-300 mb-4">Sluit je MIDI keyboard aan via USB en klik op de knop hieronder.</p>

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
                  Speel nu akkoorden op je keyboard en krijg direct feedback. Open de browser console (F12) om MIDI
                  berichten te zien.
                </p>

                {pressedNotes.size > 0 && (
                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Je speelt nu:</div>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(pressedNotes).map((note) => (
                        <span key={note} className="px-3 py-1 bg-blue-500/30 rounded-lg text-sm font-mono">
                          {midiNoteToName(note)} (#{note})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4">Instellingen</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'single' ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Enkel Akkoord (spel)
                </button>
                <button
                  onClick={() => setMode('progression')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'progression'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Progressie
                </button>
                <button
                  onClick={() => setMode('key')}
                  className={`p-3 rounded-lg transition-all ${
                    mode === 'key' ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Per Toonsoort
                </button>
              </div>
            </div>

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
                  + 7's
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

            {(mode === 'key' || mode === 'progression') && (
              <div>
                <label className="block text-sm font-medium mb-2">Toonsoort</label>
                <div className="grid grid-cols-5 gap-2">
                  {keys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`p-2 rounded-lg transition-all ${
                        selectedKey === key
                          ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {feedback && midiEnabled && mode === 'single' && (
          <div
            className={`mb-6 p-6 rounded-2xl border-2 backdrop-blur-lg ${
              feedback.isCorrect ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {feedback.isCorrect ? (
                <>
                  <Check className="w-8 h-8 text-green-400" />
                  <h3 className="text-2xl font-bold text-green-300">Correct! 🎉</h3>
                </>
              ) : (
                <>
                  <X className="w-8 h-8 text-red-400" />
                  <h3 className="text-2xl font-bold text-red-300">Niet helemaal...</h3>
                </>
              )}
            </div>

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
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl mb-6">
          {mode === 'progression' ? (
            <div className="text-center">
              <div className="text-sm text-blue-300 mb-2">{currentProgression.key} majeur</div>
              <div className="text-sm text-gray-300 mb-6">{currentProgression.name}</div>
              <div className="flex justify-center items-center gap-4 mb-8 flex-wrap">
                {currentProgression.chords?.map((chord, i) => (
                  <React.Fragment key={i}>
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2">{chord}</div>
                      <div className="text-sm text-gray-400">
                        {getRomanNumeral(chord, currentProgression.key)}
                      </div>
                    </div>
                    {i < currentProgression.chords.length - 1 && (
                      <ChevronRight className="w-8 h-8 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {showNotes && (
                <div className="space-y-2 bg-black/20 rounded-xl p-6 mb-4">
                  {currentProgression.chords?.map((chord, i) => (
                    <div key={i} className="text-lg">
                      <span className="font-semibold">{chord}:</span> {chordNotes[chord]}
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
          ) : (
            <div className="text-center">
              {mode === 'key' && (
                <div className="text-sm text-blue-300 mb-2">Toonsoort: {selectedKey}</div>
              )}
              <div className="text-7xl font-bold mb-8">{currentChord}</div>

              {mode === 'key' && currentChord && (
                <div className="text-xl text-gray-300 mb-8">
                  {getRomanNumeral(currentChord, selectedKey)}
                </div>
              )}

              {showNotes && currentChord && (
                <div className="text-2xl bg-black/20 rounded-xl p-6 mb-6">
                  {chordNotes[currentChord]}
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

        {mode === 'single' && (
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-gray-200 mb-4">
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

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg:white/20 rounded-xl transition-all backdrop-blur-sm border border-white/20"
          >
            {showNotes ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showNotes ? 'Verberg' : 'Toon'} Noten
          </button>

          <button
            onClick={() => setShowGuitar(!showGuitar)}
            className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm border border-white/20"
          >
            <Guitar className="w-5 h-5" />
            {showGuitar ? 'Verberg' : 'Toon'} Gitaar
          </button>

          <button
            onClick={newCard}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all shadow-lg shadow-blue-500/50"
          >
            <RotateCw className="w-5 h-5" />
            Nieuw Akkoord
          </button>

          {mode === 'single' && (
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all backdrop-blur-sm border border-red-400/60"
            >
              <X className="w-5 h-5" />
              Reset spel
            </button>
          )}
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="font-semibold mb-3">💡 Tips voor effectief oefenen:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Speel het akkoord in verschillende inversies</li>
            <li>• Zeg de noten hardop voordat je speelt</li>
            <li>• Begin met triads voordat je 7&apos;s toevoegt</li>
            <li>• Oefen progressies in verschillende keys</li>
            <li>• Let op de fingering bij gitaargrepen (barre vs open)</li>
            {midiEnabled && (
              <li>
                • <span className="text-green-300 font-semibold">MIDI actief:</span> Speel akkoorden en krijg direct
                feedback!
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
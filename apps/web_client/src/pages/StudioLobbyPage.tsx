import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  Sparkle,
  Gear,
  ArrowLeft,
  Users,
  Copy,
  Check,
  Desktop,
  Waveform,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const StudioLobbyPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    isDark,
    currentUser,
    guestName,
    setGuestName,
    courses,
    liveRooms,
    setActiveRoomCode,
    prejoinCam,
    setPrejoinCam,
    prejoinMic,
    setPrejoinMic,
    prejoinBlur,
    setPrejoinBlur,
  } = useApp();

  const code = roomCode || 'csc401-algo';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Match course or live room metadata
  const matchedCourse = courses.find(
    (c) =>
      c.liveRoomCode.toLowerCase() === code.toLowerCase() ||
      c.id.toLowerCase() === code.toLowerCase()
  );

  const matchedLiveRoom = liveRooms.find(
    (r) => r.id.toLowerCase() === code.toLowerCase()
  );

  const meetingTitle =
    matchedCourse?.title ||
    matchedLiveRoom?.title ||
    `Studio: ${code}`;

  const hostName =
    matchedCourse?.lecturerName ||
    matchedLiveRoom?.lecturerName ||
    'Chalk Lecturer';

  // Request local camera and microphone stream for preview
  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animId: number | null = null;

    const initMedia = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: prejoinCam ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined } : false,
          audio: prejoinMic ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined } : false,
        });

        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        localStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        // Setup microphone volume level meter
        if (prejoinMic && s.getAudioTracks().length > 0) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContext = new AudioCtx();
          const source = audioContext.createMediaStreamSource(s);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animId = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }
      } catch (err) {
        console.warn('[Studio Lobby] Media preview initialization:', err);
      }
    };

    initMedia();

    // Enumerate devices
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        if (!active) return;
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      });
    }

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) audioContext.close().catch(() => { });
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [prejoinCam, prejoinMic, selectedAudioDevice, selectedVideoDevice]);

  // Keyboard shortcuts (Ctrl+D for mic, Ctrl+E for camera)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setPrejoinMic(!prejoinMic);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setPrejoinCam(!prejoinCam);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prejoinCam, prejoinMic, setPrejoinCam, setPrejoinMic]);

  const handleJoinNow = () => {
    setActiveRoomCode(code);
    navigate(`/studio/${encodeURIComponent(code)}`);
  };

  const handlePresentDirectly = () => {
    setActiveRoomCode(code);
    navigate(`/studio/${encodeURIComponent(code)}?present=1`);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/studio/${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Top Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-black/10 dark:border-white/10 shrink-0">
        <Link to="/hub" className="flex items-center gap-2">
          <ArrowLeft size={18} />
          <span className="font-display font-medium text-base">Chalkboard Studio</span>
        </Link>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          title="Audio & Video Settings"
        >
          <Gear size={20} />
        </button>
      </header>

      {/* Main Green Room Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-12 flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Left: Camera Video Feed & Hardware Controls */}
        <div className="w-full lg:w-3/5 space-y-4">
          <div
            className={`relative aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border flex items-center justify-center ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#202124] border-gray-700'
              }`}
          >
            {prejoinCam ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${prejoinBlur === 'slight'
                  ? 'blur-xs'
                  : prejoinBlur === 'strong'
                    ? 'blur-md'
                    : ''
                  }`}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/80">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-mono font-medium">
                  {currentUser?.avatarTag || 'YOU'}
                </div>
                <span className="text-xs font-medium">Camera is off</span>
              </div>
            )}

            {/* Bottom In-Video Control Dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15">
              <button
                type="button"
                onClick={() => setPrejoinMic(!prejoinMic)}
                title={prejoinMic ? 'Turn off microphone (Ctrl+D)' : 'Turn on microphone (Ctrl+D)'}
                className={`p-3 rounded-full transition-transform active:scale-95 cursor-pointer ${prejoinMic ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500 hover:bg-red-600'
                  }`}
              >
                {prejoinMic ? <Microphone size={18} /> : <MicrophoneSlash size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setPrejoinCam(!prejoinCam)}
                title={prejoinCam ? 'Turn off camera (Ctrl+E)' : 'Turn on camera (Ctrl+E)'}
                className={`p-3 rounded-full transition-transform active:scale-95 cursor-pointer ${prejoinCam ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500 hover:bg-red-600'
                  }`}
              >
                {prejoinCam ? <VideoCamera size={18} /> : <VideoCameraSlash size={18} />}
              </button>

              {/* Visual Effects / Blur selector */}
              <div className="relative group">
                <button
                  type="button"
                  title="Apply visual effects & blur"
                  className={`p-3 rounded-full hover:bg-white/20 cursor-pointer ${prejoinBlur !== 'off' ? 'bg-[#69DB7C]/30 text-[#69DB7C]' : ''
                    }`}
                >
                  <Sparkle size={18} />
                </button>
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-1 p-2 rounded-2xl bg-black/90 text-white text-[11px] whitespace-nowrap shadow-xl border border-white/15">
                  <button
                    onClick={() => setPrejoinBlur('off')}
                    className={`px-3 py-1.5 rounded-lg text-left ${prejoinBlur === 'off' ? 'bg-white/20' : ''}`}
                  >
                    No background effect
                  </button>
                  <button
                    onClick={() => setPrejoinBlur('slight')}
                    className={`px-3 py-1.5 rounded-lg text-left ${prejoinBlur === 'slight' ? 'bg-white/20' : ''}`}
                  >
                    Slight blur
                  </button>
                  <button
                    onClick={() => setPrejoinBlur('strong')}
                    className={`px-3 py-1.5 rounded-lg text-left ${prejoinBlur === 'strong' ? 'bg-white/20' : ''}`}
                  >
                    Strong blur
                  </button>
                </div>
              </div>
            </div>

            {/* Mic Level Visualizer Pill (Top-Right inside video) */}
            {prejoinMic && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-mono backdrop-blur-md">
                <Waveform size={14} className="text-emerald-400" />
                <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-center opacity-60">
            Use <kbd className="px-1.5 py-0.5 rounded border">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border">D</kbd> to mute and <kbd className="px-1.5 py-0.5 rounded border">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border">E</kbd> for video
          </p>
        </div>

        {/* Right: Studio Info, Attendees, Join Actions */}
        <div className="w-full lg:w-2/5 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-mono font-medium text-[#059669] dark:text-[#69DB7C]">
              Ready to join?
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight">
              {meetingTitle}
            </h2>
            <p className="text-xs font-mono opacity-60">
              Host: {hostName} • Code: {code}
            </p>
          </div>

          {/* Attendee Presence Info */}
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div>
              <div className="font-medium">
                {matchedLiveRoom && matchedLiveRoom.participantCount > 0
                  ? `${matchedLiveRoom.participantCount} participant(s) in this call`
                  : 'No one else is in this room yet'}
              </div>
              <div className="text-[11px] opacity-60">
                You will be joining as {currentUser?.name || guestName || 'Campus User'}
              </div>
            </div>
          </div>

          {/* Guest Name Input if not signed in */}
          {!currentUser && (
            <div className="space-y-1 text-xs">
              <label className="block opacity-70">Your Display Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                  }`}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleJoinNow}
              className="w-full py-3.5 px-6 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-medium text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <VideoCamera size={18} />
              <span>Join now</span>
            </button>

            <button
              onClick={handlePresentDirectly}
              className={`w-full py-3.5 px-6 rounded-full border font-medium text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${isDark
                ? 'border-[#3C4043] hover:bg-white/5 text-[#E3E3E3]'
                : 'border-[#DADCE0] hover:bg-black/5 text-[#202124]'
                }`}
            >
              <Desktop size={18} />
              <span>Present screen directly</span>
            </button>
          </div>

          {/* Share Studio Link */}
          <div className="pt-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 text-xs font-mono text-[#059669] dark:text-[#69DB7C] hover:underline cursor-pointer"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied joining link!' : 'Copy joining information'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${isDark ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]' : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm">Audio & Video Devices</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 opacity-70">Microphone Input</label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <option value="">Default Microphone</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 opacity-70">Camera Video</label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <option value="">Default Camera</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioLobbyPage;


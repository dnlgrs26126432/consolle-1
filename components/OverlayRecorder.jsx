import { useState, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// Stessi token visivi di Consolle 1
const COLORS = {
  bg: "#0A0A0D",
  lime: "#C9F31D",
  limeDim: "#8FA815",
  border: "#2A2A2E",
  textDim: "#8A8A8F",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * OverlayRecorder
 * Flusso: registra voce/effetti in sincrono con la traccia base già
 * generata -> mix semplice locale (nessuna AI, costo zero, obbligatorio
 * prima del passo successivo) -> rifinitura opzionale via kie.ai
 * (upload-cover) che parte dal mix, non dalla registrazione isolata,
 * così l'AI preserva la performance reale invece di ignorarla.
 *
 * Props:
 *  - audioVersionId: id della audio_versions da sovrapporre
 *  - songId: id del brano
 *  - baseAudioUrl: url della traccia base già generata
 */
export default function OverlayRecorder({ audioVersionId, songId, baseAudioUrl }) {
  const [status, setStatus] = useState("idle"); // idle | recording | recorded | mixing | mixed | regenerating | done | error
  const [overlayId, setOverlayId] = useState(null);
  const [mixedUrl, setMixedUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const basePlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current = recorder;

    // Fai partire la base insieme alla registrazione, così l'utente
    // canta/parla in sincrono con quello che sente
    if (basePlayerRef.current) {
      basePlayerRef.current.currentTime = 0;
      await basePlayerRef.current.play();
    }

    recorder.start();
    setStatus("recording");
  }, []);

  const stopRecording = useCallback(async () => {
    mediaRecorderRef.current?.stop();
    basePlayerRef.current?.pause();

    // Aspetta che l'ultimo chunk arrivi
    await new Promise((resolve) => setTimeout(resolve, 300));

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fileName = `overlays/${songId}/${audioVersionId}-${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("audio-overlays")
      .upload(fileName, blob, { contentType: "audio/webm" });

    if (uploadError) {
      setErrorMsg("Errore upload registrazione: " + uploadError.message);
      setStatus("error");
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("audio-overlays")
      .getPublicUrl(fileName);

    const { data: overlayRow, error: insertError } = await supabase
      .from("audio_overlays")
      .insert({
        audio_version_id: audioVersionId,
        song_id: songId,
        overlay_type: "voice",
        raw_audio_url: publicUrl.publicUrl,
      })
      .select()
      .single();

    if (insertError) {
      setErrorMsg("Errore salvataggio overlay: " + insertError.message);
      setStatus("error");
      return;
    }

    setOverlayId(overlayRow.id);
    setStatus("recorded");
  }, [audioVersionId, songId]);

  // --- Opzione A: mix semplice, nessuna chiamata AI, costo zero ---
  const mixSimple = useCallback(async () => {
    setStatus("mixing");
    setErrorMsg(null);

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const [baseBuf, overlayBuf] = await Promise.all(
        [baseAudioUrl, (await supabase
          .from("audio_overlays")
          .select("raw_audio_url")
          .eq("id", overlayId)
          .single()).data.raw_audio_url].map(async (url) => {
          const res = await fetch(url);
          const arrayBuf = await res.arrayBuffer();
          return audioCtx.decodeAudioData(arrayBuf);
        })
      );

      const duration = Math.max(baseBuf.duration, overlayBuf.duration);
      const offlineCtx = new OfflineAudioContext(2, audioCtx.sampleRate * duration, audioCtx.sampleRate);

      const baseSource = offlineCtx.createBufferSource();
      baseSource.buffer = baseBuf;
      baseSource.connect(offlineCtx.destination);
      baseSource.start(0);

      const overlaySource = offlineCtx.createBufferSource();
      overlaySource.buffer = overlayBuf;
      overlaySource.connect(offlineCtx.destination);
      overlaySource.start(0);

      const mixedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(mixedBuffer);

      const fileName = `overlays/${songId}/${overlayId}-mixed.wav`;
      await supabase.storage.from("audio-overlays").upload(fileName, wavBlob, {
        contentType: "audio/wav",
        upsert: true,
      });
      const { data: publicUrl } = supabase.storage.from("audio-overlays").getPublicUrl(fileName);

      await supabase
        .from("audio_overlays")
        .update({ mixed_audio_url: publicUrl.publicUrl })
        .eq("id", overlayId);

      // Il mix è già un risultato finale utilizzabile: la rifinitura AI
      // (sotto) è un passo opzionale successivo, non un'alternativa.
      setMixedUrl(publicUrl.publicUrl);
      setStatus("mixed");
    } catch (err) {
      setErrorMsg("Errore mix: " + err.message);
      setStatus("error");
    }
  }, [baseAudioUrl, overlayId, songId]);

  // --- Opzione B: rifinitura AI del mix già fatto (upload-cover di kie.ai) ---
  // "add_vocals" resta disponibile come parametro per generare voce AI ex
  // novo, ma non è più il default: qui si parte sempre dal mix esistente,
  // non da una voce sintetica scollegata dalla performance registrata.
  const regenerateWithAI = useCallback(
    async (mode = "cover") => {
      setStatus("regenerating");
      setErrorMsg(null);

      try {
        const res = await fetch("/api/audio/regenerate-overlay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overlayId, mode }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const { taskId } = await res.json();
        await pollRegeneration(overlayId, taskId);
      } catch (err) {
        setErrorMsg("Errore rigenerazione: " + err.message);
        setStatus("error");
      }
    },
    [overlayId]
  );

  const pollRegeneration = useCallback(async (id, taskId) => {
    const maxAttempts = 40; // ~ 2 minuti a 3s di intervallo
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const { data } = await supabase
        .from("audio_overlays")
        .select("regeneration_status, regenerated_audio_url, regeneration_error")
        .eq("id", id)
        .single();

      if (data?.regeneration_status === "completed") {
        setResultUrl(data.regenerated_audio_url);
        setStatus("done");
        return;
      }
      if (data?.regeneration_status === "failed") {
        setErrorMsg(data.regeneration_error || "Rigenerazione fallita");
        setStatus("error");
        return;
      }
    }
    setErrorMsg("Timeout: la rigenerazione sta impiegando più del previsto, controlla tra poco");
    setStatus("error");
  }, []);

  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 20,
        fontFamily: "'JetBrains Mono', monospace",
        color: "#EAEAEA",
        maxWidth: 480,
      }}
    >
      <h3 style={{ color: COLORS.lime, fontSize: 14, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>
        Overlay recorder
      </h3>

      <audio ref={basePlayerRef} src={baseAudioUrl} style={{ display: "none" }} />

      {status === "idle" && (
        <button onClick={startRecording} style={buttonStyle(COLORS.lime, COLORS.bg)}>
          ● Registra sopra la base
        </button>
      )}

      {status === "recording" && (
        <button onClick={stopRecording} style={buttonStyle("#FF4444", "#FFFFFF")}>
          ■ Stop registrazione
        </button>
      )}

      {status === "recorded" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: COLORS.textDim, fontSize: 12 }}>
            Registrazione salvata.
          </p>
          <button onClick={mixSimple} style={buttonStyle(COLORS.limeDim, COLORS.bg)}>
            Mix semplice (istantaneo, nessun costo AI)
          </button>
        </div>
      )}

      {(status === "mixing" || status === "regenerating") && (
        <p style={{ color: COLORS.lime, fontSize: 12 }}>
          {status === "mixing" ? "Mixaggio in corso…" : "Rifinitura AI in corso, può richiedere un minuto…"}
        </p>
      )}

      {status === "mixed" && mixedUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: COLORS.lime, fontSize: 12 }}>Mix pronto:</p>
          <audio controls src={mixedUrl} style={{ width: "100%" }} />
          <p style={{ color: COLORS.textDim, fontSize: 12 }}>
            Puoi tenere questo mix così com'è, oppure rifinirlo con l'AI mantenendo la tua performance:
          </p>
          <button onClick={() => regenerateWithAI("cover")} style={buttonStyle(COLORS.lime, COLORS.bg)}>
            Rifinisci con AI (kie.ai)
          </button>
        </div>
      )}

      {status === "done" && resultUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ color: COLORS.lime, fontSize: 12 }}>Pronto:</p>
          <audio controls src={resultUrl} style={{ width: "100%" }} />
        </div>
      )}

      {status === "error" && (
        <p style={{ color: "#FF6B6B", fontSize: 12 }}>{errorMsg}</p>
      )}
    </div>
  );
}

function buttonStyle(bg, color) {
  return {
    background: bg,
    color,
    border: "none",
    borderRadius: 6,
    padding: "10px 16px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    cursor: "pointer",
    textTransform: "uppercase",
  };
}

// Utility minimale per convertire un AudioBuffer in WAV Blob
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2 + 44;
  const arrBuffer = new ArrayBuffer(length);
  const view = new DataView(arrBuffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length - 44, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrBuffer], { type: "audio/wav" });
}

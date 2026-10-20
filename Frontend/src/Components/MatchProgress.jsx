import { useEffect, useState } from "react";

function formatResetTime(value) {
  if (!value) return "after YouTube's daily quota resets";
  // The backend sends a reset timestamp; display that instant in the user's Nairobi time.
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default function MatchProgress({ playlist, job, onStart, onResume }) {
  const [now, setNow] = useState(Date.now());
  // A saved job only belongs in this box when its playlist ID matches the imported playlist.
  const isCurrentJob = Boolean(job && playlist && job.playlistId === playlist.id);
  const anotherJobIsRunning = Boolean(job?.isRunning && !isCurrentJob);
  const total = isCurrentJob ? job.tracks.length : 0;
  const completed = isCurrentJob ? job.completed : 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const canResume = isCurrentJob && job.paused && (!job.resetAt || now >= new Date(job.resetAt).getTime());

  useEffect(() => {
    if (!isCurrentJob || !job.paused || !job.resetAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isCurrentJob, job?.paused, job?.resetAt]);

  if (!playlist) return null;

  // Keep the activity list short; the newest completed track appears at the bottom.
  const recentRows = (job?.results ?? []).slice(-5).map((result, index, rows) => ({
    result,
    number: Math.max(0, completed - rows.length) + index + 1,
  }));

  return (
    <section className="match-progress-box" aria-live="polite" aria-label="YouTube matching progress">
      <div className="match-progress-heading">
        <div>
          <p className="eyebrow">YOUTUBE MATCHING</p>
          <h2>{anotherJobIsRunning ? "Another match is running" : !isCurrentJob ? "Ready to match tracks" : job.finished ? "Matching complete" : job.paused ? "Matching paused" : job.isRunning ? "Matching…" : "Matching paused"}</h2>
        </div>
        {isCurrentJob && <span className="match-progress-count">{completed}/{total}</span>}
      </div>

      <div
        className="match-progress-track"
        role="progressbar"
        aria-label="Track matching progress"
        aria-valuemin="0"
        aria-valuemax={total || 1}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${total} tracks matched`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      {!isCurrentJob && <p className="match-progress-message">Search and compare each Spotify track one at a time.</p>}

      {isCurrentJob && (job.isRunning || job.paused || (!job.finished && completed > 0)) && (
        <div className="match-activity" aria-label="Recent matching activity">
          {recentRows.length === 0 ? (
            <p className="match-activity-empty">Matching…</p>
          ) : recentRows.map(({ result, number }, index) => {
            // Temporary debugging helper: log the candidates for the 131st playlist track.
            if (result.trackIndex === 130) {
              console.log("Candidates for song 131:", result.candidates);
            }
            const status = !result.bestMatch
              ? { icon: "×", label: "Not found", className: "unmatched" }
              : result.confidence >= 0.8
                ? { icon: "✓", label: "Matched", className: "matched" }
                : result.confidence >= 0.4
                  ? { icon: "⚠", label: "Low confidence", className: "low" }
                  : { icon: "×", label: "Not found", className: "unmatched" };
            const distance = recentRows.length - index - 1;
            return (
              <div
                className={`match-activity-row ${status.className}`}
                key={`${result.trackId}-${result.trackIndex ?? number}`}
                style={{ opacity: Math.max(0.22, 1 - distance * 0.18) }}
              >
                <span>{number}/{total}</span>
                <span>{status.icon} {status.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {isCurrentJob && job.finished && (
        <dl className="match-summary">
          <div><dt>Total</dt><dd>{total}</dd></div>
          <div><dt>Matched</dt><dd>{job.results.filter((item) => item.bestMatch && item.confidence >= 0.8).length}</dd></div>
          <div><dt>Low confidence</dt><dd>{job.results.filter((item) => item.bestMatch && item.confidence >= 0.4 && item.confidence < 0.8).length}</dd></div>
          <div><dt>Unmatched</dt><dd>{job.results.filter((item) => !item.bestMatch || item.confidence < 0.4).length}</dd></div>
        </dl>
      )}

      {isCurrentJob && job.paused && (
        <div className="match-paused-message">
          <p>YouTube's daily search quota has been reached. You can resume after {formatResetTime(job.resetAt)}.</p>
          <p className="match-reset-hint">YouTube resets this quota at midnight Pacific Time; this time is shown in Nairobi time (EAT). Resume before reset is blocked.</p>
        </div>
      )}

      {isCurrentJob && job.error && !job.paused && <p className="match-error">{job.error}</p>}

      {anotherJobIsRunning && <p className="match-progress-message">Wait for the current playlist to finish before starting another match.</p>}
      {!isCurrentJob && !anotherJobIsRunning && <button className="match-action" type="button" onClick={onStart}>Start matching</button>}
      {isCurrentJob && !job.isRunning && !job.paused && !job.finished && (
        <button className="match-action" type="button" onClick={onStart}>
          {completed ? "Continue matching" : "Start matching"}
        </button>
      )}
      {isCurrentJob && job.paused && (
        <button className="match-action" type="button" onClick={onResume} disabled={!canResume}>
          {canResume ? "Resume matching" : "Resume available after reset"}
        </button>
      )}
    </section>
  );
}

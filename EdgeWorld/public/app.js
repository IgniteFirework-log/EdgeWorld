function setupVideoScrubs() {
  const scenes = document.querySelectorAll("[data-video-scrub]");
  if (scenes.length === 0) {
    return;
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  scenes.forEach((scene) => {
    const video = scene.querySelector("video");
    if (!video) {
      return;
    }

    let duration = 0;
    const scrubSeconds = Number.parseFloat(scene.dataset.scrubSeconds || "");
    const ease = Number.parseFloat(scene.dataset.scrubEase || "0.14");
    const seekThreshold = Number.parseFloat(
      scene.dataset.seekThreshold || "0.045",
    );
    let targetTime = 0;
    let currentTime = 0;
    let frameRequest = 0;

    const updateTarget = () => {
      const rect = scene.getBoundingClientRect();
      const distance = Math.max(scene.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / distance, 0), 1);

      scene.style.setProperty("--scrub-progress", progress.toFixed(4));
      targetTime = duration * progress;
    };

    const renderFrame = () => {
      currentTime += (targetTime - currentTime) * ease;
      if (Math.abs(video.currentTime - currentTime) > seekThreshold) {
        video.currentTime = currentTime;
      }
      frameRequest = window.requestAnimationFrame(renderFrame);
    };

    const prepare = () => {
      const sourceDuration = Math.max(video.duration - 0.05, 0);
      duration =
        Number.isFinite(scrubSeconds) && scrubSeconds > 0
          ? Math.min(sourceDuration, scrubSeconds)
          : sourceDuration;
      video.pause();
      updateTarget();

      if (reduceMotion) {
        video.currentTime = Math.min(duration * 0.72, duration);
        return;
      }

      renderFrame();
    };

    if (video.readyState >= 1) {
      prepare();
    } else {
      video.addEventListener("loadedmetadata", prepare, { once: true });
    }

    if (!reduceMotion) {
      window.addEventListener("scroll", updateTarget, { passive: true });
      window.addEventListener("resize", updateTarget);
    }

    window.addEventListener(
      "pagehide",
      () => window.cancelAnimationFrame(frameRequest),
      { once: true },
    );
  });
}

setupVideoScrubs();

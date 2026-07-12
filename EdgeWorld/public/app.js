const attractions = [
  {
    title: "心理学ミラーハウス",
    tag: "Psychology",
    description:
      "MBTI などの心理学サイトを巡って、自分の思考や性格の傾向を発見する体験アトラクション。",
    href: "psychology.html",
    delay: "0.05s",
  },
  {
    title: "隠されたメッセージ",
    tag: "Crypto",
    description:
      "画像の色の差にメッセージを隠し、埋め込みと抽出を体験する暗号学アトラクション。",
    href: "steganography.html",
    delay: "0.12s",
  },
];

function renderAttractions() {
  const list = document.getElementById("attractionList");
  if (!list) {
    return;
  }

  list.innerHTML = attractions
    .map(
      (item) => `
        <article class="card" style="animation-delay:${item.delay}">
          <span class="badge">${item.tag}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <p class="card-actions"><a class="card-link" href="${item.href}">このアトラクションへ</a></p>
        </article>
      `,
    )
    .join("");
}

function setupRevealAnimation() {
  const targets = document.querySelectorAll(".reveal");
  if (targets.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    },
  );

  targets.forEach((el) => observer.observe(el));
}

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
      currentTime += (targetTime - currentTime) * 0.18;
      if (Math.abs(video.currentTime - currentTime) > 0.015) {
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

renderAttractions();
setupRevealAnimation();
setupVideoScrubs();

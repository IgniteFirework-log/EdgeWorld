const attractions = [
  {
    title: "心理学ミラーハウス",
    tag: "Psychology",
    description:
      "MBTI などの心理学サイトを巡って、自分の思考や性格の傾向を発見する体験アトラクション。",
    href: "psychology.html",
    delay: "0.05s",
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

renderAttractions();
setupRevealAnimation();

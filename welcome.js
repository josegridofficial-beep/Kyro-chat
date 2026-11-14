(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = document.getElementById("dots");
  const progress = document.getElementById("progressFill");
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  const skip = document.getElementById("skipBtn");
  let current = 0;
  let startX = 0;

  if (!slides.length) return;

  function render() {
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === current);
      slide.setAttribute("aria-hidden", index === current ? "false" : "true");
    });

    if (dots) {
      [...dots.children].forEach((dot, index) => {
        dot.classList.toggle("is-active", index === current);
        dot.setAttribute("aria-selected", index === current ? "true" : "false");
      });
    }

    if (progress) {
      progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    }

    if (prev) prev.disabled = current === 0;
    if (next) next.setAttribute("aria-label", current === slides.length - 1 ? "Back to first slide" : "Next slide");
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    render();
  }

  if (dots) {
    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dot.addEventListener("click", () => goTo(index));
      dots.appendChild(dot);
    });
  }

  prev?.addEventListener("click", () => goTo(current - 1));
  next?.addEventListener("click", () => goTo(current + 1));
  skip?.addEventListener("click", () => goTo(slides.length - 1));

  const container = document.getElementById("slides");
  container?.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].screenX;
  }, { passive: true });
  container?.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].screenX - startX;
    if (Math.abs(distance) < 45) return;
    goTo(distance < 0 ? current + 1 : current - 1);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") goTo(current + 1);
    if (event.key === "ArrowLeft") goTo(current - 1);
  });

  render();
})();

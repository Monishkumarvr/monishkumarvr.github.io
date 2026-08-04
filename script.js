(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function syncPressed() {
    toggle.setAttribute("aria-pressed", root.getAttribute("data-theme") === "dark" ? "true" : "false");
  }

  syncPressed();

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    syncPressed();
  });
})();

(function () {
  if (!("IntersectionObserver" in window)) return;

  var professionalPanel = document.getElementById("panel-professional");
  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  var linkById = {};
  navLinks.forEach(function (link) {
    linkById[link.getAttribute("href").slice(1)] = link;
  });

  var sections = Object.keys(linkById)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (!sections.length) return;

  // While the Personal panel is showing, the Professional panel (and its
  // sections) are hidden, so scroll-driven active-state changes here would
  // just fight the tab switcher's own nav state.
  function professionalHidden() {
    return professionalPanel && professionalPanel.hidden;
  }

  function setActive(id) {
    if (professionalHidden()) return;
    navLinks.forEach(function (link) { link.classList.remove("is-active"); });
    if (id && linkById[id]) linkById[id].classList.add("is-active");
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "0px 0px -70% 0px", threshold: 0 }
  );

  sections.forEach(function (section) { observer.observe(section); });

  // The last section can be too short to cross the trigger line above once
  // the page runs out of room to scroll further, so back it with a direct
  // bottom-of-page check.
  var lastId = sections[sections.length - 1].id;
  function checkBottom() {
    if (professionalHidden()) return;
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) setActive(lastId);
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  checkBottom();
})();

(function () {
  var professional = document.getElementById("panel-professional");
  var personal = document.getElementById("panel-personal");
  var personalBtn = document.getElementById("nav-personal");
  if (!professional || !personal || !personalBtn) return;

  var anchorLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  function showPersonal() {
    professional.hidden = true;
    personal.hidden = false;
    personalBtn.classList.add("is-active");
    personalBtn.setAttribute("aria-pressed", "true");
    anchorLinks.forEach(function (link) { link.classList.remove("is-active"); });
  }

  function showProfessional() {
    personal.hidden = true;
    professional.hidden = false;
    personalBtn.classList.remove("is-active");
    personalBtn.setAttribute("aria-pressed", "false");
  }

  personalBtn.addEventListener("click", function () {
    if (personal.hidden) showPersonal();
    else showProfessional();
  });

  anchorLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (!personal.hidden) showProfessional();
    });
  });
})();

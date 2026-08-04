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

  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  var linkById = {};
  navLinks.forEach(function (link) {
    linkById[link.getAttribute("href").slice(1)] = link;
  });

  var sections = Object.keys(linkById)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (!sections.length) return;

  function setActive(id) {
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
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) setActive(lastId);
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  checkBottom();
})();

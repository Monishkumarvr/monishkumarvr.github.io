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

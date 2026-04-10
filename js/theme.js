function initTheme() {
    const toggle = document.getElementById("theme-toggle");

    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.classList.add("light");
    }

    if (!toggle) return;

    toggle.textContent = document.body.classList.contains("light") ? "☾" : "☀";

    toggle.addEventListener("click", () => {
        document.body.classList.toggle("light");

        const isLight = document.body.classList.contains("light");
        localStorage.setItem("theme", isLight ? "light" : "dark");

        toggle.textContent = isLight ? "☾" : "☀";
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
} else {
    initTheme();
}
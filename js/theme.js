const saved = localStorage.getItem("theme");
if (saved === "light") {
    document.documentElement.classList.add("light");
}

function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.textContent = document.documentElement.classList.contains("light") ? "☾" : "☀";

    toggle.addEventListener("click", () => {
        document.documentElement.classList.toggle("light");
        const isLight = document.documentElement.classList.contains("light");
        localStorage.setItem("theme", isLight ? "light" : "dark");
        toggle.textContent = isLight ? "☾" : "☀";
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
} else {
    initTheme();
}
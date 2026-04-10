// Back to top
const backTop = document.getElementById('back-top');
window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
});
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Toggle details for each card
const toggleButtons = document.querySelectorAll('.toggle-details-btn');
toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const details = btn.nextElementSibling;
        if (details.classList.contains('course-details')) {
            const isCollapsed = details.classList.contains('collapsed');
            if (isCollapsed) {
                details.classList.remove('collapsed');
                btn.textContent = '📖 Nascondi dettagli';
            } else {
                details.classList.add('collapsed');
                btn.textContent = '📖 Mostra dettagli';
            }
        }
    });
});

// TOC intelligent expansion: if a section is inside a collapsed details, expand it
const tocLinks = document.querySelectorAll('.toc-list a[href^="#"]');
tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            // Find parent card that contains the target
            const parentCard = targetElement.closest('.r-card');
            if (parentCard) {
                const detailsDiv = parentCard.querySelector('.course-details');
                const toggleBtn = parentCard.querySelector('.toggle-details-btn');
                if (detailsDiv && detailsDiv.classList.contains('collapsed') && toggleBtn) {
                    detailsDiv.classList.remove('collapsed');
                    toggleBtn.textContent = '📖 Nascondi dettagli';
                }
            }
            // Allow the normal scroll to happen
        }
    });
});

// TOC active link on scroll
const sections = [...tocLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            tocLinks.forEach(a => a.classList.remove('active'));
            const active = [...tocLinks].find(a => a.getAttribute('href') === '#' + entry.target.id);
            if (active) active.classList.add('active');
        }
    });
}, { rootMargin: '-20% 0px -70% 0px' });
sections.forEach(s => observer.observe(s));
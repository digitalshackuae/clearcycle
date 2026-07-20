/* ----------------------------------------------------
   Clearcycle IT - PPC Landing Page interactions
   (it-recycling-quote.html only)
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initQuickQuoteForm();
});

/**
 * Fades/slides elements with the .reveal class into view as they enter the viewport.
 * Uses IntersectionObserver as the primary trigger, backed by a scroll/resize
 * bounding-rect check so fast or jump-scrolls (e.g. clicking an anchor CTA)
 * can never leave a section permanently invisible.
 */
function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const revealIfInView = () => {
        targets.forEach(el => {
            if (el.classList.contains('is-visible')) return;
            const rect = el.getBoundingClientRect();
            // Reveal once the element has reached the viewport's lower edge -
            // deliberately not requiring rect.bottom > 0, so elements a fast
            // jump-scroll skips straight past (already fully above the fold)
            // are still revealed instead of staying invisible forever.
            if (rect.top < window.innerHeight * 0.92) {
                el.classList.add('is-visible');
            }
        });
    };

    // Catch anything already in view (e.g. page loaded with a #quote-form hash)
    revealIfInView();
    window.addEventListener('scroll', revealIfInView, { passive: true });
    window.addEventListener('resize', revealIfInView);

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

        targets.forEach(el => observer.observe(el));
    }
}

/**
 * Handles the simplified quote enquiry form submission.
 */
function initQuickQuoteForm() {
    const form = document.getElementById('quick-quote-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        removeStatusMessage(form);

        const payload = {
            name: document.getElementById('qf-name').value.trim(),
            company: document.getElementById('qf-company').value.trim(),
            email: document.getElementById('qf-email').value.trim(),
            phone: document.getElementById('qf-phone').value.trim(),
            postcode: document.getElementById('qf-postcode').value.trim(),
            message: document.getElementById('qf-message').value.trim()
        };

        fetch('/api/quick-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok && data.success) {
                window.location.href = `thank-you.html?org=${encodeURIComponent(payload.company || payload.name)}&source=quote`;
            } else {
                throw new Error(data.error || 'Failed to submit your enquiry');
            }
        })
        .catch(error => {
            console.error('Quick quote submission error:', error);
            showStatusMessage(form, `Sorry, there was an issue submitting your enquiry: ${error.message}. Please try again or call us directly.`, 'error');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    });
}

function showStatusMessage(form, message, type) {
    const status = document.createElement('p');
    status.className = `landing-form-status ${type}`;
    status.textContent = message;
    form.appendChild(status);
}

function removeStatusMessage(form) {
    const existing = form.querySelector('.landing-form-status');
    if (existing) existing.remove();
}

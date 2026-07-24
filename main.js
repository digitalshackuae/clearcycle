/* ----------------------------------------------------
   Clearcycle IT - Mockup-Perfect Interactions
   Designed using UK English & specific branding guides
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Initialise mobile navigation toggle
    initMobileNav();
    
    // Inject and initialise sticky mobile CTA
    initStickyMobileCta();

    // Inject the floating "Call Us" button
    initFloatingCallButton();

    // Let visitors dismiss the booking modal via backdrop click or Escape
    initBookingModalDismissal();

    // Wire up the general enquiry form on contact.html to the backend
    initGeneralEnquiryForm();

    // Wrap button arrows for hover animation
    wrapButtonArrows();
    
    // Set the minimum allowed date to today for the collection request
    const dateInput = document.getElementById('collection-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    // Keyboard activation for role="button" elements (Enter/Space)
    document.querySelectorAll('[role="button"][tabindex]').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });
});

/**
 * Opens the interactive Booking & Eligibility modal
 */
function openBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.add('active');
        calculateEligibility();
    }
}

/**
 * Closes the interactive Booking & Eligibility modal
 */
function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Lets visitors close the booking modal by clicking the dimmed backdrop
 * or pressing Escape, so they're never stuck without an obvious way back
 * to browsing the rest of the site.
 */
function initBookingModalDismissal() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBookingModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeBookingModal();
        }
    });
}

/**
 * Adjusts the counter value for a specific equipment type
 * @param {string} type - The input element ID suffix
 * @param {number} delta - The amount to add or subtract
 */
function adjustCount(type, delta) {
    const input = document.getElementById(`count-${type}`);
    if (!input) return;
    
    let currentValue = parseInt(input.value, 10);
    if (isNaN(currentValue)) currentValue = 0;
    
    let newValue = currentValue + delta;
    if (newValue < 0) newValue = 0;
    
    input.value = newValue;
    calculateEligibility();
}

/**
 * Calculates current WEEE eligibility based on major IT unit inputs
 */
function calculateEligibility() {
    const laptops = parseInt(document.getElementById('count-laptops').value, 10) || 0;
    const desktops = parseInt(document.getElementById('count-desktops').value, 10) || 0;
    const servers = parseInt(document.getElementById('count-servers').value, 10) || 0;
    const monitors = parseInt(document.getElementById('count-monitors').value, 10) || 0;
    const accessories = parseInt(document.getElementById('count-accessories').value, 10) || 0;
    
    // Major units count towards the 10-item minimum threshold
    const totalMajor = laptops + desktops + servers + monitors;
    
    // Update progress bar
    const progressPercent = Math.min((totalMajor / 10) * 100, 100);
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }
    
    // Update progress fraction text
    const fractionLabel = document.getElementById('progress-fraction');
    if (fractionLabel) {
        fractionLabel.textContent = `${totalMajor} / 10 major items`;
    }
    
    // Update status text and alert boxes
    const statusText = document.getElementById('status-text');
    const alertInsufficient = document.getElementById('alert-insufficient');
    const alertEligible = document.getElementById('alert-eligible');
    const formOverlay = document.getElementById('form-lock-overlay');
    
    if (totalMajor >= 10) {
        if (statusText) statusText.textContent = 'Eligible for collection';
        if (alertInsufficient) alertInsufficient.style.display = 'none';
        if (alertEligible) alertEligible.style.display = 'block';
        
        // Unlock booking form
        if (formOverlay) {
            formOverlay.classList.add('hidden');
        }
    } else {
        if (statusText) {
            if (totalMajor === 0) {
                statusText.textContent = 'Enter counts to check eligibility';
            } else {
                statusText.textContent = `${10 - totalMajor} more major items needed`;
            }
        }
        if (alertInsufficient) alertInsufficient.style.display = 'block';
        if (alertEligible) alertEligible.style.display = 'none';
        
        // Lock booking form
        if (formOverlay) {
            formOverlay.classList.remove('hidden');
        }
    }
    
    // Save current calculations to hidden input field in form for submission
    const hiddenInv = document.getElementById('hidden-inventory');
    if (hiddenInv) {
        hiddenInv.value = `Laptops: ${laptops}, Desktops: ${desktops}, Servers: ${servers}, Monitors: ${monitors}, Accessories: ${accessories}`;
    }
}

/**
 * Validates inputs and handles the collection request form submission
 * @param {Event} event - Form submission event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('collection-booking-form');
    if (!form) return;
    
    // Clear previous validations
    const invalidInputs = form.querySelectorAll('.input-invalid');
    invalidInputs.forEach(input => input.classList.remove('input-invalid'));
    clearFormMessage(form);

    // Run html5 validation checks
    if (!form.checkValidity()) {
        let firstInvalid = null;
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (!input.validity.valid) {
                input.classList.add('input-invalid');
                if (!firstInvalid) firstInvalid = input;
            }
        });
        showFormMessage(form, 'Please fill in all required fields before submitting.', 'error');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus({ preventScroll: true });
        }
        return;
    }

    // Form is valid - retrieve fields
    const orgName = document.getElementById('org-name').value;
    const orgType = document.getElementById('org-type').value;
    const contactName = document.getElementById('contact-name').value;
    const contactEmail = document.getElementById('contact-email').value;
    const contactPhone = document.getElementById('contact-phone').value;
    const addressStreet = document.getElementById('address-street').value;
    const addressCity = document.getElementById('address-city').value;
    const addressPostcode = document.getElementById('address-postcode').value;
    const collectionDate = document.getElementById('collection-date').value;
    const collectionTime = document.getElementById('collection-time').value;
    const requireDBS = document.getElementById('require-dbs').checked;
    const requireOnsite = document.getElementById('require-onsite').checked;
    const inventory = document.getElementById('hidden-inventory').value;

    const laptops = parseInt(document.getElementById('count-laptops').value, 10) || 0;
    const desktops = parseInt(document.getElementById('count-desktops').value, 10) || 0;
    const servers = parseInt(document.getElementById('count-servers').value, 10) || 0;
    const monitors = parseInt(document.getElementById('count-monitors').value, 10) || 0;
    const accessories = parseInt(document.getElementById('count-accessories').value, 10) || 0;
    const totalItems = laptops + desktops + servers + monitors + accessories;

    // Get the submit button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Format date nicely (UK format: DD/MM/YYYY)
    let formattedDate = collectionDate;
    try {
        const parts = collectionDate.split('-');
        if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    } catch (e) {
        // Fallback to raw input
    }

    // Submit payload to serverless endpoint
    fetch('/api/submit-booking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            orgName,
            orgType,
            contactName,
            contactEmail,
            contactPhone,
            addressStreet,
            addressCity,
            addressPostcode,
            collectionDate,
            collectionTime,
            requireDBS,
            requireOnsite,
            inventory
        })
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok && data.success) {
            // Close booking modal
            closeBookingModal();
            
            // Redirect to thank-you page for conversion tracking
            window.location.href = `thank-you.html?org=${encodeURIComponent(orgName)}&items=${totalItems}&date=${encodeURIComponent(formattedDate)}`;
        } else {
            throw new Error(data.error || 'Failed to submit request');
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        showFormMessage(form, `Sorry, there was an issue submitting your request: ${error.message}. Please try again or contact us directly on 07538 779927.`, 'error');
    })
    .finally(() => {
        // Restore submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    });
}

/**
 * Shows an inline validation/error message above the form's submit button,
 * replacing the previous browser alert() with a message styled to match
 * the site rather than an OS dialog.
 */
function showFormMessage(form, message, type) {
    clearFormMessage(form);
    const el = document.createElement('div');
    el.className = `form-inline-message form-inline-message-${type}`;
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.insertAdjacentElement('beforebegin', el);
}

function clearFormMessage(form) {
    const existing = form.querySelector('.form-inline-message');
    if (existing) existing.remove();
}

/**
 * Wires up the general enquiry form on contact.html to actually submit to
 * the backend (previously it only faked success and redirected without
 * sending the enquiry anywhere).
 */
function initGeneralEnquiryForm() {
    const form = document.getElementById('general-enquiry-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormMessage(form);

        if (!form.checkValidity()) {
            const inputs = form.querySelectorAll('input, textarea');
            let firstInvalid = null;
            inputs.forEach(input => {
                if (!input.validity.valid) {
                    input.classList.add('input-invalid');
                    if (!firstInvalid) firstInvalid = input;
                } else {
                    input.classList.remove('input-invalid');
                }
            });
            showFormMessage(form, 'Please fill in all required fields before submitting.', 'error');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus({ preventScroll: true });
            }
            return;
        }

        const name = document.getElementById('contact-name-page').value;
        const company = document.getElementById('contact-org-page').value;
        const phone = document.getElementById('contact-phone-page').value;
        const email = document.getElementById('contact-email-page').value;
        const message = document.getElementById('contact-message-page').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        fetch('/api/quick-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, company, phone, email, message })
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok && data.success) {
                window.location.href = `thank-you.html?type=enquiry&name=${encodeURIComponent(name)}&org=${encodeURIComponent(company)}`;
            } else {
                throw new Error(data.error || 'Failed to submit your enquiry');
            }
        })
        .catch(error => {
            console.error('Enquiry submission error:', error);
            showFormMessage(form, `Sorry, there was an issue submitting your enquiry: ${error.message}. Please try again or call us directly on 07538 779927.`, 'error');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    });
}

/**
 * Resets form and counter elements upon closing the confirmation modal
 */
function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Reset calculator inputs
    document.getElementById('count-laptops').value = '0';
    document.getElementById('count-desktops').value = '0';
    document.getElementById('count-servers').value = '0';
    document.getElementById('count-monitors').value = '0';
    document.getElementById('count-accessories').value = '0';
    
    const form = document.getElementById('collection-booking-form');
    if (form) {
        form.reset();
        // Remove validation error classes
        const invalidInputs = form.querySelectorAll('.input-invalid');
        invalidInputs.forEach(input => input.classList.remove('input-invalid'));
    }
    
    // Recalculate and relock form
    calculateEligibility();
}

/**
 * Handles FAQ card expand/collapse interaction
 * @param {HTMLElement} button - Clicked accordion button
 */
function toggleFaqCard(button) {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const answer = button.nextElementSibling;
    const faqItem = button.closest('.faq-card-item');
    const parentContainer = button.closest('.faq-grid-4x2');
    
    // Close all other open FAQ cards in the grid
    if (parentContainer) {
        const otherQuestions = parentContainer.querySelectorAll('.faq-card-question');
        otherQuestions.forEach(otherQ => {
            if (otherQ !== button) {
                otherQ.setAttribute('aria-expanded', 'false');
                const otherAnswer = otherQ.nextElementSibling;
                if (otherAnswer) {
                    otherAnswer.style.maxHeight = null;
                }
            }
        });
    }
    
    // Toggle current card
    if (isExpanded) {
        button.setAttribute('aria-expanded', 'false');
        if (answer) {
            answer.style.maxHeight = null;
        }
    } else {
        button.setAttribute('aria-expanded', 'true');
        if (answer) {
            answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
    }
}

/**
 * Handles mobile navigation menu logic
 */
function initMobileNav() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.nav');
    
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const isOpen = nav.classList.contains('mobile-active');
            
            if (isOpen) {
                nav.classList.remove('mobile-active');
                toggle.setAttribute('aria-expanded', 'false');
            } else {
                nav.classList.add('mobile-active');
                toggle.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Close menu when a navigation item is clicked
                // Dropdown click handler on mobile screens
        const dropdownToggles = nav.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    const parent = toggle.closest('.nav-item-dropdown');
                    const isOpen = parent.classList.contains('mobile-open');
                    
                    // Close other dropdowns
                    nav.querySelectorAll('.nav-item-dropdown').forEach(item => {
                        if (item !== parent) item.classList.remove('mobile-open');
                    });
                    
                    if (!isOpen) {
                        e.preventDefault(); // Stop link navigation to expand accordion
                        parent.classList.add('mobile-open');
                    }
                }
            });
        });

        const navLinks = nav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('mobile-active');
            });
        });
    }
}

/**
 * Injects the sticky mobile CTA bar and monitors scroll depth to show/hide it.
 */
function initStickyMobileCta() {
    // Prevent double injection
    if (document.querySelector('.sticky-mobile-cta')) return;

    const cta = document.createElement('div');
    cta.className = 'sticky-mobile-cta';
    cta.innerHTML = `
        <div class="sticky-cta-content">
            <div class="sticky-cta-text">
                <span class="sticky-cta-title">Clearcycle IT</span>
                <span class="sticky-cta-desc">Call <a href="tel:07538779927" style="color: var(--color-accent); font-weight: 600; text-decoration: underline;">07538 779927</a> or book online</span>
            </div>
            <button onclick="openBookingModal()" class="btn btn-accent btn-sticky-cta">Book Collection</button>
        </div>
    `;
    document.body.appendChild(cta);

    // Scroll listener to toggle active state on mobile
    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) {
            // Show the bar after scrolling past 300px
            if (window.scrollY > 300) {
                cta.classList.add('active');
            } else {
                cta.classList.remove('active');
            }
        }
    });
}

/**
 * Injects the floating "Call Us" button shown on every page. Expands to reveal
 * the phone number on hover (desktop only); collapses to an icon-only tap
 * target on mobile, positioned clear of the sticky mobile CTA bar.
 */
function initFloatingCallButton() {
    // Prevent double injection
    if (document.querySelector('.floating-call-btn')) return;

    const btn = document.createElement('a');
    btn.href = 'tel:+447538779927';
    btn.className = 'floating-call-btn';
    btn.setAttribute('aria-label', 'Call Clearcycle IT now on 07538 779927');
    btn.innerHTML = `
        <span class="floating-call-icon" aria-hidden="true">&#128222;</span>
        <span class="floating-call-text">
            <span class="floating-call-label">Call Us</span>
            <span class="floating-call-number">07538 779927</span>
        </span>
        <span class="floating-call-tooltip" aria-hidden="true">Need help? Call our team today.</span>
    `;
    document.body.appendChild(btn);
}

/**
 * Automatically wraps button arrow characters in a span to enable slide animation.
 */
function wrapButtonArrows() {
    document.querySelectorAll('.btn').forEach(btn => {
        if (btn.classList.contains('btn-sticky-cta')) return;
        
        const content = btn.innerHTML;
        if (content.includes('&rarr;') && !content.includes('class="arrow"')) {
            btn.innerHTML = content.replace(/&rarr;/g, '<span class="arrow">&rarr;</span>');
        } else if (content.includes('→') && !content.includes('class="arrow"')) {
            btn.innerHTML = content.replace(/→/g, '<span class="arrow">&rarr;</span>');
        }
    });
}

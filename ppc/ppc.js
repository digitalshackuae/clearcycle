/* ----------------------------------------------------
   Clearcycle IT - Dedicated PPC Landing Page Logic
   (ppc/it-asset-disposal.html)
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Initialise hero calculator
    ppcUpdateCalculatorUI();

    // Sync if modal inputs change externally
    const modalInputs = ['laptops', 'desktops', 'servers', 'monitors', 'accessories'];
    modalInputs.forEach(type => {
        const el = document.getElementById(`count-${type}`);
        if (el) {
            el.addEventListener('change', () => {
                const ppcEl = document.getElementById(`ppc-count-${type}`);
                if (ppcEl) {
                    ppcEl.textContent = el.value || '0';
                    ppcUpdateCalculatorUI();
                }
            });
        }
    });

    // Sync postcode field
    const ppcPostcode = document.getElementById('ppc-postcode');
    const modalPostcode = document.getElementById('address-postcode');
    if (ppcPostcode && modalPostcode) {
        ppcPostcode.addEventListener('input', () => {
            modalPostcode.value = ppcPostcode.value;
        });
    }
});

/**
 * Adjusts quantity for a specific equipment category in the PPC hero calculator
 * and synchronises with the modal booking calculator.
 */
function ppcAdjust(type, delta) {
    const displayEl = document.getElementById(`ppc-count-${type}`);
    const modalInput = document.getElementById(`count-${type}`);
    
    let currentVal = parseInt(displayEl ? displayEl.textContent : '0', 10) || 0;
    let newVal = Math.max(0, currentVal + delta);
    
    if (displayEl) {
        displayEl.textContent = newVal;
    }
    if (modalInput) {
        modalInput.value = newVal;
    }
    
    // Trigger recalculation and sync
    ppcUpdateCalculatorUI();
    if (typeof calculateEligibility === 'function') {
        calculateEligibility();
    }
}

/**
 * Calculates current major item threshold and updates progress bar and messaging
 */
function ppcUpdateCalculatorUI() {
    const laptops = parseInt(document.getElementById('ppc-count-laptops')?.textContent || '0', 10) || 0;
    const desktops = parseInt(document.getElementById('ppc-count-desktops')?.textContent || '0', 10) || 0;
    const servers = parseInt(document.getElementById('ppc-count-servers')?.textContent || '0', 10) || 0;
    const monitors = parseInt(document.getElementById('ppc-count-monitors')?.textContent || '0', 10) || 0;
    const accessories = parseInt(document.getElementById('ppc-count-accessories')?.textContent || '0', 10) || 0;

    const totalMajor = laptops + desktops + servers + monitors;

    // Progress bar fill & fraction
    const progressPercent = Math.min((totalMajor / 10) * 100, 100);
    const fillEl = document.getElementById('ppc-progress-fill');
    const fractionEl = document.getElementById('ppc-progress-fraction');
    const statusPill = document.getElementById('ppc-status-pill');
    const statusMsg = document.getElementById('ppc-status-msg');

    if (fillEl) {
        fillEl.style.width = `${progressPercent}%`;
        if (totalMajor >= 10) {
            fillEl.classList.add('eligible');
        } else {
            fillEl.classList.remove('eligible');
        }
    }

    if (fractionEl) {
        fractionEl.textContent = `${totalMajor} / 10 major items`;
    }

    if (statusPill && statusMsg) {
        statusPill.className = 'ppc-status-pill';
        if (totalMajor === 0) {
            statusPill.classList.add('status-empty');
            statusMsg.textContent = 'Add your IT assets to check collection eligibility.';
        } else if (totalMajor < 10) {
            statusPill.classList.add('status-partial');
            statusMsg.textContent = `You currently have ${totalMajor} of 10 major IT items required for our standard free collection.`;
        } else {
            statusPill.classList.add('status-eligible');
            statusMsg.textContent = '✓ Your collection qualifies for our standard free collection.';
        }
    }
}

/**
 * Scrolls to or highlights the visible quote calculator
 */
function ppcFocusCalculator() {
    const calcCard = document.getElementById('ppc-calculator');
    if (calcCard) {
        calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstBtn = calcCard.querySelector('.ppc-step-btn');
        if (firstBtn) {
            firstBtn.focus();
        }
    }
}

/**
 * Handles the "Check My Collection" button click on the hero calculator:
 * Preserves counts and postcode, pre-populates modal, and transitions to booking form.
 */
function ppcSubmitCalculator() {
    // 1. Copy postcode if provided
    const ppcPostcode = document.getElementById('ppc-postcode');
    const modalPostcode = document.getElementById('address-postcode');
    if (ppcPostcode && modalPostcode && ppcPostcode.value.trim()) {
        modalPostcode.value = ppcPostcode.value.trim();
    }

    // 2. Ensure modal calculator has latest quantities
    const types = ['laptops', 'desktops', 'servers', 'monitors', 'accessories'];
    types.forEach(t => {
        const ppcVal = document.getElementById(`ppc-count-${t}`)?.textContent || '0';
        const modalInput = document.getElementById(`count-${t}`);
        if (modalInput) {
            modalInput.value = ppcVal;
        }
    });

    if (typeof calculateEligibility === 'function') {
        calculateEligibility();
    }

    // 3. Open modal
    if (typeof openBookingModal === 'function') {
        openBookingModal();

        // If eligible, focus organisation name
        setTimeout(() => {
            const orgInput = document.getElementById('org-name');
            if (orgInput) {
                orgInput.focus();
            }
        }, 200);
    }
}

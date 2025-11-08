const PRICE_INR = 199;
const STORAGE_KEY = 'open-source-unlocked-items';
const catalogIndex = new Map();
const purchasedItems = new Set(readStoredPurchases());
const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

let activeModal = null;
let lastFocusedElement = null;
const fallbackImage = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80';

document.addEventListener('DOMContentLoaded', () => {
    loadCatalogSections();
    attachGlobalEvents();
    updateCurrentYear();
    hydratePurchasesModal();
});

function readStoredPurchases() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (error) {
        console.warn('Failed to read purchases from storage', error);
        return [];
    }
}

function savePurchases() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(purchasedItems)));
    } catch (error) {
        console.warn('Unable to persist purchases', error);
    }
}

async function loadCatalogSections() {
    const sections = document.querySelectorAll('.catalog-section');
    const fetchTasks = Array.from(sections).map(async (section) => {
        const resource = section.getAttribute('data-json');
        if (!resource) return;
        const cardsGrid = section.querySelector('[data-content-slot]');
        try {
            const response = await fetch(resource);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            renderCatalogSection(section, data);
        } catch (error) {
            console.error('Failed to load catalog', error);
            if (cardsGrid) {
                cardsGrid.innerHTML = `<p class="empty-state">Unable to load this catalog section right now. Please refresh or update the JSON endpoint.</p>`;
            }
            const counter = section.querySelector('.catalog-count');
            if (counter) {
                counter.textContent = 'Error';
            }
        }
    });

    await Promise.all(fetchTasks);
}

function renderCatalogSection(section, data) {
    const cardsGrid = section.querySelector('[data-content-slot]');
    const counter = section.querySelector('.catalog-count');
    const titleEl = section.querySelector('.catalog-title');
    const subtitleEl = section.querySelector('.catalog-subtitle');

    if (!Array.isArray(data?.items) || data.items.length === 0) {
        if (cardsGrid) {
            cardsGrid.innerHTML = `<p class="empty-state">No items are configured for this section yet. Add products to the JSON file to populate the catalog.</p>`;
        }
        if (counter) counter.textContent = '0 items';
        return;
    }

    if (data.title && titleEl) titleEl.textContent = data.title;
    if (data.description && subtitleEl) subtitleEl.textContent = data.description;

    cardsGrid.innerHTML = '';

    data.items.forEach((item) => {
        if (!item?.id) return;
        catalogIndex.set(item.id, item);
        const card = buildCatalogCard(item);
        cardsGrid.appendChild(card);
    });

    if (counter) {
        counter.textContent = `${data.items.length} item${data.items.length > 1 ? 's' : ''}`;
    }
}

function buildCatalogCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.itemId = item.id;

    const media = document.createElement('div');
    media.className = 'card-media';
    media.style.setProperty('background-image', `url('${item.thumbnail || fallbackImage}')`);

    if (item.typeLabel) {
        const badge = document.createElement('span');
        badge.className = 'card-badge';
        badge.textContent = item.typeLabel;
        media.appendChild(badge);
    }

    if (item.tag) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = item.tag;
        badge.style.position = 'absolute';
        badge.style.right = '1rem';
        badge.style.top = '1rem';
        media.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h4');
    title.className = 'card-title';
    title.textContent = item.name;

    const description = document.createElement('p');
    description.className = 'card-description';
    description.textContent = item.summary ?? 'Detailed description coming soon. Update the JSON file to tailor this listing.';

    const metaList = document.createElement('div');
    metaList.className = 'card-meta';
    if (item.meta && typeof item.meta === 'object') {
        Object.entries(item.meta).forEach(([key, value]) => {
            if (!value) return;
            const span = document.createElement('span');
            const icon = document.createElement('i');
            icon.className = mapMetaIcon(key);
            const label = document.createElement('span');
            label.textContent = value;
            span.append(icon, label);
            metaList.append(span);
        });
    }

    const highlightList = document.createElement('ul');
    highlightList.className = 'card-list';
    if (Array.isArray(item.highlights) && item.highlights.length) {
        item.highlights.forEach((point) => {
            const li = document.createElement('li');
            const icon = document.createElement('i');
            icon.className = 'fas fa-check';
            const text = document.createElement('span');
            text.textContent = point;
            li.append(icon, text);
            highlightList.append(li);
        });
    }

    body.append(title);
    if (metaList.childElementCount > 0) body.append(metaList);
    body.append(description);
    if (highlightList.childElementCount > 0) body.append(highlightList);

    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const price = document.createElement('div');
    price.className = 'card-price';
    price.innerHTML = `<span>Fixed price</span>${currencyFormatter.format(PRICE_INR)}`;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const buyButton = document.createElement('button');
    buyButton.className = 'btn btn-primary';
    buyButton.type = 'button';
    buyButton.innerHTML = `<i class="fas fa-lock"></i> Pay ₹${PRICE_INR} & unlock`;
    buyButton.addEventListener('click', () => openPaymentFlow(item));

    const downloadLink = document.createElement('a');
    downloadLink.className = 'btn btn-success';
    downloadLink.innerHTML = '<i class="fas fa-cloud-arrow-down"></i> Access download';
    downloadLink.target = '_blank';
    downloadLink.rel = 'noopener';
    downloadLink.href = resolveDownloadLink(item);

    actions.append(buyButton, downloadLink);
    footer.append(price, actions);

    card.append(media, body, footer);

    togglePurchaseState(card, purchasedItems.has(item.id));

    return card;
}

function mapMetaIcon(key) {
    const normalised = key.toLowerCase();
    if (normalised.includes('duration') || normalised.includes('week') || normalised.includes('hour')) return 'fas fa-clock';
    if (normalised.includes('level')) return 'fas fa-signal';
    if (normalised.includes('format')) return 'fas fa-video';
    if (normalised.includes('pages')) return 'fas fa-file-lines';
    if (normalised.includes('updated')) return 'fas fa-arrows-rotate';
    if (normalised.includes('size')) return 'fas fa-database';
    return 'fas fa-circle-info';
}

function resolveDownloadLink(item) {
    if (Array.isArray(item.downloads) && item.downloads.length > 0) {
        return item.downloads[0].url;
    }
    return item.downloadLink || '#';
}

function togglePurchaseState(card, isUnlocked) {
    const buyButton = card.querySelector('button.btn-primary');
    const downloadButton = card.querySelector('a.btn-success');
    if (!buyButton || !downloadButton) return;

    if (isUnlocked) {
        buyButton.innerHTML = '<i class="fas fa-lock-open"></i> Already unlocked';
        buyButton.disabled = true;
        buyButton.setAttribute('aria-disabled', 'true');
        buyButton.classList.remove('btn-primary');
        buyButton.classList.add('btn-secondary');
        downloadButton.hidden = false;
        downloadButton.setAttribute('aria-hidden', 'false');
    } else {
        buyButton.innerHTML = `<i class="fas fa-lock"></i> Pay ₹${PRICE_INR} & unlock`;
        buyButton.disabled = false;
        buyButton.removeAttribute('aria-disabled');
        buyButton.classList.remove('btn-secondary');
        if (!buyButton.classList.contains('btn-primary')) {
            buyButton.classList.add('btn-primary');
        }
        downloadButton.hidden = true;
        downloadButton.setAttribute('aria-hidden', 'true');
    }
}

function openPaymentFlow(item) {
    if (purchasedItems.has(item.id)) {
        updateCatalogCard(item.id);
        hydratePurchasesModal();
        showToast('This item is already unlocked.');
        return;
    }

    const modal = document.getElementById('paymentModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) return;

    modalTitle.textContent = `Checkout: ${item.name}`;
    modalContent.innerHTML = getPaymentTemplate(item);

    const simulateBtn = modalContent.querySelector('[data-simulate-payment]');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', () => {
            startPaymentSimulation(item);
        });
    }

    openModal(modal, simulateBtn);
}

function getPaymentTemplate(item) {
    const primaryDownload = resolveDownloadLink(item);
    return `
        <div class="modal-row">
            <div>
                <span class="badge"><i class="fas fa-shield-check"></i> Secure mock flow</span>
                <p><strong>${item.name}</strong></p>
                <p class="card-description">${item.summary ?? ''}</p>
            </div>
            <strong>${currencyFormatter.format(PRICE_INR)}</strong>
        </div>
        <div class="modal-qr">
            <p><i class="fas fa-mobile-alt"></i> Scan & pay with PhonePe (Demo)</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(primaryDownload)}" alt="Placeholder QR for ${item.name}" loading="lazy" width="160" height="160">
            <p class="card-description">The QR represents the mock transaction. Replace this with your production payment QR or intent link.</p>
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" type="button" data-simulate-payment>
                <i class="fas fa-indian-rupee-sign"></i>
                Simulate PhonePe payment
            </button>
            <button class="btn btn-outline" type="button" data-close-modal>Cancel</button>
        </div>
    `;
}

function startPaymentSimulation(item) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <div class="payment-status">
            <div class="status-icon pending"><i class="fas fa-circle-notch fa-spin"></i></div>
            <h4>Processing test payment…</h4>
            <p class="card-description">We’re simulating a PhonePe order confirmation. In production, ensure server-side validation before unlocking downloads.</p>
        </div>
    `;

    setTimeout(() => {
        completeMockPayment(item);
    }, 1500);
}

function completeMockPayment(item) {
    purchasedItems.add(item.id);
    savePurchases();
    updateCatalogCard(item.id);
    hydratePurchasesModal();
    showToast(`${item.name} unlocked. Terabox download ready!`);

    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    modalContent.innerHTML = getPaymentSuccessTemplate(item);

    const closeButton = modalContent.querySelector('[data-close-modal]');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const modal = document.getElementById('paymentModal');
            if (modal) closeModal(modal);
        });
    }
}

function getPaymentSuccessTemplate(item) {
    const downloadsHtml = buildDownloadLinks(item);
    return `
        <div class="payment-status">
            <div class="status-icon success"><i class="fas fa-check"></i></div>
            <h4>Payment successful</h4>
            <p class="card-description">You’ve unlocked <strong>${item.name}</strong>. Use the buttons below to access your Terabox resources. Keep these URLs private.</p>
        </div>
        <div class="download-links">
            ${downloadsHtml}
        </div>
        <div class="modal-actions">
            <button class="btn btn-success" type="button" data-close-modal>
                <i class="fas fa-lock-open"></i>
                Close & continue browsing
            </button>
        </div>
    `;
}

function buildDownloadLinks(item) {
    if (Array.isArray(item.downloads) && item.downloads.length) {
        return item.downloads.map((entry) => {
            return `<a href="${entry.url}" target="_blank" rel="noopener">
                        <i class="fas fa-cloud-arrow-down"></i>
                        ${entry.label}
                    </a>`;
        }).join('');
    }
    const primary = resolveDownloadLink(item);
    return `<a href="${primary}" target="_blank" rel="noopener">
                <i class="fas fa-cloud-arrow-down"></i>
                Download from Terabox
            </a>`;
}

function updateCatalogCard(itemId) {
    const card = document.querySelector(`.card[data-item-id="${CSS.escape(itemId)}"]`);
    if (!card) return;
    togglePurchaseState(card, true);
}

function hydratePurchasesModal() {
    const container = document.getElementById('purchasesContent');
    if (!container) return;

    if (!purchasedItems.size) {
        container.innerHTML = '<p class="empty-state">You haven’t unlocked any items during this session yet.</p>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'download-links';

    Array.from(purchasedItems).forEach((id) => {
        const item = catalogIndex.get(id);
        if (!item) return;
        const primary = resolveDownloadLink(item);
        const link = document.createElement('a');
        link.href = primary;
        link.target = '_blank';
        link.rel = 'noopener';
        link.innerHTML = `<i class="fas fa-file-arrow-down"></i> ${item.name}`;
        list.appendChild(link);
    });

    container.innerHTML = '';

    if (list.childElementCount === 0) {
        container.innerHTML = '<p class="empty-state">Your unlocked items are syncing. Please refresh once the catalog JSON finishes loading.</p>';
        return;
    }

    container.appendChild(list);
}

function attachGlobalEvents() {
    document.body.addEventListener('click', (event) => {
        const target = event.target;

        if (target.matches('[data-close-modal]')) {
            const modal = target.closest('.modal');
            if (modal) closeModal(modal);
        }
    });

    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-backdrop')) {
                closeModal(modal);
            }
        });
    });

    const purchasesBtn = document.getElementById('viewPurchasesBtn');
    if (purchasesBtn) {
        purchasesBtn.addEventListener('click', () => {
            const modal = document.getElementById('purchasesModal');
            if (modal) {
                hydratePurchasesModal();
                openModal(modal, modal.querySelector('.modal-close'));
            }
        });
    }

    const howItWorksBtn = document.getElementById('howItWorksBtn');
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', () => {
            document.getElementById('payment-info')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && activeModal) {
            closeModal(activeModal);
        }
    });
}

function openModal(modal, focusTarget = null) {
    if (!modal) return;
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
    lastFocusedElement = document.activeElement;
    activeModal = modal;
    if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
    } else {
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.focus({ preventScroll: true });
    }
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-visible');
    activeModal = null;

    const anyVisible = document.querySelector('.modal.is-visible');
    if (!anyVisible) {
        document.body.classList.remove('modal-open');
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus({ preventScroll: true });
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 3200);
}

function updateCurrentYear() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear().toString();
    }
}

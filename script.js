// =========
// CONFIGURATION
// =========
const SKEY = 'session';
const NOTES_KEY = 'notes';
const ARCHIVE_KEY = 'archive';
const THEME_KEY = 'studyflow-theme';

// =========
// UTILITAIRES
// =========
function showToast(message, type = "info") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(200%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    const colors = {
        success: "#10B981",
        error: "#EF4444",
        info: "#3B82F6",
        warning: "#F59E0B"
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;
    setTimeout(() => toast.style.transform = "translateX(0)", 100);
    setTimeout(() => {
        toast.style.transform = "translateX(200%)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return "";
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// =========
// LIGHT / DARK MODE
// =========
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    if (saved === 'light') {
        document.body.classList.add('theme-light');
    }
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        const isLight = document.body.classList.contains('theme-light');
        icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// =========
// ARCHIVE SYSTEM (30 jours)
// =========
function cleanOldArchive() {
    let archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    archive = archive.filter(item => new Date(item.archivedAt).getTime() > cutoff);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    return archive;
}

function moveToArchive(matiereId, matiereNom) {
    const matiere = session.find(m => m.id === matiereId);
    if (!matiere) return;
    const archived = { ...matiere, archivedAt: new Date().toISOString() };
    let archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    archive.push(archived);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    session = session.filter(m => m.id !== matiereId);
    localStorage.setItem(SKEY, JSON.stringify(session));
    refreshAll();
    showToast(`"${matiereNom}" déplacée vers l'archive.`, "info");
}

function restoreFromArchive(matiereId) {
    let archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    const idx = archive.findIndex(m => m.id === matiereId);
    if (idx === -1) return;
    const restored = archive.splice(idx, 1)[0];
    delete restored.archivedAt;
    session.push(restored);
    localStorage.setItem(SKEY, JSON.stringify(session));
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    refreshAll();
    // Switch to dashboard
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-section="dashboard"]').classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('dashboard').classList.add('active');
    showToast("Matière restaurée !", "success");
}

function deleteFromArchive(matiereId) {
    if (!confirm("Supprimer définitivement cette matière ?")) return;
    let archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    archive = archive.filter(m => m.id !== matiereId);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    afficherArchive();
    showToast("Supprimé définitivement.", "success");
}

function afficherArchive() {
    const container = document.getElementById('archiveContainer');
    if (!container) return;
    let archive = cleanOldArchive();
    if (archive.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Aucun élément archivé.</p>';
        return;
    }
    container.innerHTML = archive.map(item => {
        const archivedDate = new Date(item.archivedAt);
        const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - archivedDate) / (1000 * 60 * 60 * 24)));
        return `
            <div class="matiere-card" style="border-left: 4px solid ${item.couleur}; padding: 1rem; margin-bottom: 1rem; border-radius: 16px; background: var(--bg-main);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>📚 ${item.nom}</strong><br>
                        <small style="color: var(--text-secondary);">
                            Archivé le ${formatDate(item.archivedAt)} • ${daysLeft} jour${daysLeft !== 1 ? 's' : ''} restant${daysLeft !== 1 ? 's' : ''}
                        </small>
                    </div>
                    <div>
                        <button class="btn-success" onclick="restoreFromArchive(${item.id})" style="padding: 6px 10px; font-size: 0.85rem;">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn-danger" onclick="deleteFromArchive(${item.id})" style="padding: 6px 10px; font-size: 0.85rem; margin-left: 6px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =========
// DONNÉES
// =========
let session;
let notes;
try {
    session = JSON.parse(localStorage.getItem(SKEY)) || [];
    if (!Array.isArray(session)) throw new Error();
} catch (e) {
    session = [];
    localStorage.setItem(SKEY, JSON.stringify(session));
}
try {
    notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || [];
    if (!Array.isArray(notes)) throw new Error();
} catch (e) {
    notes = [];
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// Variables globales
let deleteCallback = null;
let currentMonth = new Date();
let pomodoroTimer = null;
let pomodoroSeconds = 1500;
let pomodoroRunning = false;
let pomodoroMode = 'work';
let currentPage = 1;
const itemsPerPage = 5;

// =========
// PROGRESSION GLOBALE (CERCLE)
// =========
function updateGlobalProgressRing() {
    let totalObjectifs = 0;
    let totalFaits = 0;
    session.forEach(m => {
        totalObjectifs += m.objectifs.length;
        totalFaits += m.objectifs.filter(o => o.fait).length;
    });
    const percent = totalObjectifs > 0 ? Math.round((totalFaits / totalObjectifs) * 100) : 0;
    document.getElementById('globalProgressPercent').textContent = `${percent}%`;
    const ring = document.getElementById('progressRing');
    if (ring) {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (percent / 100) * circumference;
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = offset;
    }
}

// =========
// RAFRAÎCHISSEMENT
// =========
function refreshAll() {
    afficherMatieres();
    afficherStats();
    updateGlobalProgressRing();
}

// =========
// MENU BURGER MOBILE
// =========
function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('mobileCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function() {
            sidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        closeBtn.addEventListener('click', function() {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Fermer le menu en cliquant à l'extérieur
        mainContent.addEventListener('click', function() {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Fermer le menu en cliquant sur un lien
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}

// =========
// BOUTON RETOUR EN HAUT
// =========
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    
    if (backToTopBtn) {
        // Afficher/masquer le bouton au scroll
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        // Retour en haut smooth
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// =========
// STATISTIQUES (avec modal de suppression pro)
// =========
function afficherStats() {
    const container = document.getElementById("statsContainer");
    if (!container) return;
    if (session.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Aucune matière.</p>';
        return;
    }
    container.innerHTML = '';
    session.forEach(matiere => {
        const total = matiere.objectifs.length;
        const faits = matiere.objectifs.filter(o => o.fait).length;
        const pourcentage = total > 0 ? Math.round((faits / total) * 100) : 0;
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        statCard.style.cssText = `
            border-left: 5px solid ${matiere.couleur};
            padding: 16px;
            margin-bottom: 16px;
            border-radius: 0 10px 10px 0;
            background: var(--bg-main);
        `;

        // ✅ Bouton de suppression avec modal
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.style.cssText = 'padding: 4px 8px; font-size: 0.8rem; margin-left: 8px;';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => {
            document.getElementById('confirmMessage').innerHTML = `
                <strong style="color: var(--warning);">📦 Archiver la matière</strong><br>
                <em>${matiere.nom}</em> sera conservée 30 jours dans l'archive.
            `;
            deleteCallback = () => {
                moveToArchive(matiere.id, matiere.nom);
            };
            document.getElementById('confirmModal').classList.remove('hidden');
        };

        const header = document.createElement('div');
        header.className = 'stat-header';
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        header.innerHTML = `<h3>📚 ${matiere.nom}</h3>`;
        const right = document.createElement('div');
        right.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        right.innerHTML = `<span>${pourcentage}%</span>`;
        right.appendChild(deleteBtn);
        header.appendChild(header.children[0]);
        header.appendChild(right);

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.cssText = 'height: 8px; background: var(--bg-card); border-radius: 4px; overflow: hidden; margin-bottom: 8px;';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `height: 100%; width: ${pourcentage}%; background: ${matiere.couleur};`;
        progressContainer.appendChild(progressBar);

        const details = document.createElement('div');
        details.className = 'stat-details';
        details.style.cssText = 'font-size: 0.9rem; color: var(--text-secondary);';
        details.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> ${faits} / ${total} objectifs complétés`;

        statCard.appendChild(header);
        statCard.appendChild(progressContainer);
        statCard.appendChild(details);
        container.appendChild(statCard);
    });
}

// =========
// MODAL DE SUPPRESSION (لـ "Mes matières")
// =========
function showDeleteModal(matiereId, type, name, objectId = null) {
    if (type === 'matiere') {
        document.getElementById('confirmMessage').innerHTML = `
            <strong style="color: var(--warning);">📦 Archiver la matière</strong><br>
            Elle sera conservée 30 jours dans l'archive.
        `;
        deleteCallback = () => {
            moveToArchive(matiereId, name);
        };
        document.getElementById('confirmModal').classList.remove('hidden');
    } else if (type === 'objectif') {
        document.getElementById('confirmMessage').innerHTML = `Supprimer l'objectif : "${name}" ?`;
        deleteCallback = () => {
            session.forEach(m => {
                if (m.id === matiereId) {
                    m.objectifs = m.objectifs.filter(o => o.id !== objectId);
                }
            });
            localStorage.setItem(SKEY, JSON.stringify(session));
            refreshAll();
            showToast("Objectif supprimé.", "success");
        };
        document.getElementById('confirmModal').classList.remove('hidden');
    }
}

// =========
// POMODORO
// =========
function startPomodoro() {
    if (pomodoroRunning) return;
    pomodoroRunning = true;
    document.getElementById('startPomodoroBtn').disabled = true;
    document.getElementById('pausePomodoroBtn').disabled = false;
    const workDur = parseInt(document.getElementById('workDuration')?.value) || 25;
    const breakDur = parseInt(document.getElementById('breakDuration')?.value) || 5;
    pomodoroSeconds = pomodoroMode === 'work' ? workDur * 60 : breakDur * 60;
    updateTimerDisplay();
    pomodoroTimer = setInterval(() => {
        if (pomodoroSeconds <= 0) {
            clearInterval(pomodoroTimer);
            pomodoroMode = pomodoroMode === 'work' ? 'break' : 'work';
            playPomodoroAlert();
            startPomodoro();
            return;
        }
        pomodoroSeconds--;
        updateTimerDisplay();
    }, 1000);
}
function pausePomodoro() {
    if (!pomodoroRunning) return;
    clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    document.getElementById('startPomodoroBtn').disabled = false;
    document.getElementById('pausePomodoroBtn').disabled = true;
}
function resetPomodoro() {
    pausePomodoro();
    pomodoroMode = 'work';
    pomodoroSeconds = (parseInt(document.getElementById('workDuration')?.value) || 25) * 60;
    updateTimerDisplay();
    document.getElementById('timerMode').textContent = "Session de travail";
}
function updateTimerDisplay() {
    const mins = Math.floor(pomodoroSeconds / 60);
    const secs = pomodoroSeconds % 60;
    document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('timerMode').textContent = pomodoroMode === 'work' ? "Session de travail" : "Pause";
}
function playPomodoroAlert() {
    if (Notification.permission === "granted") {
        new Notification("⏰ Pomodoro terminé !", {
            body: pomodoroMode === 'work' ? "Pause terminée !" : "Session de travail terminée !",
            icon: "https://cdn-icons-png.flaticon.com/512/25/25689.png"
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
    }
    const audio = new Audio('brass.mp3');
    audio.volume = 0.7;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn("Échec lecture son:", e);
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.frequency.value = 523;
            osc.connect(ctx.destination);
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 300);
        });
    }
}

// =========
// NOTES
// =========
function ajouterNote() {
    const title = prompt("Titre de la note (optionnel) :");
    if (title === null) return;
    const content = prompt("Contenu de la note :");
    if (content === null || content.trim() === "") {
        showToast("Le contenu ne peut pas être vide.", "error");
        return;
    }
    const newNote = {
        id: Date.now(),
        title: title.trim() || 'Sans titre',
        content: content.trim(),
        date: new Date().toISOString().split('T')[0],
        color: '#303a44'
    };
    notes.unshift(newNote);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    afficherNotes();
    showToast("Note créée avec succès !", "success");
}
function afficherNotes() {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    if (notes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Aucune note. Cliquez sur "Nouvelle note".</p>';
        return;
    }
    container.innerHTML = notes.map(note => `
        <div class="note-card" style="background-color: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <strong 
                    contenteditable="true" 
                    class="note-title" 
                    data-id="${note.id}"
                    style="font-size: 1.1rem; color: var(--text-primary); outline: none; padding: 2px 4px; border-radius: 4px;"
                >${note.title || 'Sans titre'}</strong>
                <button class="btn-danger" onclick="deleteNote(${note.id})" style="padding: 6px 10px; font-size: 0.9rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div 
                contenteditable="true" 
                class="note-content" 
                data-id="${note.id}" 
                style="min-height: 60px; line-height: 1.5; outline: none; color: var(--text-secondary);"
            >${note.content}</div>
            <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary);">
                📅 ${formatDate(note.date)}
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.note-title').forEach(el => {
        el.addEventListener('input', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const note = notes.find(n => n.id === id);
            if (note) {
                note.title = this.textContent.trim() || 'Sans titre';
                localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
            }
        });
        el.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
    });
    document.querySelectorAll('.note-content').forEach(el => {
        el.addEventListener('input', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const note = notes.find(n => n.id === id);
            if (note) {
                note.content = this.innerHTML;
                localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
            }
        });
    });
}
function deleteNote(id) {
    if (!confirm("Supprimer cette note ?")) return;
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    afficherNotes();
}

// =========
// CALENDRIER
// =========
function afficherCalendrier() {
    const grid = document.getElementById('calendarGrid');
    const monthEl = document.getElementById('currentMonth');
    const details = document.getElementById('calendarDetails');
    if (!grid || !monthEl) return;
    if (!details) {
        const detailsEl = document.createElement('div');
        detailsEl.id = 'calendarDetails';
        detailsEl.className = 'card';
        detailsEl.style.cssText = `display: none; margin-top: 24px;`;
        document.querySelector('.calendar-card').appendChild(detailsEl);
    }
    const date = currentMonth;
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const moisFrancais = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    monthEl.textContent = `${moisFrancais[month]} ${year}`;
    let html = '<div class="calendar-header">Dim Lun Mar Mer Jeu Ven Sam</div>';
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const matieresJour = session.filter(m => m.dateDebut <= dateStr && m.dateFin >= dateStr);
        let backgroundStyle = '';
        if (matieresJour.length === 1) {
            backgroundStyle = `background-color: ${matieresJour[0].couleur}20; border-left: 4px solid ${matieresJour[0].couleur};`;
        } else if (matieresJour.length > 1) {
            const stops = matieresJour.map((m, i) => {
                const start = (i / matieresJour.length) * 100;
                const end = ((i + 1) / matieresJour.length) * 100;
                return `${m.couleur}20 ${start}%, ${m.couleur}20 ${end}%`;
            }).join(', ');
            backgroundStyle = `background: linear-gradient(to right, ${stops});`;
        }
        html += `
            <div class="calendar-day ${matieresJour.length ? 'has-matiere clickable' : ''}" 
                 data-date="${dateStr}" 
                 onclick="afficherDetailsJour('${dateStr}')"
                 style="${backgroundStyle}">
                <div class="calendar-day-number">${day}</div>
            </div>`;
    }
    grid.innerHTML = html;
}
function afficherDetailsJour(dateStr) {
    const detailsEl = document.getElementById('calendarDetails');
    const matieresJour = session.filter(m => m.dateDebut <= dateStr && m.dateFin >= dateStr);
    if (matieresJour.length === 0) {
        detailsEl.style.display = 'none';
        return;
    }
    let html = `<h3 style="margin-top: 0;">📅 Révisions du ${formatDate(dateStr)}</h3>`;
    matieresJour.forEach(matiere => {
        html += `
            <div class="matiere-details" style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="width: 12px; height: 12px; background: ${matiere.couleur}; border-radius: 2px;"></div>
                    <strong style="font-size: 1.1rem;">${matiere.nom}</strong>
                </div>
                <div style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 12px;">
                    ⏱️ ${matiere.heuresParJour}h de révision prévues
                </div>
                <div><strong>Objectifs :</strong></div>
                <ul style="padding-left: 20px; margin-top: 8px;">`;
        matiere.objectifs.forEach(obj => {
            html += `
                <li style="margin-bottom: 6px; ${obj.fait ? 'text-decoration: line-through; color: var(--success);' : ''}">
                    ${obj.fait ? '✅' : '⭕'} ${obj.texte}
                </li>`;
        });
        html += `</ul></div>`;
    });
    detailsEl.innerHTML = html;
    detailsEl.style.display = 'block';
}
function previousMonth() { currentMonth.setMonth(currentMonth.getMonth() - 1); afficherCalendrier(); }
function nextMonth() { currentMonth.setMonth(currentMonth.getMonth() + 1); afficherCalendrier(); }

// =========
// AMÉLIORATION AFFICHAGE MATIERES
// =========
function afficherMatieresAmeliore() {
    const container = document.getElementById("listeMatieres");
    if (!container) return;
    
    if (session.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Aucune matière ajoutée</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Commencez par ajouter votre première matière !</p>
            </div>
        `;
        return;
    }
    
    const totalPages = Math.ceil(session.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMatiere = session.slice(startIndex, startIndex + itemsPerPage);
    
    let html = '';
    paginatedMatiere.forEach(matiere => {
        const objectifsCompletes = matiere.objectifs.filter(o => o.fait).length;
        const totalObjectifs = matiere.objectifs.length;
        const pourcentage = totalObjectifs > 0 ? Math.round((objectifsCompletes / totalObjectifs) * 100) : 0;
        
        html += `
            <div class="matiere-card" style="border-left-color: ${matiere.couleur}">
                <div class="matiere-header">
                    <div style="flex: 1;">
                        <div class="matiere-title">
                            <i class="fas fa-book"></i>
                            ${matiere.nom}
                            <span style="font-size: 0.9rem; color: ${matiere.couleur}; font-weight: 600; margin-left: 0.5rem;">
                                ${pourcentage}%
                            </span>
                        </div>
                        <div class="matiere-dates">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(matiere.dateDebut)} → ${formatDate(matiere.dateFin)}
                            <i class="fas fa-hourglass" style="margin-left: 1rem;"></i>
                            ${matiere.heuresParJour}h/jour
                        </div>
                    </div>
                    <div class="matiere-actions">
                        <button class="btn-primary" onclick="editerMatiere(${matiere.id})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-danger" onclick="showDeleteModal(${matiere.id}, 'matiere', \`${matiere.nom}\`)" title="Archiver">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="objectifs-list">
                    <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-list-check"></i>
                        Objectifs (${objectifsCompletes}/${totalObjectifs})
                    </div>`;
        
        matiere.objectifs.forEach(obj => {
            const isChecked = obj.fait ? 'fas fa-check-circle' : 'far fa-circle';
            const textClass = obj.fait ? 'done' : '';
            
            html += `
                <div class="objectif-item">
                    <div class="objectif-text ${textClass}" id="obj-text-${obj.id}">
                        <i class="${isChecked}"></i>
                        <span>${obj.texte}</span>
                    </div>
                    <div class="objectif-actions">
                        <button class="btn-secondary" onclick="editObjectif(${matiere.id}, '${obj.id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="${obj.fait ? 'btn-secondary' : 'btn-success'}" onclick="toggleFait(${matiere.id}, '${obj.id}')" title="${obj.fait ? 'Marquer non fait' : 'Marquer fait'}">
                            ${obj.fait ? '<i class="fas fa-undo"></i>' : '<i class="fas fa-check"></i>'}
                        </button>
                        <button class="btn-danger" onclick="showDeleteModal(${matiere.id}, 'objectif', \`${obj.texte}\`, '${obj.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
    
    // Mise à jour de la pagination
    const pagination = document.getElementById("matieresPagination");
    if (totalPages > 1) {
        let buttons = '';
        
        // Bouton précédent
        if (currentPage > 1) {
            buttons += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" title="Page précédente">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }
        
        // Pages
        for (let i = 1; i <= totalPages; i++) {
            buttons += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>`;
        }
        
        // Bouton suivant
        if (currentPage < totalPages) {
            buttons += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" title="Page suivante">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        pagination.innerHTML = `<div class="pagination-controls">${buttons}</div>`;
    } else {
        pagination.innerHTML = '';
    }
}

// =========
// GESTION DES MATIÈRES
// =========
function afficherMatieres() {
    afficherMatieresAmeliore();
}

function goToPage(page) {
    currentPage = page;
    afficherMatieres();
}
function editObjectif(matiereId, objetifId) {
    const objTextElement = document.getElementById(`obj-text-${objetifId}`);
    if (!objTextElement) return;
    let objectif = null;
    for (const matiere of session) {
        const obj = matiere.objectifs.find(o => o.id === objetifId);
        if (obj) { objectif = obj; break; }
    }
    if (!objectif) return;
    const span = objTextElement.querySelector('span');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = objectif.texte;
    input.style.cssText = 'flex: 1; margin-left: 12px; padding: 4px 8px; border: 1px solid var(--primary); border-radius: 4px; font-size: 1rem;';
    objTextElement.replaceChild(input, span);
    input.focus();
    const save = () => {
        const val = input.value.trim();
        if (val) {
            objectif.texte = val;
            localStorage.setItem(SKEY, JSON.stringify(session));
            refreshAll();
        } else {
            refreshAll();
        }
    };
    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') save(); });
}
function toggleFait(matiereId, objetifId) {
    session.forEach(m => {
        if (m.id === matiereId) {
            m.objectifs.forEach(o => { if (o.id === objetifId) o.fait = !o.fait; });
        }
    });
    localStorage.setItem(SKEY, JSON.stringify(session));
    refreshAll();
}
function editerMatiere(matiereId) {
    const matiere = session.find(m => m.id === matiereId);
    if (!matiere) return;
    document.getElementById('matiere').value = matiere.nom;
    document.getElementById('dateDebut').value = matiere.dateDebut;
    document.getElementById('dateFin').value = matiere.dateFin;
    document.getElementById('heuresParJour').value = matiere.heuresParJour;
    document.getElementById('couleur').value = matiere.couleur;
    session = session.filter(m => m.id !== matiereId);
    localStorage.setItem(SKEY, JSON.stringify(session));
    refreshAll();
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    showToast("Modifiez la matière et cliquez sur 'Ajouter'", "info");
}

// =========
// AJOUT DE MATIÈRE
// =========
function GnererBtn() {
    const nb = parseInt(document.getElementById("nbObjectifs").value, 10);
    if (isNaN(nb) || nb <= 0) return showToast("Nombre d'objectifs invalide", "error");
    const liste = document.getElementById("listeObjectifs");
    liste.innerHTML = "<label style='display: block; margin-bottom: 10px; font-weight: 500;'><i class='fas fa-list-check'></i> Objectifs:</label>";
    for (let i = 0; i < nb; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'objectif-input';
        input.placeholder = `Objectif ${i + 1}`;
        input.style.cssText = "width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 6px;";
        liste.appendChild(input);
    }
    document.getElementById("btnAjouterMatiere")?.classList.remove("hidden");
}
function Ajouter() {
    const m = document.getElementById("matiere");
    const d1 = document.getElementById("dateDebut");
    const d2 = document.getElementById("dateFin");
    const h = document.getElementById("heuresParJour");
    const c = document.getElementById("couleur");
    const nom = m.value.trim();
    const debut = d1.value;
    const fin = d2.value;
    const heures = parseInt(h.value, 10);
    const couleur = c.value;
    const inputs = document.querySelectorAll('#listeObjectifs input.objectif-input');
    const objectifs = [];
    inputs.forEach((inp, i) => {
        const t = inp.value.trim();
        if (t) objectifs.push({ id: "obj_" + Date.now() + "_" + i, texte: t, fait: false });
    });
    if (!nom) return showToast("Nom de la matière requis", "error");
    if (!debut || !fin) return showToast("Dates requises", "error");
    if (isNaN(heures) || heures <= 0) return showToast("Heures/jour invalide", "error");
    if (objectifs.length === 0) return showToast("Au moins un objectif requis", "error");
    session.push({ id: Date.now(), nom, dateDebut: debut, dateFin: fin, heuresParJour: heures, couleur, objectifs });
    localStorage.setItem(SKEY, JSON.stringify(session));
    refreshAll();
    m.value = ''; d1.value = ''; d2.value = ''; h.value = ''; c.value = '#4f46e5';
    document.getElementById("nbObjectifs").value = '';
    document.getElementById("listeObjectifs").innerHTML = '';
    document.getElementById("btnAjouterMatiere")?.classList.add("hidden");
    showToast("Matière ajoutée !", "success");
}

// =========
// MODAL & SUPPRESSION
// =========
function closeModal() { 
    document.getElementById('confirmModal')?.classList.add('hidden'); 
}
function confirmDelete() {
    if (typeof deleteCallback === 'function') {
        deleteCallback();
        deleteCallback = null;
    }
    closeModal();
}
function DelateAll() {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmMessage').innerHTML = `
        <strong style="color: var(--danger);">⚠️ Suppression totale</strong><br>
        Supprimer <strong>toutes les matières et objectifs</strong> ?<br>
        <small style="color: var(--text-secondary);">Irréversible.</small>
    `;
    deleteCallback = () => {
        session = [];
        localStorage.setItem(SKEY, JSON.stringify(session));
        closeModal();
        refreshAll();
        showToast("Tout a été supprimé.", "success");
    };
    modal.classList.remove('hidden');
}

// =========
// IMPRESSION
// =========
function imprimerPlanning() {
    const originalMain = document.querySelector('.main-content').innerHTML;
    const originalSidebar = document.querySelector('.sidebar').innerHTML;
    const globalProgress = document.querySelector('.progress-ring-container').outerHTML + 
                          '<div style="text-align:center; font-size:0.9rem; margin-top:10px;">Progression globale</div>';
    const statsSection = document.querySelector('.stats-card').cloneNode(true);
    const buttonsInStats = statsSection.querySelectorAll('button');
    buttonsInStats.forEach(btn => btn.remove());
    document.querySelector('.main-content').innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Poppins', sans-serif; color: #1e293b;">
            <h1 style="text-align: center; color: #4f46e5; margin-bottom: 30px;">📊 Rapport de Progression</h1>
            <div style="text-align: center; margin-bottom: 40px;">
                ${globalProgress}
            </div>
            <div style="margin-top: 30px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">📈 Détail par matière</h2>
                ${statsSection.innerHTML}
            </div>
        </div>
    `;
    document.querySelector('.sidebar').style.display = 'none';
    window.print();
    setTimeout(() => {
        document.querySelector('.main-content').innerHTML = originalMain;
        document.querySelector('.sidebar').style.display = '';
        document.querySelector('.sidebar').innerHTML = originalSidebar;
        if (typeof updateGlobalProgressRing === 'function') {
            updateGlobalProgressRing();
        }
    }, 1000);
}

// =========
// AI TOOLS
// =========
const AI_CONFIG = {
    provider: 'routellm',
    apiKey: 's2_d1798189e8764e89b19eae2eb5c229b6',
    endpoint: 'https://routellm.abacus.ai/v1/chat/completions',
    model: 'route-llm',
    stream: false
};

let conversationHistory = [];

function sauvegarderConversation() {
    try {
        localStorage.setItem('aiConversationHistory', JSON.stringify(conversationHistory));
    } catch (error) {
        console.error('Erreur sauvegarde conversation:', error);
    }
}

function chargerConversation() {
    try {
        const savedHistory = localStorage.getItem('aiConversationHistory');
        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);
            afficherConversation();
        } else {
            const container = document.getElementById('aiMessages');
            if (container) {
                container.innerHTML = `
                    <div class="ai-message ai-message-assistant">
                      <div class="ai-avatar">
                        <i class="fas fa-robot"></i>
                      </div>
                      <div class="ai-bubble">
                        Bonjour ! Je suis votre assistant d'étude. Comment puis-je vous aider aujourd'hui ?
                      </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Erreur chargement conversation:', error);
    }
}

function afficherConversation() {
    const container = document.getElementById('aiMessages');
    if (!container) return;

    container.innerHTML = '';
    conversationHistory.forEach(msg => {
        ajouterMessageAffiche(msg.content, msg.role === 'user' ? 'user' : 'assistant');
    });
    container.scrollTop = container.scrollHeight;
}

function effacerConversation() {
    try {
        localStorage.removeItem('aiConversationHistory');
    } catch (error) {
        console.error('Erreur suppression conversation:', error);
    }
}

function ajouterMessageAffiche(texte, type) {
    const container = document.getElementById('aiMessages');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    bubble.innerHTML = formaterTexte(texte);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function ajouterMessageLoading() {
    const container = document.getElementById('aiMessages');
    if (!container) return null;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-message ai-message-assistant';
    loadingDiv.id = 'loading-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble loading';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    
    loadingDiv.appendChild(avatar);
    loadingDiv.appendChild(bubble);
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
    
    return 'loading-message';
}

function retirerMessage(messageId) {
    const msg = document.getElementById(messageId);
    if (msg) msg.remove();
}

function formaterTexte(texte) {
    if (!texte) return '';
    
    let html = texte
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/^\s*\*\s+(.+)$/gm, '<div style="margin: 5px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0;">•</span> $1</div>');
    html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<div style="margin: 8px 0;"><strong>$1.</strong> $2</div>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return html;
}

async function envoyerMessageAI() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    if (!message) return;

    ajouterMessageAffiche(message, 'user');
    conversationHistory.push({ role: 'user', content: message });
    sauvegarderConversation();
    input.value = '';

    const btnEnvoyer = document.getElementById('btnEnvoyerAI');
    if (btnEnvoyer) btnEnvoyer.disabled = true;

    const loadingId = ajouterMessageLoading();

    try {
        const reponse = await appellerRouteLLM(message);
        retirerMessage(loadingId);
        ajouterMessageAffiche(reponse, 'assistant');
    } catch (error) {
        retirerMessage(loadingId);
        ajouterMessageAffiche('❌ Désolé, une erreur est survenue. Veuillez réessayer.', 'assistant');
        console.error('Erreur API RouteLLM:', error);
    }

    if (btnEnvoyer) btnEnvoyer.disabled = false;
}

async function appellerRouteLLM(message) {
    const messages = [
        {
            role: 'system',
            content: `Tu es un assistant d'étude bienveillant et pédagogue. 
                      Tu aides les étudiants à comprendre leurs cours, à réviser efficacement 
                      et à répondre à leurs questions académiques en français. 
                      Sois clair, précis et encourageant.`
        },
        ...conversationHistory
    ];

    const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: AI_CONFIG.model,
            messages: messages,
            stream: AI_CONFIG.stream,
            temperature: 0.7,
            max_tokens: 800
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const reponse = data.choices?.[0]?.message?.content || 'Aucune réponse reçue.';

    conversationHistory.push({ role: 'assistant', content: reponse });
    sauvegarderConversation();
    
    return reponse;
}

function nouvelleConversation() {
    conversationHistory = [];
    effacerConversation();
    
    const container = document.getElementById('aiMessages');
    const input = document.getElementById('aiInput');
    
    if (container) {
        container.innerHTML = `
            <div class="ai-message ai-message-assistant">
              <div class="ai-avatar">
                <i class="fas fa-robot"></i>
              </div>
              <div class="ai-bubble">
                Bonjour ! Nouvelle conversation démarrée 😊<br>
                Pose-moi une question sur tes études, je suis là pour t'aider.
              </div>
            </div>
        `;
    }
    
    if (input) input.value = '';
}

function confirmerSuppressionChat() {
    const container = document.getElementById('aiMessages');
    const messages = container?.querySelectorAll('.ai-message') || [];
    
    if (messages.length <= 1) {
        nouvelleConversation();
        return;
    }
    
    if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer toute la conversation ?\n\nCette action est irréversible.')) {
        supprimerConversation();
    }
}

function supprimerConversation() {
    conversationHistory = [];
    effacerConversation();
    
    const container = document.getElementById('aiMessages');
    const input = document.getElementById('aiInput');
    
    if (container) {
        container.innerHTML = `
            <div class="ai-message ai-message-assistant">
              <div class="ai-avatar">
                <i class="fas fa-robot"></i>
              </div>
              <div class="ai-bubble">
                Conversation supprimée. 🗑️<br>Comment puis-je vous aider ?
              </div>
            </div>
        `;
    }
    
    if (input) input.value = '';
    showToast('Conversation supprimée avec succès', 'success');
}

function suggestionAI(texte) {
    const input = document.getElementById('aiInput');
    if (input) {
        input.value = texte;
        envoyerMessageAI();
    }
}

// =========
// CONVERT IMAGE TO PDF
// =========
document.getElementById("generatePDFBtn")?.addEventListener("click", async () => {
    const files = document.getElementById("studentPhotos").files;

    if (files.length === 0) {
        document.getElementById("pdfStatus").innerText = "⚠️ Veuillez sélectionner des photos.";
        return;
    }

    document.getElementById("pdfStatus").innerText = "⏳ Génération du PDF en cours...";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });

    for (let i = 0; i < files.length; i++) {
        const imgBase64 = await toBase64(files[i]);

        if (i > 0) pdf.addPage();

        pdf.addImage(imgBase64, "JPEG", 10, 10, 190, 270);
    }

    pdf.save("photos_etudiant.pdf");

    document.getElementById("pdfStatus").innerText = "✔️ PDF généré avec succès !";
});

function toBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// =========
// PLANNING CONTROLES
// =========
const tableBody = document.querySelector("#planningTable tbody");
const deleteLastModuleBtn = document.getElementById('deleteLastModuleBtn');

function getModules() {
    return JSON.parse(localStorage.getItem('modules') || "[]");
}

function saveModule(module) {
    const modules = getModules();
    modules.push(module);
    localStorage.setItem('modules', JSON.stringify(modules));
}

function updateModule(index, updatedModule) {
    const modules = getModules();
    modules[index] = updatedModule;
    localStorage.setItem('modules', JSON.stringify(modules));
}

function renderModules() {
    const modules = getModules();
    tableBody.innerHTML = "";

    modules.forEach((module, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${module.name}</td>
            <td><input type="number" min="0" max="20" class="ctrlInput" value="${module.controle1}"></td>
            <td><input type="number" min="0" max="20" class="ctrlInput" value="${module.controle2}"></td>
            <td><input type="number" min="0" max="20" class="ctrlInput" value="${module.controle3}"></td>
            <td><input type="number" min="0" max="20" class="examInput" value="${module.examFinal}"></td>
            <td class="statusCell">❌ Pas encore</td>
        `;

        tableBody.appendChild(row);

        const inputs = row.querySelectorAll("input");
        const statusCell = row.querySelector(".statusCell");

        inputs.forEach((input, i) => {
            input.addEventListener("input", () => {
                if (i === 0) module.controle1 = input.value;
                if (i === 1) module.controle2 = input.value;
                if (i === 2) module.controle3 = input.value;
                if (i === 3) module.examFinal = input.value;

                updateModule(index, module);
                updateStatus(row);
            });
        });

        updateStatus(row);
    });
}

function updateStatus(row) {
    const inputs = row.querySelectorAll("input");
    const statusCell = row.querySelector(".statusCell");

    let done = true;
    inputs.forEach(i => {
        if (i.value === "" || i.value < 0 || i.value > 20) done = false;
    });

    if (done) {
        statusCell.textContent = "✔ Terminé";
        statusCell.style.color = "green";
    } else {
        statusCell.textContent = "❌ Pas encore";
        statusCell.style.color = "red";
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.innerText = message;
    toast.style.background = '#ef4444';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.fontWeight = '500';
    toast.style.zIndex = '10000';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// =========
// DOM READY
// =========
document.addEventListener('DOMContentLoaded', function () {
    // 1. تهيئة الوضع (Light/Dark)
    initTheme();
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // 2. تهيئة الأرشيف
    cleanOldArchive();
    refreshAll();

    // 3. تهيئة menu mobile
    initMobileMenu();

    // 4. تهيئة bouton retour en haut
    initBackToTop();

    // 5. الملاحة
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(sectionId)?.classList.add('active');

            if (sectionId === 'calendar') afficherCalendrier();
            else if (sectionId === 'notes') afficherNotes();
            else if (sectionId === 'archive') afficherArchive();
        });
    });

    // 6. Pomodoro
    const startBtn = document.getElementById('startPomodoroBtn');
    const pauseBtn = document.getElementById('pausePomodoroBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startPomodoro);
        pauseBtn.addEventListener('click', pausePomodoro);
    }

    // 7. AI Assistant
    chargerConversation();
    
    const aiInput = document.getElementById('aiInput');
    if (aiInput) {
        aiInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                envoyerMessageAI();
            }
        });
    }

    // 8. Planning Contrôles
    document.getElementById("addModuleBtn")?.addEventListener("click", () => {
        const moduleName = prompt("Nom de la matière :");
        if (!moduleName) return;

        const moduleData = {
            name: moduleName,
            controle1: "",
            controle2: "",
            controle3: "",
            examFinal: ""
        };

        saveModule(moduleData);
        renderModules();
    });

    deleteLastModuleBtn?.addEventListener('click', () => {
        let modules = getModules();
        if (modules.length > 0) {
            modules.pop();
            localStorage.setItem('modules', JSON.stringify(modules));
            renderModules();
            showToast('Dernière matière supprimée ✅');
        } else {
            showToast('Aucune matière à supprimer ❌');
        }
    });

    renderModules();
});

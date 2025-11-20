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

function formatDateTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
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
    afficherCalendrier();
}

// =========
// MENU BURGER MOBILE AVEC VISIBILITÉ DYNAMIQUE
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
            // Masquer le bouton menu, afficher le bouton fermer
            menuBtn.style.display = 'none';
            closeBtn.style.display = 'flex';
        });
        
        closeBtn.addEventListener('click', function() {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
            // Masquer le bouton fermer, afficher le bouton menu
            closeBtn.style.display = 'none';
            menuBtn.style.display = 'flex';
        });
        
        // Fermer le menu en cliquant à l'extérieur
        mainContent.addEventListener('click', function() {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
                // Masquer le bouton fermer, afficher le bouton menu
                closeBtn.style.display = 'none';
                menuBtn.style.display = 'flex';
            }
        });
        
        // Fermer le menu en cliquant sur un lien
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
                // Masquer le bouton fermer, afficher le bouton menu
                closeBtn.style.display = 'none';
                menuBtn.style.display = 'flex';
            });
        });

        // Gérer le redimensionnement de la fenêtre
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                // Sur les grands écrans, s'assurer que tout est visible normalement
                sidebar.classList.remove('active');
                menuBtn.style.display = 'none';
                closeBtn.style.display = 'none';
                document.body.style.overflow = '';
            } else {
                // Sur les petits écrans, afficher le bouton menu si la sidebar est fermée
                if (!sidebar.classList.contains('active')) {
                    menuBtn.style.display = 'flex';
                    closeBtn.style.display = 'none';
                }
            }
        });

        // Initialiser l'état au chargement
        if (window.innerWidth <= 768) {
            menuBtn.style.display = 'flex';
            closeBtn.style.display = 'none';
        } else {
            menuBtn.style.display = 'none';
            closeBtn.style.display = 'none';
        }
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
// STATISTIQUES AVEC TEMPS
// =========
function afficherStats() {
    const container = document.getElementById("statsContainer");
    const detailsContainer = document.getElementById("statsDetails");
    if (!container) return;
    
    if (session.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Aucune matière.</p>';
        detailsContainer.innerHTML = '';
        return;
    }
    
    container.innerHTML = '';
    detailsContainer.innerHTML = '';
    
    // Statistiques globales
    let totalObjectifs = 0;
    let totalFaits = 0;
    let totalFaitsDansTemps = 0;
    let totalHeuresPlanifiees = 0;
    let totalHeuresReelles = 0;
    
    session.forEach(matiere => {
        totalObjectifs += matiere.objectifs.length;
        totalFaits += matiere.objectifs.filter(o => o.fait).length;
        
        matiere.objectifs.forEach(obj => {
            if (obj.heuresEstimees) {
                totalHeuresPlanifiees += obj.heuresEstimees;
            }
            if (obj.fait && obj.dateRealisation) {
                totalHeuresReelles += obj.heuresReelles || 0;
                // Vérifier si réalisé dans le temps
                if (obj.dateEcheance && obj.dateRealisation) {
                    const echeance = new Date(obj.dateEcheance);
                    const realisation = new Date(obj.dateRealisation);
                    if (realisation <= echeance) {
                        totalFaitsDansTemps++;
                    }
                }
            }
        });
    });
    
    const pourcentageFaits = totalObjectifs > 0 ? Math.round((totalFaits / totalObjectifs) * 100) : 0;
    const pourcentageDansTemps = totalFaits > 0 ? Math.round((totalFaitsDansTemps / totalFaits) * 100) : 0;
    
    // Affichage des statistiques globales
    const statsGlobales = document.createElement('div');
    statsGlobales.className = 'stat-card';
    statsGlobales.style.cssText = `
        border-left: 5px solid var(--primary);
        padding: 16px;
        margin-bottom: 16px;
        border-radius: 0 10px 10px 0;
        background: var(--bg-main);
    `;
    
    statsGlobales.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: var(--primary);">📊 Statistiques Globales</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${pourcentageFaits}%</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">Objectifs complétés</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${pourcentageDansTemps}%</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">Dans les temps</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${totalHeuresPlanifiees}h</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">Heures planifiées</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--info);">${totalHeuresReelles}h</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">Heures réelles</div>
            </div>
        </div>
    `;
    
    container.appendChild(statsGlobales);
    
    // Détails par matière
    session.forEach(matiere => {
        const total = matiere.objectifs.length;
        const faits = matiere.objectifs.filter(o => o.fait).length;
        const faitsDansTemps = matiere.objectifs.filter(o => 
            o.fait && o.dateEcheance && o.dateRealisation && new Date(o.dateRealisation) <= new Date(o.dateEcheance)
        ).length;
        const pourcentage = total > 0 ? Math.round((faits / total) * 100) : 0;
        const pourcentageTemps = faits > 0 ? Math.round((faitsDansTemps / faits) * 100) : 0;
        
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
        details.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span><i class="fas fa-check-circle" style="color: var(--success);"></i> ${faits} / ${total} objectifs</span>
                <span><i class="fas fa-clock" style="color: ${pourcentageTemps > 80 ? 'var(--success)' : pourcentageTemps > 50 ? 'var(--warning)' : 'var(--danger)'};"></i> ${pourcentageTemps}% dans les temps</span>
            </div>
        `;

        statCard.appendChild(header);
        statCard.appendChild(progressContainer);
        statCard.appendChild(details);
        container.appendChild(statCard);
    });
}

// =========
// MODAL DE SUPPRESSION
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
// CALENDRIER AVEC GESTION DU TEMPS
// =========
function afficherCalendrier() {
    const grid = document.getElementById('calendarGrid');
    const monthEl = document.getElementById('currentMonth');
    const details = document.getElementById('calendarDetails');
    if (!grid || !monthEl) return;
    
    const date = currentMonth;
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const moisFrancais = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    monthEl.textContent = `${moisFrancais[month]} ${year}`;
    
    let html = '';
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const objectifsJour = getObjectifsForDate(dateStr);
        let backgroundStyle = '';
        let indicatorHtml = '';
        
        if (objectifsJour.length > 0) {
            // Calculer le nombre total d'heures pour ce jour
            const totalHeures = objectifsJour.reduce((sum, obj) => sum + (obj.heuresEstimees || 0), 0);
            backgroundStyle = `background-color: rgba(99, 102, 241, 0.1); border-left: 4px solid var(--primary);`;
            indicatorHtml = `<div class="calendar-indicator" style="background: var(--primary);"></div>`;
            
            if (totalHeures > 0) {
                indicatorHtml += `<div style="font-size: 0.7rem; color: var(--primary); margin-top: 2px;">${totalHeures}h</div>`;
            }
        }
        
        html += `
            <div class="calendar-day ${objectifsJour.length ? 'has-matiere clickable' : ''}" 
                 data-date="${dateStr}" 
                 onclick="afficherDetailsJour('${dateStr}')"
                 style="${backgroundStyle}">
                <div class="calendar-day-number">${day}</div>
                ${indicatorHtml}
            </div>`;
    }
    grid.innerHTML = html;
}

function getObjectifsForDate(dateStr) {
    const objectifs = [];
    session.forEach(matiere => {
        matiere.objectifs.forEach(obj => {
            if (obj.dateEcheance === dateStr) {
                objectifs.push({
                    ...obj,
                    matiere: matiere.nom,
                    couleur: matiere.couleur
                });
            }
        });
    });
    return objectifs;
}

function afficherDetailsJour(dateStr) {
    const detailsEl = document.getElementById('calendarDetails');
    const objectifsJour = getObjectifsForDate(dateStr);
    
    if (objectifsJour.length === 0) {
        detailsEl.style.display = 'none';
        return;
    }
    
    let html = `<h3 style="margin-top: 0;">📅 Objectifs pour le ${formatDate(dateStr)}</h3>`;
    const totalHeures = objectifsJour.reduce((sum, obj) => sum + (obj.heuresEstimees || 0), 0);
    
    html += `<div style="margin-bottom: 1rem; color: var(--text-secondary);">
        <i class="fas fa-clock"></i> Total : ${totalHeures} heure${totalHeures !== 1 ? 's' : ''} planifiée${totalHeures !== 1 ? 's' : ''}
    </div>`;
    
    objectifsJour.forEach(obj => {
        const status = obj.fait ? 
            (obj.dateRealisation && new Date(obj.dateRealisation) <= new Date(obj.dateEcheance) ? 
                '✅ Terminé dans les temps' : 
                '⚠️ Terminé en retard') : 
            '⏳ En attente';
        
        const statusColor = obj.fait ? 
            (obj.dateRealisation && new Date(obj.dateRealisation) <= new Date(obj.dateEcheance) ? 
                'var(--success)' : 'var(--warning)') : 
            'var(--text-secondary)';
        
        html += `
            <div class="matiere-details" style="margin-bottom: 20px; padding: 16px; background: var(--bg-main); border-radius: 8px; border-left: 4px solid ${obj.couleur};">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <div style="width: 12px; height: 12px; background: ${obj.couleur}; border-radius: 2px;"></div>
                            <strong style="font-size: 1.1rem;">${obj.matiere}</strong>
                        </div>
                        <div style="color: var(--text-primary); margin-bottom: 8px;">
                            ${obj.texte}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${statusColor}; font-weight: 600; margin-bottom: 4px;">${status}</div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            ${obj.heuresEstimees || 0}h estimées
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                    <div>
                        <i class="fas fa-hourglass-end"></i> Échéance : ${formatDate(obj.dateEcheance)}
                    </div>
                    ${obj.dateRealisation ? `
                        <div>
                            <i class="fas fa-check-circle"></i> Réalisé : ${formatDate(obj.dateRealisation)}
                        </div>
                    ` : ''}
                </div>
                ${!obj.fait ? `
                    <div style="margin-top: 10px;">
                        <button class="btn-success" onclick="marquerCommeFait('${obj.id}')" style="padding: 6px 12px; font-size: 0.8rem;">
                            <i class="fas fa-check"></i> Marquer comme fait
                        </button>
                    </div>
                ` : ''}
            </div>`;
    });
    
    detailsEl.innerHTML = html;
    detailsEl.style.display = 'block';
}



function previousMonth() { 
    currentMonth.setMonth(currentMonth.getMonth() - 1); 
    afficherCalendrier(); 
}

function nextMonth() { 
    currentMonth.setMonth(currentMonth.getMonth() + 1); 
    afficherCalendrier(); 
}

// =========
// AMÉLIORATION AFFICHAGE MATIERES AVEC GESTION DU TEMPS
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
            const status = obj.fait ? 
                (obj.dateRealisation && new Date(obj.dateRealisation) <= new Date(obj.dateEcheance) ? 
                    '<span style="color: var(--success); font-size: 0.8rem;">✅ Dans les temps</span>' : 
                    '<span style="color: var(--warning); font-size: 0.8rem;">⚠️ En retard</span>') : 
                `<span style="color: var(--text-secondary); font-size: 0.8rem;">⏳ ${formatDate(obj.dateEcheance)}</span>`;
            
            html += `
                <div class="objectif-item">
                    <div class="objectif-text ${textClass}" id="obj-text-${obj.id}">
                        <i class="${isChecked}"></i>
                        <div style="flex: 1;">
                            <div>${obj.texte}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary);">
                                    <i class="fas fa-clock"></i> ${obj.heuresEstimees || 0}h
                                    ${obj.heuresReelles ? ` (réel: ${obj.heuresReelles}h)` : ''}
                                </span>
                                ${status}
                            </div>
                        </div>
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
// AJOUT DE MATIÈRE AVEC GESTION DU TEMPS
// =========
function GnererBtn() {
    const nb = parseInt(document.getElementById("nbObjectifs").value, 10);
    if (isNaN(nb) || nb <= 0) return showToast("Nombre d'objectifs invalide", "error");
    const liste = document.getElementById("listeObjectifs");
    liste.innerHTML = "<label style='display: block; margin-bottom: 10px; font-weight: 500;'><i class='fas fa-list-check'></i> Objectifs:</label>";
    
    const dateDebut = new Date(document.getElementById("dateDebut").value);
    const dateFin = new Date(document.getElementById("dateFin").value);
    const joursTotal = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)) + 1;
    
    if (isNaN(joursTotal) || joursTotal <= 0) {
        showToast("Veuillez d'abord définir les dates de début et fin", "error");
        return;
    }
    
    // Répartir les objectifs sur la période
    const interval = Math.floor(joursTotal / nb);
    
    for (let i = 0; i < nb; i++) {
        const objectifDiv = document.createElement('div');
        objectifDiv.style.cssText = "margin-bottom: 15px; padding: 15px; background: var(--bg-main); border-radius: 8px;";
        
        // Calculer la date d'échéance
        const dateEcheance = new Date(dateDebut);
        dateEcheance.setDate(dateDebut.getDate() + (i * interval));
        const dateEcheanceStr = dateEcheance.toISOString().split('T')[0];
        
        objectifDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; align-items: end;">
                <div>
                    <label style="font-size: 0.9rem; color: var(--text-secondary);">Objectif ${i + 1}</label>
                    <input type="text" class="objectif-input" placeholder="Description de l'objectif" 
                           style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px;">
                </div>
                <div>
                    <label style="font-size: 0.9rem; color: var(--text-secondary);">Heures</label>
                    <input type="number" class="objectif-heures" value="1" min="0.5" step="0.5"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px;">
                </div>
                <div>
                    <label style="font-size: 0.9rem; color: var(--text-secondary);">Échéance</label>
                    <input type="date" class="objectif-echeance" value="${dateEcheanceStr}"
                           style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px;">
                </div>
            </div>
        `;
        liste.appendChild(objectifDiv);
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
    
    const inputsText = document.querySelectorAll('#listeObjectifs input.objectif-input');
    const inputsHeures = document.querySelectorAll('#listeObjectifs input.objectif-heures');
    const inputsEcheance = document.querySelectorAll('#listeObjectifs input.objectif-echeance');
    
    const objectifs = [];
    for (let i = 0; i < inputsText.length; i++) {
        const t = inputsText[i].value.trim();
        const heuresEstimees = parseFloat(inputsHeures[i].value);
        const dateEcheance = inputsEcheance[i].value;
        
        if (t && !isNaN(heuresEstimees) && dateEcheance) {
            objectifs.push({ 
                id: "obj_" + Date.now() + "_" + i, 
                texte: t, 
                fait: false,
                heuresEstimees: heuresEstimees,
                dateEcheance: dateEcheance
            });
        }
    }
    
    if (!nom) return showToast("Nom de la matière requis", "error");
    if (!debut || !fin) return showToast("Dates requises", "error");
    if (isNaN(heures) || heures <= 0) return showToast("Heures/jour invalide", "error");
    if (objectifs.length === 0) return showToast("Au moins un objectif valide requis", "error");
    
    session.push({ 
        id: Date.now(), 
        nom, 
        dateDebut: debut, 
        dateFin: fin, 
        heuresParJour: heures, 
        couleur, 
        objectifs 
    });
    
    localStorage.setItem(SKEY, JSON.stringify(session));
    refreshAll();
    
    // Réinitialiser le formulaire
    m.value = ''; 
    d1.value = ''; 
    d2.value = ''; 
    h.value = ''; 
    c.value = '#4f46e5';
    document.getElementById("nbObjectifs").value = '';
    document.getElementById("listeObjectifs").innerHTML = '';
    document.getElementById("btnAjouterMatiere")?.classList.add("hidden");
    
    showToast("Matière ajoutée avec planning !", "success");
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

// =========
// MODALS POUR LA GESTION DU TEMPS
// =========

function openMarkDoneModal(matiereId, objectifId, heuresEstimees = 1) {
    currentMatiereId = matiereId;
    currentObjectifId = objectifId;
    
    document.getElementById('realHoursInput').value = heuresEstimees;
    document.getElementById('completionDate').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('markDoneModal').classList.remove('hidden');
}

function closeMarkDoneModal() {
    document.getElementById('markDoneModal').classList.add('hidden');
    currentObjectifId = null;
    currentMatiereId = null;
}

function confirmMarkAsDone() {
    const heuresReelles = parseFloat(document.getElementById('realHoursInput').value);
    const dateRealisation = document.getElementById('completionDate').value;
    
    if (!heuresReelles || heuresReelles <= 0) {
        showToast("Veuillez entrer un nombre d'heures valide", "error");
        return;
    }
    
    if (!dateRealisation) {
        showToast("Veuillez sélectionner une date de réalisation", "error");
        return;
    }
    
    let objetifTrouve = null;
    session.forEach(m => {
        if (m.id === currentMatiereId) {
            const obj = m.objectifs.find(o => o.id === currentObjectifId);
            if (obj) {
                objetifTrouve = obj;
                obj.fait = true;
                obj.dateRealisation = dateRealisation;
                obj.heuresReelles = heuresReelles;
            }
        }
    });
    
    if (objetifTrouve) {
        localStorage.setItem(SKEY, JSON.stringify(session));
        refreshAll();
        closeMarkDoneModal();
        
        const dansLesTemps = new Date(dateRealisation) <= new Date(objetifTrouve.dateEcheance);
        showToast(
            `Objectif marqué comme terminé ! ${dansLesTemps ? '✅ Dans les temps' : '⚠️ En retard'}`,
            dansLesTemps ? "success" : "warning"
        );
    }
}

// =========
// FONCTION TOGGLEFAIT AMÉLIORÉE
// =========

function toggleFait(matiereId, objetifId) {
    let objetifTrouve = null;
    
    session.forEach(m => {
        if (m.id === matiereId) {
            const obj = m.objectifs.find(o => o.id === objetifId);
            if (obj) {
                objetifTrouve = obj;
                if (!obj.fait) {
                    openMarkDoneModal(matiereId, objetifId, obj.heuresEstimees || 1);
                } else {
                    showConfirmUndoModal(matiereId, objetifId, obj.texte);
                }
            }
        }
    });
}

// =========
// MODAL DE CONFIRMATION POUR ANNULER
// =========

function showConfirmUndoModal(matiereId, objetifId, objectifText) {
    document.getElementById('confirmMessage').innerHTML = `
        <strong style="color: var(--warning);">↩️ Revenir en arrière</strong><br>
        Marquer "<em>${objectifText}</em>" comme non terminé ?<br>
        <small style="color: var(--text-secondary);">Le temps passé sera réinitialisé.</small>
    `;
    
    deleteCallback = () => {
        session.forEach(m => {
            if (m.id === matiereId) {
                const obj = m.objectifs.find(o => o.id === objetifId);
                if (obj) {
                    obj.fait = false;
                    obj.dateRealisation = null;
                    obj.heuresReelles = null;
                }
            }
        });
        localStorage.setItem(SKEY, JSON.stringify(session));
        refreshAll();
        showToast("Objectif marqué comme non terminé", "info");
    };
    
    document.getElementById('confirmModal').classList.remove('hidden');
}

// =========
// FONCTION MARQUERCOMMEFAIT AMÉLIORÉE (pour le calendrier)
// =========

function marquerCommeFait(objectifId) {
    let objetifTrouve = null;
    let matiereTrouvee = null;
    
    session.forEach(matiere => {
        matiere.objectifs.forEach(obj => {
            if (obj.id === objectifId) {
                objetifTrouve = obj;
                matiereTrouvee = matiere;
            }
        });
    });
    
    if (objetifTrouve && !objetifTrouve.fait) {
        openMarkDoneModal(matiereTrouvee.id, objectifId, objetifTrouve.heuresEstimees || 1);
    }
}

// =========
// ÉDITION D'OBJECTIF AMÉLIORÉE
// =========

function editObjectif(matiereId, objetifId) {
    let objectif = null;
    for (const matiere of session) {
        const obj = matiere.objectifs.find(o => o.id === objetifId);
        if (obj) { 
            objectif = obj; 
            break;
        }
    }
    
    if (!objectif) return;
    
    currentMatiereId = matiereId;
    currentObjectifId = objetifId;
    
    document.getElementById('editObjText').value = objectif.texte;
    document.getElementById('editObjHeures').value = objectif.heuresEstimees || 1;
    document.getElementById('editObjEcheance').value = objectif.dateEcheance || '';
    document.getElementById('editObjPriority').value = objectif.priorite || 'medium';
    
    document.getElementById('editObjectifModal').classList.remove('hidden');
}

function closeEditObjectifModal() {
    document.getElementById('editObjectifModal').classList.add('hidden');
    currentMatiereId = null;
    currentObjectifId = null;
}

function saveObjectifEdit() {
    const texte = document.getElementById('editObjText').value.trim();
    const heures = parseFloat(document.getElementById('editObjHeures').value);
    const echeance = document.getElementById('editObjEcheance').value;
    const priorite = document.getElementById('editObjPriority').value;
    
    if (!texte) {
        showToast("La description est requise", "error");
        return;
    }
    
    if (!heures || heures <= 0) {
        showToast("Veuillez entrer un nombre d'heures valide", "error");
        return;
    }
    
    if (!echeance) {
        showToast("Veuillez sélectionner une date d'échéance", "error");
        return;
    }
    
    let found = false;
    session.forEach(m => {
        if (m.id === currentMatiereId) {
            const obj = m.objectifs.find(o => o.id === currentObjectifId);
            if (obj) {
                obj.texte = texte;
                obj.heuresEstimees = heures;
                obj.dateEcheance = echeance;
                obj.priorite = priorite;
                found = true;
            }
        }
    });
    
    if (found) {
        localStorage.setItem(SKEY, JSON.stringify(session));
        closeEditObjectifModal();
        refreshAll();
        showToast("Objectif modifié avec succès", "success");
    }
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

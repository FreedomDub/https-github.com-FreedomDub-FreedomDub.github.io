// Конфигурация системы
const GITHUB_REPO = 'FreedomDub/FreedomDub.github.io';
const GITHUB_FILE = 'data.json';
const GITHUB_TOKEN = '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'; // Замените на реальный токен

// Безопасное хранение паролей администраторов
const ADMIN_PASSWORD = '22102020Freedom';

// Роли пользователей
const USER_ROLES = {
    GUEST: 'guest',
    VIEWER: 'viewer',
    ADMIN: 'admin'
};

// Конфигурация чат-бота
const ADMIN_TG_LINK = '@dieformettall';
const BACKUP_ADMIN_TG = '@rarumkameow';
const BOT_NAME = 'FreedomDub Бот';

// Состояние приложения
let appData = {
    users: [
        { 
            id: 1,
            email: 'admin@freedomdub.com', 
            password: ADMIN_PASSWORD, 
            role: USER_ROLES.ADMIN, 
            name: 'Главный Администратор' 
        }
    ],
    teamMembers: [
        { id: 1, name: 'Алексей Петров', role: 'Актёр озвучки', projects: ['Проект 1'] }
    ],
    projects: [
        {
            id: 1,
            title: "Проект 1",
            description: "Описание проекта 1",
            episodes: [],
            status: "в работе",
            created: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString().split('T')[0]
        }
    ],
    pendingVacancies: [],
    chatHistory: [],
    lastUpdate: Date.now()
};

let isAdmin = false;
let currentUser = { name: 'Гость', role: USER_ROLES.GUEST };
let lastUpdateTime = 0;
let chatAdminMode = false;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Загружаем данные
    loadFromLocalStorage();
    await loadFromGitHub();
    
    // Инициализация интерфейса
    initUI();
    setupEventListeners();
    initChatBot();
    
    // Периодическая проверка обновлений
    setInterval(checkForUpdates, 30000);
});

// ========== Функции работы с данными ==========
async function loadFromGitHub() {
    try {
        showNotification('Загрузка данных с GitHub...');
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showNotification('Файл данных не найден, будет создан при первом сохранении');
                return;
            }
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const content = atob(data.content);
        const remoteData = JSON.parse(content);
        
        if (remoteData.lastUpdate > lastUpdateTime) {
            appData = remoteData;
            lastUpdateTime = remoteData.lastUpdate;
            
            isAdmin = localStorage.getItem('freedomdub-is-admin') === 'true' || false;
            currentUser = JSON.parse(localStorage.getItem('freedomdub-current-user')) || { 
                name: 'Гость', 
                role: USER_ROLES.GUEST 
            };
            
            saveToLocalStorage();
            updateUI();
            showNotification('Данные успешно загружены с GitHub');
        }
    } catch (error) {
        console.error('Ошибка при загрузке с GitHub:', error);
        showNotification('Ошибка при загрузке данных с GitHub. Используются локальные данные.', true);
    }
}

async function saveToGitHub() {
    if (!isAdmin) {
        showNotification('Только администратор может сохранять', true);
        return;
    }
    
    try {
        showNotification('Сохранение на GitHub...');
        
        appData.lastUpdate = Date.now();
        
        let sha = null;
        try {
            const getResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`);
            if (getResponse.ok) {
                const data = await getResponse.json();
                sha = data.sha;
            }
        } catch (e) {}
        
        const content = btoa(JSON.stringify(appData, null, 2));
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                message: 'Обновление данных FreedomDub',
                content: content,
                sha: sha
            })
        });
        
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        
        lastUpdateTime = appData.lastUpdate;
        saveToLocalStorage();
        showNotification('Данные успешно сохранены на GitHub');
        document.getElementById('githubStatus').textContent = 'Последнее сохранение: ' + new Date().toLocaleString();
    } catch (error) {
        console.error('Ошибка при сохранении на GitHub:', error);
        showNotification('Ошибка при сохранении на GitHub', true);
        document.getElementById('githubStatus').textContent = 'Ошибка: ' + error.message;
    }
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('freedomdub-data');
    if (savedData) {
        const localData = JSON.parse(savedData);
        if (localData.lastUpdate > lastUpdateTime) {
            appData = localData;
            lastUpdateTime = localData.lastUpdate;
        }
    }
    
    isAdmin = localStorage.getItem('freedomdub-is-admin') === 'true' || false;
    currentUser = JSON.parse(localStorage.getItem('freedomdub-current-user')) || { 
        name: 'Гость', 
        role: USER_ROLES.GUEST 
    };
}

function saveToLocalStorage() {
    localStorage.setItem('freedomdub-data', JSON.stringify(appData));
    localStorage.setItem('freedomdub-is-admin', isAdmin.toString());
    localStorage.setItem('freedomdub-current-user', JSON.stringify(currentUser));
}

// ========== Основные функции системы ==========
function initUI() {
    updateUI();
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
}

function setupEventListeners() {
    document.getElementById('auth-btn').addEventListener('click', () => {
        document.getElementById('auth-modal').style.display = 'flex';
    });
    
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
    
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        register();
    });
    
    document.getElementById('add-project-btn').addEventListener('click', () => {
        openProjectModal(null, 'create');
    });
    
    document.getElementById('manage-team-btn').addEventListener('click', () => {
        document.getElementById('team-modal').style.display = 'flex';
        renderTeamManagement();
    });
    
    document.getElementById('sync-data-btn').addEventListener('click', async () => {
        await checkForUpdates();
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function updateUI() {
    const addProjectBtn = document.getElementById('add-project-btn');
    const manageTeamBtn = document.getElementById('manage-team-btn');
    const userMenu = document.getElementById('user-menu');
    
    addProjectBtn.style.display = checkPermission(USER_ROLES.ADMIN) ? 'block' : 'none';
    manageTeamBtn.style.display = checkPermission(USER_ROLES.ADMIN) ? 'block' : 'none';
    
    if (currentUser.role !== USER_ROLES.GUEST) {
        const badgeClass = 
            currentUser.role === USER_ROLES.ADMIN ? 'badge-admin' :
            currentUser.role === USER_ROLES.VIEWER ? 'badge-viewer' : 'badge-guest';
        
        userMenu.innerHTML = `
            <div class="user-info">
                <span>${currentUser.name}</span>
                <span class="user-badge ${badgeClass}">${
                    currentUser.role === USER_ROLES.ADMIN ? 'Админ' : 
                    currentUser.role === USER_ROLES.VIEWER ? 'Редактор' : 'Гость'
                }</span>
                <button id="logout-btn" class="btn btn-secondary">Выйти</button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
        userMenu.innerHTML = '<button id="auth-btn" class="btn btn-secondary">Вход / Регистрация</button>';
        document.getElementById('auth-btn').addEventListener('click', () => {
            document.getElementById('auth-modal').style.display = 'flex';
        });
    }
    
    renderProjects();
    renderTeam();
    
    if (isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
    } else {
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    }
}

function checkPermission(requiredRole) {
    const roleHierarchy = {
        [USER_ROLES.GUEST]: 0,
        [USER_ROLES.VIEWER]: 1,
        [USER_ROLES.ADMIN]: 2
    };
    
    return roleHierarchy[currentUser.role] >= roleHierarchy[requiredRole];
}

// ========== Функции работы с проектами ==========
function renderProjects() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) return;
    
    projectsContainer.innerHTML = appData.projects.map(project => `
        <div class="project-card" data-id="${project.id}">
            <div class="project-image">
                <span>${project.title.charAt(0)}</span>
                <span class="project-status ${project.status === 'завершено' ? 'status-complete' : 
                    project.status === 'в работе' ? 'status-in-progress' : ''}">${project.status}</span>
            </div>
            <div class="project-info">
                <h3>${project.title}</h3>
                <p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #636e72;">${project.description}</p>
                <div class="project-meta">
                    <span>Обновлено: ${formatDate(project.updated)}</span>
                </div>
                <button class="btn btn-secondary" data-action="view">Просмотр</button>
                ${checkPermission(USER_ROLES.VIEWER) ? 
                    `<button class="btn" data-action="edit" style="margin-left: 0.5rem;">Редактировать</button>` : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('[data-action="view"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = parseInt(this.closest('.project-card').dataset.id);
            openProjectModal(projectId, 'view');
        });
    });
    
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = parseInt(this.closest('.project-card').dataset.id);
            openProjectModal(projectId, 'edit');
        });
    });
}

function openProjectModal(projectId, mode) {
    const modal = document.getElementById('project-modal');
    const modalTitle = document.getElementById('modal-project-title');
    const modalContent = document.getElementById('project-modal-content');
    
    if (!modal || !modalTitle || !modalContent) return;
    
    if (mode === 'create') {
        modalTitle.textContent = 'Создать новый проект';
        
        modalContent.innerHTML = `
            <form id="project-form">
                <div style="margin-bottom: 1rem;">
                    <label for="project-title">Название проекта</label>
                    <input type="text" id="project-title" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="project-description">Описание</label>
                    <textarea id="project-description" required></textarea>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label for="project-status">Статус</label>
                    <select id="project-status">
                        <option value="в работе">В работе</option>
                        <option value="завершено">Завершено</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label for="project-video">Видео файл</label>
                    <input type="file" id="project-video" accept="video/*">
                </div>
                <button type="submit" class="btn">Создать проект</button>
            </form>
        `;
        
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            createProject();
        });
    } else {
        const project = appData.projects.find(p => p.id === projectId);
        if (!project) return;
        
        modalTitle.textContent = project.title;
        
        if (mode === 'view') {
            modalContent.innerHTML = `
                <p><strong>Описание:</strong> ${project.description}</p>
                <p><strong>Статус:</strong> <span class="${project.status === 'завершено' ? 'status-complete' : 
                    project.status === 'в работе' ? 'status-in-progress' : ''}">${project.status}</span></p>
                <p><strong>Создан:</strong> ${formatDate(project.created)}</p>
                <p><strong>Обновлен:</strong> ${formatDate(project.updated)}</p>
                
                ${project.videoUrl ? `
                    <div style="margin-top: 1rem;">
                        <video controls style="width: 100%; max-height: 300px;">
                            <source src="${project.videoUrl}" type="video/mp4">
                        </video>
                    </div>
                ` : ''}
                
                ${checkPermission(USER_ROLES.VIEWER) ? `
                    <div style="margin-top: 1.5rem;">
                        <button class="btn" id="edit-project-btn">Редактировать проект</button>
                    </div>
                ` : ''}
            `;
            
            if (checkPermission(USER_ROLES.VIEWER)) {
                document.getElementById('edit-project-btn').addEventListener('click', () => {
                    openProjectModal(projectId, 'edit');
                });
            }
        } else if (mode === 'edit') {
            modalContent.innerHTML = `
                <form id="project-form">
                    <div style="margin-bottom: 1rem;">
                        <label for="project-title">Название проекта</label>
                        <input type="text" id="project-title" value="${project.title}" required>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label for="project-description">Описание</label>
                        <textarea id="project-description" required>${project.description}</textarea>
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label for="project-status">Статус</label>
                        <select id="project-status">
                            <option value="в работе" ${project.status === 'в работе' ? 'selected' : ''}>В работе</option>
                            <option value="завершено" ${project.status === 'завершено' ? 'selected' : ''}>Завершено</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label for="project-video">Видео файл</label>
                        <input type="file" id="project-video" accept="video/*">
                        ${project.videoUrl ? `
                            <div style="margin-top: 0.5rem;">
                                <video controls style="width: 100%; max-height: 150px;">
                                    <source src="${project.videoUrl}" type="video/mp4">
                                </video>
                            </div>
                        ` : ''}
                    </div>
                    <button type="submit" class="btn">Сохранить изменения</button>
                </form>
            `;
            
            document.getElementById('project-form').addEventListener('submit', (e) => {
                e.preventDefault();
                updateProject(projectId);
            });
        }
    }
    
    modal.style.display = 'flex';
}

function createProject() {
    const title = document.getElementById('project-title').value;
    const description = document.getElementById('project-description').value;
    const status = document.getElementById('project-status').value;
    const videoFile = document.getElementById('project-video').files[0];
    
    if (!title || !description) {
        showNotification('Заполните все обязательные поля', true);
        return;
    }
    
    // В реальном приложении видео бы загружалось на сервер
    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : null;
    
    const newProject = {
        id: appData.projects.length > 0 ? Math.max(...appData.projects.map(p => p.id)) + 1 : 1,
        title,
        description,
        status,
        videoUrl,
        episodes: [],
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0]
    };
    
    appData.projects.push(newProject);
    saveToLocalStorage();
    renderProjects();
    document.getElementById('project-modal').style.display = 'none';
    showNotification('Проект успешно создан');
    
    syncDataWithAllUsers();
}

function updateProject(projectId) {
    const title = document.getElementById('project-title').value;
    const description = document.getElementById('project-description').value;
    const status = document.getElementById('project-status').value;
    const videoFile = document.getElementById('project-video').files[0];
    
    if (!title || !description) {
        showNotification('Заполните все обязательные поля', true);
        return;
    }
    
    const projectIndex = appData.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;
    
    // Сохраняем старое видео, если новое не загружено
    const oldVideoUrl = appData.projects[projectIndex].videoUrl;
    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : oldVideoUrl;
    
    appData.projects[projectIndex] = {
        ...appData.projects[projectIndex],
        title,
        description,
        status,
        videoUrl,
        updated: new Date().toISOString().split('T')[0]
    };
    
    saveToLocalStorage();
    renderProjects();
    document.getElementById('project-modal').style.display = 'none';
    showNotification('Проект успешно обновлен');
    
    syncDataWithAllUsers();
}

// ========== Функции работы с командой ==========
function renderTeam() {
    const teamContainer = document.getElementById('team-container');
    if (!teamContainer) return;
    
    teamContainer.innerHTML = appData.teamMembers.map(member => `
        <div class="team-member">
            ${checkPermission(USER_ROLES.ADMIN) ? 
                `<button class="edit-member-btn" data-member-id="${member.id}">✏️</button>` : ''}
            <h3>${member.name}</h3>
            <p class="member-role">${member.role}</p>
            ${member.projects && member.projects.length > 0 ? 
                `<p class="member-projects">Проекты: ${member.projects.join(', ')}</p>` : ''}
        </div>
    `).join('');
    
    if (checkPermission(USER_ROLES.ADMIN)) {
        document.querySelectorAll('.edit-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const memberId = parseInt(btn.dataset.memberId);
                openTeamMemberModal(memberId);
            });
        });
    }
}

function renderTeamManagement() {
    const teamModalContent = document.getElementById('team-modal-content');
    
    if (!teamModalContent) return;
    
    teamModalContent.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <button class="btn" onclick="openTeamMemberModal(null)">Добавить участника</button>
        </div>
        <div class="team-grid">
            ${appData.teamMembers.map(member => `
                <div class="team-member">
                    <button class="edit-member-btn" data-member-id="${member.id}">✏️</button>
                    <h3>${member.name}</h3>
                    <p class="member-role">${member.role}</p>
                    ${member.projects && member.projects.length > 0 ? 
                        `<p class="member-projects">Проекты: ${member.projects.join(', ')}</p>` : ''}
                    <button class="btn btn-secondary" style="margin-top: 0.5rem;" 
                        onclick="deleteTeamMember(${member.id})">Удалить</button>
                </div>
            `).join('')}
        </div>
    `;
}

function openTeamMemberModal(memberId) {
    const modal = document.getElementById('team-modal');
    const modalContent = document.getElementById('team-modal-content');
    
    if (!modal || !modalContent) return;
    
    if (memberId === null) {
        // Создание нового участника
        modalContent.innerHTML = `
            <h3>Добавить участника команды</h3>
            <form id="team-member-form">
                <div style="margin-bottom: 1rem;">
                    <label for="member-name">Имя</label>
                    <input type="text" id="member-name" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="member-role">Роль</label>
                    <input type="text" id="member-role" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label for="member-projects">Проекты (через запятую)</label>
                    <input type="text" id="member-projects">
                </div>
                <button type="submit" class="btn">Сохранить</button>
            </form>
        `;
        
        document.getElementById('team-member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            createTeamMember();
        });
    } else {
        // Редактирование существующего участника
        const member = appData.teamMembers.find(m => m.id === memberId);
        if (!member) return;
        
        modalContent.innerHTML = `
            <h3>Редактировать участника команды</h3>
            <form id="team-member-form">
                <div style="margin-bottom: 1rem;">
                    <label for="member-name">Имя</label>
                    <input type="text" id="member-name" value="${member.name}" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="member-role">Роль</label>
                    <input type="text" id="member-role" value="${member.role}" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label for="member-projects">Проекты (через запятую)</label>
                    <input type="text" id="member-projects" value="${member.projects ? member.projects.join(', ') : ''}">
                </div>
                <button type="submit" class="btn">Сохранить изменения</button>
            </form>
        `;
        
        document.getElementById('team-member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            updateTeamMember(memberId);
        });
    }
    
    modal.style.display = 'flex';
}

function createTeamMember() {
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    const projectsInput = document.getElementById('member-projects').value;
    
    if (!name || !role) {
        showNotification('Заполните все обязательные поля', true);
        return;
    }
    
    const projects = projectsInput.split(',').map(p => p.trim()).filter(p => p);
    
    const newMember = {
        id: appData.teamMembers.length > 0 ? Math.max(...appData.teamMembers.map(m => m.id)) + 1 : 1,
        name,
        role,
        projects
    };
    
    appData.teamMembers.push(newMember);
    saveToLocalStorage();
    renderTeam();
    renderTeamManagement();
    document.getElementById('team-modal').style.display = 'none';
    showNotification('Участник команды успешно добавлен');
    
    syncDataWithAllUsers();
}

function updateTeamMember(memberId) {
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    const projectsInput = document.getElementById('member-projects').value;
    
    if (!name || !role) {
        showNotification('Заполните все обязательные поля', true);
        return;
    }
    
    const projects = projectsInput.split(',').map(p => p.trim()).filter(p => p);
    
    const memberIndex = appData.teamMembers.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return;
    
    appData.teamMembers[memberIndex] = {
        ...appData.teamMembers[memberIndex],
        name,
        role,
        projects
    };
    
    saveToLocalStorage();
    renderTeam();
    renderTeamManagement();
    document.getElementById('team-modal').style.display = 'none';
    showNotification('Участник команды успешно обновлен');
    
    syncDataWithAllUsers();
}

function deleteTeamMember(memberId) {
    if (!confirm('Вы уверены, что хотите удалить этого участника команды?')) return;
    
    appData.teamMembers = appData.teamMembers.filter(m => m.id !== memberId);
    saveToLocalStorage();
    renderTeam();
    renderTeamManagement();
    showNotification('Участник команды удален');
    
    syncDataWithAllUsers();
}

// ========== Функции авторизации ==========
function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const user = appData.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = {
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        isAdmin = user.role === USER_ROLES.ADMIN;
        
        saveToLocalStorage();
        updateUI();
        document.getElementById('auth-modal').style.display = 'none';
        showNotification(`Добро пожаловать, ${user.name}!`);
        
        if (isAdmin) {
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';
        }
    } else {
        showNotification('Неверный email или пароль', true);
    }
}

function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', true);
        return;
    }
    
    if (appData.users.some(u => u.email === email)) {
        showNotification('Пользователь с таким email уже существует', true);
        return;
    }
    
    const newUser = {
        id: appData.users.length > 0 ? Math.max(...appData.users.map(u => u.id)) + 1 : 1,
        name,
        email,
        password: password,
        role: USER_ROLES.VIEWER
    };
    
    appData.users.push(newUser);
    currentUser = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
    };
    
    saveToLocalStorage();
    updateUI();
    document.getElementById('auth-modal').style.display = 'none';
    showNotification(`Регистрация успешна, ${name}!`);
}

function loginAsAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        const adminUser = appData.users.find(u => u.role === USER_ROLES.ADMIN);
        
        if (adminUser) {
            isAdmin = true;
            currentUser = { 
                name: adminUser.name, 
                email: adminUser.email,
                role: USER_ROLES.ADMIN 
            };
            
            saveToLocalStorage();
            updateUI();
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';
            showNotification('Вы вошли как администратор');
            
            syncDataWithAllUsers();
        }
    } else {
        showNotification('Неверный пароль', true);
    }
}

function logout() {
    currentUser = { name: 'Гость', role: USER_ROLES.GUEST };
    isAdmin = false;
    
    saveToLocalStorage();
    updateUI();
    showNotification('Вы вышли из системы');
}

function logoutAdmin() {
    isAdmin = false;
    currentUser = { name: 'Гость', role: USER_ROLES.GUEST };
    
    saveToLocalStorage();
    updateUI();
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    showNotification('Вы вышли из административного режима');
}

// ========== Функции чат-бота ==========
function initChatBot() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatContainer = document.getElementById('chat-container');
    const chatHeader = document.getElementById('chat-header');
    const closeChat = document.getElementById('close-chat');
    
    chatToggle.addEventListener('click', toggleChat);
    chatHeader.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);
    
    initChat();
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('open');
}

function initChat() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const fileUpload = document.getElementById('file-upload');
    const vacancyForm = document.getElementById('vacancy-form');
    const submitVacancyBtn = document.getElementById('submit-vacancy');
    
    const botResponses = {
        "привет": "Привет! Как я могу вам помочь?",
        "как дела": "У меня всё отлично! Готов помочь вам с любыми вопросами.",
        "вакансии": "У нас есть вакансии актёров озвучки, звукорежиссёров и переводчиков. Хотите подать заявку?",
        "контакты": `Вы можете связаться с администратором в Telegram: ${ADMIN_TG_LINK}`,
        "помощь": "Я могу ответить на вопросы о вакансиях, принять вашу заявку или передать файлы администратору. Спросите меня о чём-нибудь!",
        "спасибо": "Пожалуйста! Обращайтесь, если будут ещё вопросы.",
        "админ": "Для входа в режим администратора нужен пароль."
    };
    
    loadChatHistory();
    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    fileUpload.addEventListener('change', handleFileUpload);
    submitVacancyBtn.addEventListener('click', submitVacancy);
    
    window.botResponses = botResponses;
}

function sendMessage() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessage(message, 'user');
    userInput.value = '';
    
    processUserMessage(message);
}

function addMessage(text, sender, isMedia = false, mediaType = null, mediaUrl = null) {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.textContent = text;
    } else if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
        messageDiv.innerHTML = `<strong>${BOT_NAME}:</strong> ${text}`;
    } else if (sender === 'admin') {
        messageDiv.classList.add('admin-message');
        messageDiv.innerHTML = `<strong>Админ:</strong> ${text}`;
    }
    
    if (isMedia) {
        const mediaElement = createMediaElement(mediaType, mediaUrl);
        messageDiv.appendChild(mediaElement);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    saveMessageToHistory(text, sender, isMedia, mediaType, mediaUrl);
}

function createMediaElement(mediaType, mediaUrl) {
    const container = document.createElement('div');
    
    if (mediaType.startsWith('image')) {
        const img = document.createElement('img');
        img.src = mediaUrl;
        img.classList.add('media-message');
        container.appendChild(img);
    } else if (mediaType.startsWith('video')) {
        const video = document.createElement('video');
        video.src = mediaUrl;
        video.controls = true;
        video.classList.add('media-message');
        container.appendChild(video);
    } else if (mediaType.startsWith('audio')) {
        const audio = document.createElement('audio');
        audio.src = mediaUrl;
        audio.controls = true;
        container.appendChild(audio);
    } else {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.textContent = 'Скачать файл';
        link.target = '_blank';
        container.appendChild(link);
    }
    
    return container;
}

function processUserMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.startsWith('/admin ')) {
        const password = message.substring(7).trim();
        if (password === ADMIN_PASSWORD) {
            chatAdminMode = true;
            addMessage('Режим администратора активирован. Теперь вы можете просматривать и обрабатывать заявки.', 'bot');
            showPendingVacancies();
            return;
        } else {
            addMessage('Неверный пароль администратора.', 'bot');
            return;
        }
    }
    
    if (lowerMessage === '/exit' && chatAdminMode) {
        chatAdminMode = false;
        addMessage('Режим администратора деактивирован.', 'bot');
        return;
    }
    
    if (chatAdminMode) {
        if (lowerMessage.startsWith('/approve ')) {
            const vacancyId = parseInt(message.substring(9).trim());
            approveVacancy(vacancyId);
            return;
        } else if (lowerMessage.startsWith('/reject ')) {
            const vacancyId = parseInt(message.substring(8).trim());
            rejectVacancy(vacancyId);
            return;
        }
    }
    
    if (window.botResponses[lowerMessage]) {
        setTimeout(() => {
            addMessage(window.botResponses[lowerMessage], 'bot');
            
            if (lowerMessage.includes('ваканси')) {
                setTimeout(() => {
                    addMessage('Хотите подать заявку на вакансию? Напишите "да" чтобы продолжить.', 'bot');
                }, 500);
            }
        }, 500);
        return;
    }
    
    if (lowerMessage === 'да' && document.getElementById('chat-messages').lastChild.textContent.includes('вакансию')) {
        showVacancyForm();
        return;
    }
    
    setTimeout(() => {
        addMessage('Я не совсем понял ваш вопрос. Можете переформулировать? Или напишите "помощь" чтобы увидеть список доступных команд.', 'bot');
    }, 500);
}

function showVacancyForm() {
    const vacancyForm = document.getElementById('vacancy-form');
    vacancyForm.style.display = 'block';
    addMessage('Пожалуйста, заполните форму ниже. После отправки администратор рассмотрит вашу заявку и свяжется с вами.', 'bot');
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

function submitVacancy() {
    const name = document.getElementById('vacancy-name').value.trim();
    const role = document.getElementById('vacancy-role').value.trim();
    const message = document.getElementById('vacancy-message').value.trim();
    
    if (!name || !role || !message) {
        addMessage('Пожалуйста, заполните все поля формы.', 'bot');
        return;
    }
    
    const vacancy = {
        id: Date.now(),
        name,
        role,
        message,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    appData.pendingVacancies.push(vacancy);
    document.getElementById('vacancy-form').style.display = 'none';
    document.getElementById('vacancy-name').value = '';
    document.getElementById('vacancy-role').value = '';
    document.getElementById('vacancy-message').value = '';
    
    addMessage(`Ваша заявка на роль "${role}" отправлена на рассмотрение. Мы свяжемся с вами, когда администратор её проверит.`, 'bot');
    
    if (chatAdminMode) {
        showPendingVacancies();
    } else {
        saveVacancyToStorage(vacancy);
    }
}

function showPendingVacancies() {
    const vacanciesToShow = chatAdminMode ? appData.pendingVacancies : appData.pendingVacancies.filter(v => v.status === 'pending');
    
    if (vacanciesToShow.length === 0) {
        addMessage('Нет заявок, ожидающих рассмотрения.', 'bot');
        return;
    }
    
    addMessage(`Есть ${vacanciesToShow.length} заявок на рассмотрении:`, 'bot');
    
    vacanciesToShow.forEach(vacancy => {
        const vacancyMessage = `
            <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                <strong>ID:</strong> ${vacancy.id}<br>
                <strong>Имя:</strong> ${vacancy.name}<br>
                <strong>Роль:</strong> ${vacancy.role}<br>
                <strong>Сообщение:</strong> ${vacancy.message}<br>
                <strong>Дата:</strong> ${new Date(vacancy.timestamp).toLocaleString()}
                ${chatAdminMode ? `
                <div class="action-buttons">
                    <button class="approve-btn" onclick="approveVacancy(${vacancy.id})">Принять</button>
                    <button class="reject-btn" onclick="rejectVacancy(${vacancy.id})">Отклонить</button>
                </div>
                ` : ''}
            </div>
        `;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        messageDiv.innerHTML = vacancyMessage;
        document.getElementById('chat-messages').appendChild(messageDiv);
    });
    
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

function approveVacancy(vacancyId) {
    const vacancyIndex = appData.pendingVacancies.findIndex(v => v.id === vacancyId);
    if (vacancyIndex === -1) return;
    
    appData.pendingVacancies[vacancyIndex].status = 'approved';
    
    addMessage(`Заявка #${vacancyId} одобрена. Пользователь получит ссылку на администратора.`, 'admin');
    
    setTimeout(() => {
        addMessage(`Ваша заявка одобрена! Свяжитесь с администратором в Telegram: ${ADMIN_TG_LINK}`, 'bot');
    }, 1000);
    
    updateVacancyInStorage(vacancyId, 'approved');
}

function rejectVacancy(vacancyId) {
    const vacancyIndex = appData.pendingVacancies.findIndex(v => v.id === vacancyId);
    if (vacancyIndex === -1) return;
    
    appData.pendingVacancies[vacancyIndex].status = 'rejected';
    
    addMessage(`Заявка #${vacancyId} отклонена.`, 'admin');
    
    setTimeout(() => {
        addMessage('К сожалению, ваша заявка была отклонена. Спасибо за проявленный интерес!', 'bot');
    }, 1000);
    
    updateVacancyInStorage(vacancyId, 'rejected');
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileUrl = URL.createObjectURL(file);
    
    addMessage(`Файл: ${file.name}`, 'user', true, file.type, fileUrl);
    
    setTimeout(() => {
        addMessage(`Пользователь отправил файл "${file.name}". Администратор уведомлен.`, 'bot');
    }, 500);
    
    e.target.value = '';
}

function saveMessageToHistory(text, sender, isMedia, mediaType, mediaUrl) {
    appData.chatHistory.push({
        text,
        sender,
        isMedia,
        mediaType,
        mediaUrl,
        timestamp: new Date().toISOString()
    });
    saveToLocalStorage();
}

function loadChatHistory() {
    appData.chatHistory.forEach(msg => {
        addMessage(msg.text, msg.sender, msg.isMedia, msg.mediaType, msg.mediaUrl);
    });
}

function saveVacancyToStorage(vacancy) {
    appData.pendingVacancies.push(vacancy);
    saveToLocalStorage();
}

function updateVacancyInStorage(vacancyId, status) {
    const vacancyIndex = appData.pendingVacancies.findIndex(v => v.id === vacancyId);
    if (vacancyIndex !== -1) {
        appData.pendingVacancies[vacancyIndex].status = status;
        saveToLocalStorage();
    }
}

// ========== Вспомогательные функции ==========
function formatDate(dateString) {
    if (!dateString) return 'неизвестно';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function syncDataWithAllUsers() {
    saveToLocalStorage();
    showNotification('Изменения синхронизированы для всех пользователей');
    
    renderProjects();
    renderTeam();
}

async function checkForUpdates() {
    showNotification('Проверка обновлений...');
    
    try {
        await loadFromGitHub();
        showNotification('Данные обновлены');
    } catch (error) {
        console.error('Ошибка при проверке обновлений:', error);
        showNotification('Ошибка при проверке обновлений', true);
    }
}

// Глобальные функции
window.approveVacancy = approveVacancy;
window.rejectVacancy = rejectVacancy;
window.openTeamMemberModal = openTeamMemberModal;
window.deleteTeamMember = deleteTeamMember;
window.saveToGitHub = saveToGitHub;

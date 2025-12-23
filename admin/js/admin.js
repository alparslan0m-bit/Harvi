/**
 * Admin Dashboard Controller
 * Handles CRUD operations for hierarchical MCQ content structure
 */

class AdminDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.sidebarCollapsed = false;
        this.mobileMenuOpen = false;
        this.darkMode = localStorage.getItem('admin-theme') === 'dark';
        this.questionIndex = [];
        this.data = {
            years: [],
            modules: [],
            subjects: [],
            lectures: []
        };
        this.currentEditId = null;
        this.currentEditType = null;
        this.debouncedReloadData = this.debounce(() => this.reloadAllData(), 500);
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupTheme();
        this.setupNavigation();
        
        // Show loading immediately
        this.showLoading();
        
        // Load all data in parallel
        try {
            await Promise.all([
                this.loadYears(),
                this.loadModules(),
                this.loadSubjects(),
                this.loadLectures()
            ]);
        } catch (error) {
            this.showToast('Error loading data', error.message, 'error');
        }
        
        // Update dashboard after data is loaded
        this.updateDashboardStats();
        
        // Use requestIdleCallback to hide loading after rendering is complete
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.hideLoading();
            }, { timeout: 1000 });
        } else {
            // Fallback for browsers that don't support requestIdleCallback
            setTimeout(() => {
                this.hideLoading();
            }, 100);
        }
    }
    
    setupEventListeners() {
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });
        
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });
        
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        document.getElementById('addYearBtn')?.addEventListener('click', () => this.showAddModal('year'));
        document.getElementById('addModuleBtn')?.addEventListener('click', () => this.showAddModal('module'));
        document.getElementById('addSubjectBtn')?.addEventListener('click', () => this.showAddModal('subject'));
        document.getElementById('addLectureBtn')?.addEventListener('click', () => this.showAddModal('lecture'));
        
        document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalSave')?.addEventListener('click', () => this.saveModalData());
        
        const globalSearchInput = document.getElementById('globalSearch');
        if (globalSearchInput) {
            const debouncedSearch = this.debounce((value) => {
                this.handleGlobalSearch(value);
            }, 200);
            
            globalSearchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
        
        document.getElementById('moduleYearFilter')?.addEventListener('change', () => this.filterModules());
        document.getElementById('subjectModuleFilter')?.addEventListener('change', () => this.filterSubjects());
        document.getElementById('lectureSubjectFilter')?.addEventListener('change', () => this.filterLectures());
        
        const questionSearchInput = document.getElementById('questionSearch');
        if (questionSearchInput) {
            const debouncedQuestionSearch = this.debounce((value) => {
                this.handleQuestionSearch(value);
            }, 200);
            
            questionSearchInput.addEventListener('input', (e) => {
                debouncedQuestionSearch(e.target.value);
            });
        }
        
        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });
    }
    
    setupTheme() {
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            const themeIcon = document.querySelector('#themeToggle i');
            if (themeIcon) {
                themeIcon.className = 'fas fa-sun';
            }
        }
    }
    
    setupNavigation() {
        this.updateBreadcrumb('Dashboard');
    }
    
    async loadYears() {
        try {
            const response = await fetch('/api/admin/years');
            if (!response.ok) throw new Error(`Failed to load years: ${response.statusText}`);
            this.data.years = await response.json();
            this.renderYearsTable();
            this.updateFilters();
        } catch (error) {
            console.error('Error loading years:', error);
            this.showToast('Error', 'Failed to load years: ' + error.message, 'error');
        }
    }
    
    async loadModules() {
        try {
            const response = await fetch('/api/admin/modules');
            if (!response.ok) throw new Error(`Failed to load modules: ${response.statusText}`);
            this.data.modules = await response.json();
            this.renderModulesTable();
        } catch (error) {
            console.error('Error loading modules:', error);
            this.showToast('Error', 'Failed to load modules: ' + error.message, 'error');
        }
    }
    
    async loadSubjects() {
        try {
            const response = await fetch('/api/admin/subjects');
            if (!response.ok) throw new Error(`Failed to load subjects: ${response.statusText}`);
            this.data.subjects = await response.json();
            this.renderSubjectsTable();
        } catch (error) {
            console.error('Error loading subjects:', error);
            this.showToast('Error', 'Failed to load subjects: ' + error.message, 'error');
        }
    }
    
    async loadLectures() {
        try {
            const response = await fetch('/api/admin/lectures');
            if (!response.ok) throw new Error(`Failed to load lectures: ${response.statusText}`);
            this.data.lectures = await response.json();
            this.renderLecturesTable();
            this.buildQuestionIndex();
        } catch (error) {
            console.error('Error loading lectures:', error);
            this.showToast('Error', 'Failed to load lectures: ' + error.message, 'error');
        }
    }
    
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }
    
    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('mobile-open');
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }
    
    toggleTheme() {
        this.darkMode = !this.darkMode;
        
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('admin-theme', 'dark');
            document.querySelector('#themeToggle i').className = 'fas fa-sun';
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('admin-theme', 'light');
            document.querySelector('#themeToggle i').className = 'fas fa-moon';
        }
    }
    
    navigateToPage(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(page).classList.add('active');
        
        const pageNames = {
            dashboard: 'Dashboard',
            years: 'Years',
            modules: 'Modules',
            subjects: 'Subjects',
            lectures: 'Lectures',
            questions: 'Questions'
        };
        
        this.updateBreadcrumb(pageNames[page] || page);
        this.currentPage = page;
        
        if (this.mobileMenuOpen) {
            this.toggleMobileMenu();
        }
    }
    
    updateBreadcrumb(text) {
        document.getElementById('currentPage').textContent = text;
    }
    
    updateDashboardStats() {
        document.getElementById('totalYears').textContent = this.data.years.length;
        document.getElementById('totalModules').textContent = this.data.modules.length;
        document.getElementById('totalSubjects').textContent = this.data.subjects.length;
        document.getElementById('totalLectures').textContent = this.data.lectures.length;
    }
    
    handleQuickAction(action) {
        const actionMap = {
            'add-year': 'year',
            'add-module': 'module',
            'add-subject': 'subject',
            'add-lecture': 'lecture',
            'add-question': 'question'
        };
        
        this.showAddModal(actionMap[action]);
    }
    
    showAddModal(type) {
        this.currentEditType = type;
        this.currentEditId = null;
        
        const titles = {
            year: 'Add New Year',
            module: 'Add New Module',
            subject: 'Add New Subject',
            lecture: 'Add New Lecture',
            question: 'Add New Question'
        };
        
        document.getElementById('modalTitle').textContent = titles[type];
        
        let modalContent = '';
        
        switch (type) {
            case 'year':
                modalContent = this.generateYearForm();
                break;
            case 'module':
                modalContent = this.generateModuleForm();
                break;
            case 'subject':
                modalContent = this.generateSubjectForm();
                break;
            case 'lecture':
                modalContent = this.generateLectureForm();
                break;
            case 'question':
                modalContent = this.generateQuestionSelectionForm();
                break;
        }
        
        document.getElementById('modalBody').innerHTML = modalContent;
        this.showModal();
        
        // Setup event listeners for question form if it's a question
        if (type === 'question') {
            this.setupQuestionFormListeners();
        }
    }
    
    showEditModal(type, id) {
        this.currentEditType = type;
        this.currentEditId = id;
        
        const titles = {
            year: 'Edit Year',
            module: 'Edit Module',
            subject: 'Edit Subject',
            lecture: 'Edit Lecture'
        };
        
        document.getElementById('modalTitle').textContent = titles[type];
        
        let item;
        switch (type) {
            case 'year':
                item = this.data.years.find(y => y.id === id);
                break;
            case 'module':
                item = this.data.modules.find(m => m.id === id);
                break;
            case 'subject':
                item = this.data.subjects.find(s => s.id === id);
                break;
            case 'lecture':
                item = this.data.lectures.find(l => l.id === id);
                break;
        }
        
        let modalContent = '';
        
        switch (type) {
            case 'year':
                modalContent = this.generateYearForm(item);
                break;
            case 'module':
                modalContent = this.generateModuleForm(item);
                break;
            case 'subject':
                modalContent = this.generateSubjectForm(item);
                break;
            case 'lecture':
                modalContent = this.generateLectureForm(item);
                break;
        }
        
        document.getElementById('modalBody').innerHTML = modalContent;
        this.showModal();
    }
    
    generateYearForm(data = null) {
        return `
            <div class="form-group">
                <label class="form-label">Year ID</label>
                <input type="text" class="form-input" id="yearId" value="${data?.id || ''}" 
                       placeholder="e.g., year1" ${data ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label class="form-label">Year Name</label>
                <input type="text" class="form-input" id="yearName" value="${data?.name || ''}" 
                       placeholder="e.g., Year 1">
            </div>
            <div class="form-group">
                <label class="form-label">Icon</label>
                <input type="text" class="form-input" id="yearIcon" value="${data?.icon || ''}" 
                       placeholder="e.g., 1️⃣">
            </div>
        `;
    }
    
    generateModuleForm(data = null) {
        const yearOptions = this.data.years.map(year => 
            `<option value="${year.id}" ${data?.yearId === year.id ? 'selected' : ''}>${year.name}</option>`
        ).join('');
        
        return `
            <div class="form-group">
                <label class="form-label">Year</label>
                <select class="form-select" id="moduleYear">
                    <option value="">Select Year</option>
                    ${yearOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Module Name</label>
                <input type="text" class="form-input" id="moduleName" value="${data?.name || ''}" 
                       placeholder="e.g., Module 1: Anatomy">
            </div>
        `;
    }
    
    generateSubjectForm(data = null) {
        const moduleOptions = this.data.modules.map(module => {
            const year = this.data.years.find(y => y.id === module.yearId);
            return `<option value="${module.id}" ${data?.moduleId === module.id ? 'selected' : ''}>${module.name} (${year?.name})</option>`;
        }).join('');
        
        return `
            <div class="form-group">
                <label class="form-label">Module</label>
                <select class="form-select" id="subjectModule">
                    <option value="">Select Module</option>
                    ${moduleOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Subject Name</label>
                <input type="text" class="form-input" id="subjectName" value="${data?.name || ''}" 
                       placeholder="e.g., Human Anatomy">
            </div>
        `;
    }
    
    generateLectureForm(data = null) {
        const subjectOptions = this.data.subjects.map(subject => {
            const module = this.data.modules.find(m => m.id === subject.moduleId);
            const year = this.data.years.find(y => y.id === module?.yearId);
            return `<option value="${subject.id}" ${data?.subjectId === subject.id ? 'selected' : ''}>${subject.name} (${module?.name}, ${year?.name})</option>`;
        }).join('');
        
        const questions = data?.questions || [];
        const questionsHtml = questions.map((q, index) => this.generateQuestionEditor(q, index)).join('');
        
        return `
            <div class="form-group">
                <label class="form-label">Subject</label>
                <select class="form-select" id="lectureSubject">
                    <option value="">Select Subject</option>
                    ${subjectOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Lecture Name</label>
                <input type="text" class="form-input" id="lectureName" value="${data?.name || ''}" 
                       placeholder="e.g., Introduction to Anatomy">
            </div>
            <div class="form-group">
                <label class="form-label">Questions</label>
                <div id="questionsContainer">
                    ${questionsHtml}
                </div>
                <button type="button" class="btn btn-secondary" onclick="adminDashboard.addQuestion()">
                    <i class="fas fa-plus"></i> Add Question
                </button>
            </div>
        `;
    }
    
    generateQuestionEditor(question = null, index = 0) {
        const options = question?.options || ['', ''];
        const optionsHtml = options.map((option, optIndex) => `
            <div class="option-item">
                <input type="radio" name="correct-${index}" value="${optIndex}" 
                       class="option-radio" ${question?.correctAnswer === optIndex ? 'checked' : ''}>
                <input type="text" class="form-input option-input" 
                       value="${option}" placeholder="Option ${optIndex + 1}">
                <button type="button" class="option-delete" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        return `
            <div class="question-editor" data-question-id="${question?.id || ''}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <button type="button" class="question-delete" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="Question text" 
                           value="${question?.text || ''}">
                </div>
                <div class="options-list">
                    ${optionsHtml}
                    <div class="add-option" onclick="adminDashboard.addOption(this)">
                        <i class="fas fa-plus"></i> Add Option
                    </div>
                </div>
            </div>
        `;
    }
    
    addQuestion() {
        const container = document.getElementById('questionsContainer');
        const index = container.children.length;
        container.insertAdjacentHTML('beforeend', this.generateQuestionEditor(null, index));
    }
    
    addOption(button) {
        const optionsList = button.parentElement;
        const options = optionsList.querySelectorAll('.option-item');
        const index = options.length;
        const questionIndex = Array.from(document.querySelectorAll('.question-editor')).indexOf(button.closest('.question-editor'));
        
        button.insertAdjacentHTML('beforebegin', `
            <div class="option-item">
                <input type="radio" name="correct-${questionIndex}" value="${index}" class="option-radio">
                <input type="text" class="form-input option-input" placeholder="Option ${index + 1}">
                <button type="button" class="option-delete" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `);
    }
    
    generateQuestionSelectionForm() {
        // Generate year options
        const yearOptions = this.data.years.map(year => 
            `<option value="${year.id}">${year.name}</option>`
        ).join('');
        
        return `
            <div class="form-group">
                <label class="form-label">Year</label>
                <select class="form-select" id="questionYearSelect">
                    <option value="">Select Year</option>
                    ${yearOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Module</label>
                <select class="form-select" id="questionModuleSelect" disabled>
                    <option value="">Select Module</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Subject</label>
                <select class="form-select" id="questionSubjectSelect" disabled>
                    <option value="">Select Subject</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Lecture</label>
                <select class="form-select" id="questionLectureSelect" disabled>
                    <option value="">Select Lecture</option>
                </select>
            </div>
            <div id="questionFormContainer"></div>
        `;
    }
    
    setupQuestionFormListeners() {
        const yearSelect = document.getElementById('questionYearSelect');
        const moduleSelect = document.getElementById('questionModuleSelect');
        const subjectSelect = document.getElementById('questionSubjectSelect');
        const lectureSelect = document.getElementById('questionLectureSelect');
        
        yearSelect?.addEventListener('change', (e) => {
            this.updateModuleOptions(e.target.value, moduleSelect);
            moduleSelect.value = '';
            subjectSelect.value = '';
            lectureSelect.value = '';
            subjectSelect.disabled = true;
            lectureSelect.disabled = true;
            document.getElementById('questionFormContainer').innerHTML = '';
        });
        
        moduleSelect?.addEventListener('change', (e) => {
            this.updateSubjectOptions(e.target.value, subjectSelect);
            subjectSelect.value = '';
            lectureSelect.value = '';
            lectureSelect.disabled = true;
            document.getElementById('questionFormContainer').innerHTML = '';
        });
        
        subjectSelect?.addEventListener('change', (e) => {
            this.updateLectureOptions(e.target.value, lectureSelect);
            lectureSelect.value = '';
            document.getElementById('questionFormContainer').innerHTML = '';
        });
        
        lectureSelect?.addEventListener('change', (e) => {
            this.showQuestionEditor(e.target.value);
        });
    }
    
    updateModuleOptions(yearId, moduleSelect) {
        const modules = this.data.modules.filter(m => m.yearId === yearId);
        moduleSelect.innerHTML = '<option value="">Select Module</option>' + 
            modules.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        moduleSelect.disabled = modules.length === 0;
    }
    
    updateSubjectOptions(moduleId, subjectSelect) {
        const subjects = this.data.subjects.filter(s => s.moduleId === moduleId);
        subjectSelect.innerHTML = '<option value="">Select Subject</option>' + 
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        subjectSelect.disabled = subjects.length === 0;
    }
    
    updateLectureOptions(subjectId, lectureSelect) {
        const lectures = this.data.lectures.filter(l => l.subjectId === subjectId);
        lectureSelect.innerHTML = '<option value="">Select Lecture</option>' + 
            lectures.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
        lectureSelect.disabled = lectures.length === 0;
    }
    
    showQuestionEditor(lectureId) {
        const container = document.getElementById('questionFormContainer');
        
        if (!lectureId) {
            container.innerHTML = '';
            return;
        }
        
        const lecture = this.data.lectures.find(l => l.id === lectureId);
        
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Question Text</label>
                <textarea class="form-input" id="questionText" placeholder="Enter the question text" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Options</label>
                <div id="questionOptionsContainer"></div>
                <button type="button" class="btn btn-secondary" onclick="adminDashboard.addQuestionOption()">
                    <i class="fas fa-plus"></i> Add Option
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Correct Answer</label>
                <div class="form-info">Mark the radio button of the correct option above</div>
            </div>
        `;
        
        // Add 2 default options
        const optionsContainer = document.getElementById('questionOptionsContainer');
        optionsContainer.innerHTML = `
            <div class="option-item">
                <input type="radio" name="correctAnswer" value="0" class="option-radio">
                <input type="text" class="form-input option-input" placeholder="Option 1">
                <button type="button" class="option-delete" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="option-item">
                <input type="radio" name="correctAnswer" value="1" class="option-radio">
                <input type="text" class="form-input option-input" placeholder="Option 2">
                <button type="button" class="option-delete" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    addQuestionOption() {
        const container = document.getElementById('questionOptionsContainer');
        const index = container.children.length;
        
        container.insertAdjacentHTML('beforeend', `
            <div class="option-item">
                <input type="radio" name="correctAnswer" value="${index}" class="option-radio">
                <input type="text" class="form-input option-input" placeholder="Option ${index + 1}">
                <button type="button" class="option-delete" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `);
    }
    
    async saveModalData() {
        const type = this.currentEditType;
        const isEdit = this.currentEditId !== null;
        
        let data = {};
        let endpoint = '';
        let method = isEdit ? 'PUT' : 'POST';
        
        try {
            switch (type) {
                case 'question':
                    const lectureId = document.getElementById('questionLectureSelect')?.value;
                    const questionText = document.getElementById('questionText')?.value;
                    const optionElements = document.querySelectorAll('#questionOptionsContainer .option-item');
                    const correctAnswerRadio = document.querySelector('input[name="correctAnswer"]:checked');
                    
                    if (!lectureId) {
                        this.showToast('Please select a lecture', 'error');
                        return;
                    }
                    
                    if (!questionText) {
                        this.showToast('Please enter question text', 'error');
                        return;
                    }
                    
                    if (optionElements.length < 2) {
                        this.showToast('Please add at least 2 options', 'error');
                        return;
                    }
                    
                    if (!correctAnswerRadio) {
                        this.showToast('Please select the correct answer', 'error');
                        return;
                    }
                    
                    const options = Array.from(optionElements).map(el => 
                        el.querySelector('.option-input').value
                    );
                    
                    data = {
                        text: questionText,
                        options: options,
                        correctAnswer: parseInt(correctAnswerRadio.value)
                    };
                    
                    endpoint = `/api/admin/lectures/${lectureId}/questions`;
                    break;
                    
                case 'year':
                    data = {
                        id: document.getElementById('yearId').value,
                        name: document.getElementById('yearName').value,
                        icon: document.getElementById('yearIcon').value
                    };
                    endpoint = isEdit ? `/api/admin/years/${this.currentEditId}` : '/api/admin/years';
                    break;
                    
                case 'module':
                    const yearId = document.getElementById('moduleYear').value;
                    const moduleName = document.getElementById('moduleName').value;
                    
                    if (!yearId) {
                        this.showToast('Validation Error', 'Please select a year', 'warning');
                        this.hideLoading();
                        return;
                    }
                    
                    const existingModules = this.data.modules.filter(m => m.yearId === yearId);
                    const highestModuleNum = Math.max(
                        ...existingModules.map(m => {
                            const match = m.id.match(/_mod(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        }),
                        0
                    );
                    const moduleId = isEdit ? this.currentEditId : `${yearId}_mod${highestModuleNum + 1}`;
                    
                    data = {
                        id: moduleId,
                        name: moduleName,
                        yearId: yearId
                    };
                    endpoint = isEdit ? `/api/admin/modules/${this.currentEditId}` : '/api/admin/modules';
                    break;
                    
                case 'subject':
                    const moduleId2 = document.getElementById('subjectModule').value;
                    const subjectName = document.getElementById('subjectName').value;
                    
                    if (!moduleId2) {
                        this.showToast('Validation Error', 'Please select a module', 'warning');
                        this.hideLoading();
                        return;
                    }
                    
                    const existingSubjects = this.data.subjects.filter(s => s.moduleId === moduleId2);
                    const highestSubjectNum = Math.max(
                        ...existingSubjects.map(s => {
                            const match = s.id.match(/_sub(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        }),
                        0
                    );
                    const subjectId = isEdit ? this.currentEditId : `${moduleId2}_sub${highestSubjectNum + 1}`;
                    
                    data = {
                        id: subjectId,
                        name: subjectName,
                        moduleId: moduleId2
                    };
                    endpoint = isEdit ? `/api/admin/subjects/${this.currentEditId}` : '/api/admin/subjects';
                    break;
                    
                case 'lecture':
                    const subjectId2 = document.getElementById('lectureSubject').value;
                    const lectureName = document.getElementById('lectureName').value;
                    
                    if (!subjectId2) {
                        this.showToast('Validation Error', 'Please select a subject', 'warning');
                        this.hideLoading();
                        return;
                    }
                    
                    const existingLectures = this.data.lectures.filter(l => l.subjectId === subjectId2);
                    const highestLectureNum = Math.max(
                        ...existingLectures.map(l => {
                            const match = l.id.match(/_lec(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        }),
                        0
                    );
                    const genLectureId = isEdit ? this.currentEditId : `${subjectId2}_lec${highestLectureNum + 1}`;
                    
                    data = {
                        id: genLectureId,
                        name: lectureName,
                        subjectId: subjectId2,
                        questions: this.extractQuestions()
                    };
                    endpoint = isEdit ? `/api/admin/lectures/${this.currentEditId}` : '/api/admin/lectures';
                    break;
            }
            
            if (!this.validateFormData(data, type)) {
                return;
            }
            
            this.showLoading();
            
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).catch(error => {
                throw new Error(`Network error: ${error.message}`);
            });
            
            const result = await response.json();
            
            if (response.ok) {
                const actionText = type === 'question' ? 'added' : (isEdit ? 'updated' : 'created');
                this.showToast('Success', `${type} ${actionText} successfully`, 'success');
                this.closeModal();
                
                if (type === 'question') {
                    // Just refresh lectures data to update question counts
                    await Promise.all([
                        this.loadYears(),
                        this.loadModules(),
                        this.loadSubjects(),
                        this.loadLectures()
                    ]);
                    this.buildQuestionIndex();
                } else {
                    await Promise.all([
                        this.loadYears(),
                        this.loadModules(),
                        this.loadSubjects(),
                        this.loadLectures()
                    ]);
                    this.updateDashboardStats();
                    if (type === 'lecture') {
                        this.buildQuestionIndex();
                    }
                }
            } else {
                this.showToast('Error', result.details || result.error || 'Failed to save', 'error');
            }
            
        } catch (error) {
            this.showToast('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    extractQuestions() {
        const questions = [];
        const questionEditors = document.querySelectorAll('.question-editor');
        let highestQuestionNum = 0;
        
        // Find the highest existing question number
        questionEditors.forEach((editor) => {
            const existingId = editor.getAttribute('data-question-id');
            if (existingId) {
                const match = existingId.match(/q(\d+)$/);
                if (match) {
                    highestQuestionNum = Math.max(highestQuestionNum, parseInt(match[1]));
                }
            }
        });
        
        questionEditors.forEach((editor, index) => {
            const questionText = editor.querySelector('.form-input').value;
            const options = [];
            let correctAnswer = -1;
            
            const optionItems = editor.querySelectorAll('.option-item');
            optionItems.forEach((item, optIndex) => {
                const optionText = item.querySelector('.option-input').value;
                if (optionText.trim()) {
                    options.push(optionText.trim());
                    if (item.querySelector('.option-radio').checked) {
                        correctAnswer = options.length - 1;
                    }
                }
            });
            
            if (questionText.trim() && options.length >= 2 && correctAnswer >= 0) {
                const existingId = editor.getAttribute('data-question-id');
                const questionId = existingId ? existingId : `q${highestQuestionNum + index + 1}`;
                
                questions.push({
                    id: questionId,
                    text: questionText.trim(),
                    options: options,
                    correctAnswer: correctAnswer
                });
            }
        });
        
        return questions;
    }
    
    validateFormData(data, type) {
        // Questions don't need validation here - already validated in saveModalData
        if (type === 'question') {
            return true;
        }
        
        const requiredFields = {
            year: ['id', 'name'],
            module: ['name', 'yearId'],
            subject: ['name', 'moduleId'],
            lecture: ['name', 'subjectId']
        };
        
        const required = requiredFields[type];
        
        if (!required) {
            console.warn('Unknown type for validation:', type);
            return true;
        }
        
        const missing = required.filter(field => !data[field] || data[field].toString().trim() === '');
        
        if (missing.length > 0) {
            this.showToast('Validation Error', `Please fill in: ${missing.join(', ')}`, 'warning');
            return false;
        }
        
        // Check for duplicate Year IDs
        if (type === 'year' && !this.currentEditId) {
            const yearExists = this.data.years.some(y => y.id === data.id);
            if (yearExists) {
                this.showToast('Validation Error', 'A year with this ID already exists', 'warning');
                return false;
            }
        }
        
        // Validate parent item exists for child items
        if (type === 'module' && !this.data.years.find(y => y.id === data.yearId)) {
            this.showToast('Validation Error', 'Selected year does not exist', 'warning');
            return false;
        }
        
        if (type === 'subject' && !this.data.modules.find(m => m.id === data.moduleId)) {
            this.showToast('Validation Error', 'Selected module does not exist', 'warning');
            return false;
        }
        
        if (type === 'lecture' && !this.data.subjects.find(s => s.id === data.subjectId)) {
            this.showToast('Validation Error', 'Selected subject does not exist', 'warning');
            return false;
        }
        
        return true;
    }
    
    async deleteItem(type, id) {
        if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            this.showLoading();
            
            const endpoint = `/api/admin/${type}s/${id}`;
            const response = await fetch(endpoint, { method: 'DELETE' }).catch(error => {
                throw new Error(`Network error: ${error.message}`);
            });
            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Success', `${type} deleted successfully`, 'success');
                // Use debounced reload to prevent race conditions
                this.debouncedReloadData();
                this.updateDashboardStats();
            } else {
                this.showToast('Error', result.details || result.error, 'error');
            }
        } catch (error) {
            this.showToast('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async reloadAllData() {
        try {
            await Promise.all([
                this.loadYears(),
                this.loadModules(),
                this.loadSubjects(),
                this.loadLectures()
            ]);
        } catch (error) {
            console.error('Error reloading data:', error);
        }
    }
    
    showModal() {
        document.getElementById('modal').classList.add('active');
    }
    
    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.currentEditType = null;
        this.currentEditId = null;
    }
    
    renderYearsTable() {
        const tbody = document.getElementById('yearsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.years.map(year => {
            const moduleCount = this.data.modules.filter(m => m.yearId === year.id).length;
            const createdDate = new Date(year.createdAt).toLocaleDateString();
            
            return `
                <tr>
                    <td><span style="font-size: 1.5rem;">${year.icon || '📅'}</span></td>
                    <td><code>${year.id}</code></td>
                    <td><strong>${year.name}</strong></td>
                    <td><span class="badge">${moduleCount} modules</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="adminDashboard.showEditModal('year', '${year.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="adminDashboard.deleteItem('year', '${year.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderModulesTable() {
        const tbody = document.getElementById('modulesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.modules.map(module => {
            const year = this.data.years.find(y => y.id === module.yearId);
            const subjectCount = this.data.subjects.filter(s => s.moduleId === module.id).length;
            const createdDate = new Date(module.createdAt).toLocaleDateString();
            
            return `
                <tr data-year-id="${module.yearId}">
                    <td><code>${module.id}</code></td>
                    <td><strong>${module.name}</strong></td>
                    <td><span class="badge">${year?.name || 'Unknown'}</span></td>
                    <td><span class="badge">${subjectCount} subjects</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="adminDashboard.showEditModal('module', '${module.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="adminDashboard.deleteItem('module', '${module.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderSubjectsTable() {
        const tbody = document.getElementById('subjectsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.subjects.map(subject => {
            const module = this.data.modules.find(m => m.id === subject.moduleId);
            const year = this.data.years.find(y => y.id === module?.yearId);
            const lectureCount = this.data.lectures.filter(l => l.subjectId === subject.id).length;
            const createdDate = new Date(subject.createdAt).toLocaleDateString();
            
            return `
                <tr data-module-id="${subject.moduleId}">
                    <td><code>${subject.id}</code></td>
                    <td><strong>${subject.name}</strong></td>
                    <td><span class="badge">${module?.name} (${year?.name})</span></td>
                    <td><span class="badge">${lectureCount} lectures</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="adminDashboard.showEditModal('subject', '${subject.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="adminDashboard.deleteItem('subject', '${subject.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderLecturesTable() {
        const tbody = document.getElementById('lecturesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.lectures.map(lecture => {
            const subject = this.data.subjects.find(s => s.id === lecture.subjectId);
            const module = this.data.modules.find(m => m.id === subject?.moduleId);
            const year = this.data.years.find(y => y.id === module?.yearId);
            const questionCount = lecture.questions?.length || 0;
            const createdDate = new Date(lecture.createdAt).toLocaleDateString();
            
            return `
                <tr data-subject-id="${lecture.subjectId}">
                    <td><code>${lecture.id}</code></td>
                    <td><strong>${lecture.name}</strong></td>
                    <td><span class="badge">${subject?.name}</span></td>
                    <td><span class="badge">${questionCount} questions</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="adminDashboard.showEditModal('lecture', '${lecture.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="adminDashboard.deleteItem('lecture', '${lecture.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    buildQuestionIndex() {
        const index = [];
        
        this.data.lectures.forEach((lecture) => {
            const subject = this.data.subjects.find(s => s.id === lecture.subjectId);
            const module = subject ? this.data.modules.find(m => m.id === subject.moduleId) : null;
            const year = module ? this.data.years.find(y => y.id === module.yearId) : null;
            
            (lecture.questions || []).forEach((q) => {
                index.push({
                    lectureId: lecture.id,
                    lectureName: lecture.name,
                    subjectName: subject?.name || '',
                    moduleName: module?.name || '',
                    yearName: year?.name || '',
                    questionId: q.id,
                    questionText: q.text,
                    options: q.options || []
                });
            });
        });
        
        this.questionIndex = index;
    }
    
    updateFilters() {
        const moduleYearFilter = document.getElementById('moduleYearFilter');
        if (moduleYearFilter) {
            moduleYearFilter.innerHTML = '<option value="">All Years</option>' +
                this.data.years.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
        }
        
        const subjectModuleFilter = document.getElementById('subjectModuleFilter');
        if (subjectModuleFilter) {
            subjectModuleFilter.innerHTML = '<option value="">All Modules</option>' +
                this.data.modules.map(module => {
                    const year = this.data.years.find(y => y.id === module.yearId);
                    return `<option value="${module.id}">${module.name} (${year?.name})</option>`;
                }).join('');
        }
        
        const lectureSubjectFilter = document.getElementById('lectureSubjectFilter');
        if (lectureSubjectFilter) {
            lectureSubjectFilter.innerHTML = '<option value="">All Subjects</option>' +
                this.data.subjects.map(subject => {
                    const module = this.data.modules.find(m => m.id === subject.moduleId);
                    return `<option value="${subject.id}">${subject.name} (${module?.name})</option>`;
                }).join('');
        }
    }
    
    filterModules() {
        const yearFilter = document.getElementById('moduleYearFilter').value;
        const tableRows = document.querySelectorAll('#modulesTable tbody tr');
        let visibleCount = 0;
        
        tableRows.forEach(row => {
            const moduleYearId = row.getAttribute('data-year-id');
            
            if (!yearFilter || moduleYearId === yearFilter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        if (visibleCount === 0 && yearFilter) {
            this.showToast('No Results', `No modules found for selected year`, 'info');
        }
    }
    
    filterSubjects() {
        const moduleFilter = document.getElementById('subjectModuleFilter').value;
        const tableRows = document.querySelectorAll('#subjectsTable tbody tr');
        let visibleCount = 0;
        
        tableRows.forEach(row => {
            const subjectModuleId = row.getAttribute('data-module-id');
            
            if (!moduleFilter || subjectModuleId === moduleFilter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        if (visibleCount === 0 && moduleFilter) {
            this.showToast('No Results', `No subjects found for selected module`, 'info');
        }
    }
    
    filterLectures() {
        const subjectFilter = document.getElementById('lectureSubjectFilter').value;
        const tableRows = document.querySelectorAll('#lecturesTable tbody tr');
        let visibleCount = 0;
        
        tableRows.forEach(row => {
            const lectureSubjectId = row.getAttribute('data-subject-id');
            
            if (!subjectFilter || lectureSubjectId === subjectFilter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        if (visibleCount === 0 && subjectFilter) {
            this.showToast('No Results', `No lectures found for selected subject`, 'info');
        }
    }
    
    handleGlobalSearch(query) {
        const searchStatusEl = document.getElementById('searchStatus');
        const searchTerm = query.toLowerCase().trim();
        
        const activePage = document.querySelector('.page.active');
        if (!activePage) {
            if (searchStatusEl) searchStatusEl.textContent = '';
            return;
        }
        
        const table = activePage.querySelector('table');
        if (!table) {
            if (searchStatusEl) searchStatusEl.textContent = '';
            return;
        }
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        if (!searchTerm) {
            rows.forEach(row => {
                row.style.display = '';
            });
            
            if (searchStatusEl) searchStatusEl.textContent = '';
            this.reapplyCurrentPageFilters();
            return;
        }
        
        let totalMatches = 0;
        
        rows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            if (rowText.includes(searchTerm)) {
                row.style.display = '';
                totalMatches++;
            } else {
                row.style.display = 'none';
            }
        });
        
        if (searchStatusEl) {
            if (totalMatches === 0) {
                searchStatusEl.textContent = `No items found for "${query}"`;
            } else {
                searchStatusEl.textContent = `Found ${totalMatches} item${totalMatches !== 1 ? 's' : ''}`;
            }
        }
    }
    
    handleQuestionSearch(query) {
        const container = document.getElementById('questionSearchResults');
        if (!container) return;
        
        const term = query.toLowerCase().trim();
        if (!term) {
            container.innerHTML = '';
            return;
        }
        
        const matches = this.questionIndex.filter((item) => {
            const inText = item.questionText.toLowerCase().includes(term);
            const inOptions = item.options.some(opt => opt.toLowerCase().includes(term));
            return inText || inOptions;
        }).slice(0, 50);
        
        if (matches.length === 0) {
            container.innerHTML = `
                <div class="question-search-empty">
                    No questions found for "<strong>${this.escapeHtml(query)}</strong>"
                </div>
            `;
            return;
        }
        
        container.innerHTML = matches.map(m => `
            <div class="question-search-item">
                <div class="question-search-meta">
                    <div class="question-search-breadcrumb">
                        ${this.escapeHtml(m.yearName)} &rsaquo;
                        ${this.escapeHtml(m.moduleName)} &rsaquo;
                        ${this.escapeHtml(m.subjectName)} &rsaquo;
                        <strong>${this.escapeHtml(m.lectureName)}</strong>
                    </div>
                    <div class="question-search-text">
                        ${this.escapeHtml(m.questionText)}
                    </div>
                </div>
                <button
                    class="btn btn-sm"
                    onclick="adminDashboard.openLectureQuestionEditor('${m.lectureId}', '${m.questionId}')"
                >
                    Edit question
                </button>
            </div>
        `).join('');
    }
    
    reapplyCurrentPageFilters() {
        switch (this.currentPage) {
            case 'modules':
                if (document.getElementById('moduleYearFilter')) {
                    this.filterModules();
                }
                break;
            case 'subjects':
                if (document.getElementById('subjectModuleFilter')) {
                    this.filterSubjects();
                }
                break;
            case 'lectures':
                if (document.getElementById('lectureSubjectFilter')) {
                    this.filterLectures();
                }
                break;
        }
    }
    
    showToast(title, message, type = 'info') {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    openLectureQuestionEditor(lectureId, questionId) {
        this.showEditModal('lecture', lectureId);
        
        requestAnimationFrame(() => {
            const modal = document.getElementById('modal');
            if (!modal) return;
            
            const target = modal.querySelector(`.question-editor[data-question-id="${questionId}"]`);
            if (!target) return;
            
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('question-editor-highlight');
            
            const input = target.querySelector('input.form-input');
            if (input) {
                input.focus();
                if (typeof input.select === 'function') {
                    input.select();
                }
            }
            
            setTimeout(() => {
                target.classList.remove('question-editor-highlight');
            }, 2000);
        });
    }
    
    debounce(fn, delay = 200) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
    }
    
    escapeHtml(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
}

const adminDashboard = new AdminDashboard();
window.adminDashboard = adminDashboard;
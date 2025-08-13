class Navigation {
    constructor(app) {
        this.app = app;
        this.currentPath = [];
    }

    showYears() {
        this.app.showScreen('navigation-screen');
        this.currentPath = [];
        this.updateBreadcrumb();
        
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        appData.years.forEach((year) => {
            const card = this.createCard(year.icon, year.name, `${year.modules.length} Modules`);
            card.addEventListener('click', () => this.showModules(year));
            container.appendChild(card);
        });
    }

    showModules(year) {
        this.currentPath = [year];
        this.updateBreadcrumb();
        
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        if (!year.modules || year.modules.length === 0) {
            container.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No modules available yet.</p>';
            return;
        }
        
        year.modules.forEach(module => {
            const card = this.createCard('📚', module.name, `${module.subjects?.length || 0} Subjects`);
            card.addEventListener('click', () => this.showSubjects(year, module));
            container.appendChild(card);
        });
    }

    showSubjects(year, module) {
        this.currentPath = [year, module];
        this.updateBreadcrumb();
        
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        if (!module.subjects || module.subjects.length === 0) {
            container.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No subjects available yet.</p>';
            return;
        }
        
        module.subjects.forEach(subject => {
            const card = this.createCard('📖', subject.name, `${subject.lectures?.length || 0} Lectures`);
            card.addEventListener('click', () => this.showLectures(year, module, subject));
            container.appendChild(card);
        });
    }

    showLectures(year, module, subject) {
    this.currentPath = [year, module, subject];
    this.updateBreadcrumb();
    
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (!subject.lectures || subject.lectures.length === 0) {
        container.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No lectures available yet.</p>';
        return;
    }

    subject.lectures.forEach(lecture => {
        const card = this.createCard('📝', lecture.name, 'Fetching questions...');
        container.appendChild(card);
        
        // Asynchronously fetch the JSON data for each lecture
        fetch(lecture.path)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Attach the fetched questions to the lecture object
                lecture.questions = data.questions;
                
                const questions = lecture.questions;
                if (questions && questions.length > 0) {
                    const questionCount = questions.length;
                    const description = `${questionCount} Questions`;
                    
                    card.querySelector('.card-description').textContent = description;
                    card.style.cursor = 'pointer';
                    card.classList.add('active'); 
                    
                    card.addEventListener('click', () => {
                        this.app.startQuiz(questions, {
                            year: year.name,
                            module: module.name,
                            subject: subject.name,
                            lecture: lecture.name
                        });
                    });
                } else {
                    card.querySelector('.card-description').textContent = 'No questions found';
                    card.style.opacity = '0.6';
                    card.style.cursor = 'not-allowed';
                }
            })
            .catch(error => {
                console.error('Error fetching lecture data:', error);
                card.querySelector('.card-description').textContent = 'Failed to load questions';
                card.style.opacity = '0.6';
                card.style.cursor = 'not-allowed';
            });
    });
}

    createCard(icon, title, description) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <h3 class="card-title">${title}</h3>
            <p class="card-description">${description}</p>
        `;
        return card;
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';
        
        const homeItem = document.createElement('span');
        homeItem.className = 'breadcrumb-item';
        homeItem.innerHTML = '🏠 Home';
        homeItem.style.cursor = 'pointer';
        homeItem.addEventListener('click', () => this.app.navigation.showYears());
        breadcrumb.appendChild(homeItem);
        
        this.currentPath.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' > ';
            breadcrumb.appendChild(separator);
            
            const pathItem = document.createElement('span');
            pathItem.className = 'breadcrumb-item';
            if (index === this.currentPath.length - 1) {
                pathItem.classList.add('active');
            }
            pathItem.textContent = item.name;
            pathItem.style.cursor = 'pointer';
            
            pathItem.addEventListener('click', () => {
                if (index === 0) {
                    this.showModules(this.currentPath[0]);
                } else if (index === 1) {
                    this.showSubjects(this.currentPath[0], this.currentPath[1]);
                } else if (index === 2) {
                    this.showLectures(this.currentPath[0], this.currentPath[1], this.currentPath[2]);
                }
            });
            
            breadcrumb.appendChild(pathItem);
        });
    }
}
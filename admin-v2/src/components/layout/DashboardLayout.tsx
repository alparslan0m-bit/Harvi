import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useYears } from '../../hooks/useYears';
import { useModules } from '../../hooks/useModules';
import { useSubjects } from '../../hooks/useSubjects';
import { useLectures } from '../../hooks/useLectures';
import { useQuestions } from '../../hooks/useQuestions';
import YearsPage from '../../pages/YearsPage';
import ModulesPage from '../../pages/ModulesPage';
import SubjectsPage from '../../pages/SubjectsPage';
import LecturesPage from '../../pages/LecturesPage';
import QuestionsPage from '../../pages/QuestionsPage';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const [activeTab, setActiveTab] = useState('dashboard');

    async function handleSignOut() {
        await supabase.auth.signOut();
    }

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Admin Panel</h2>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'years' ? 'active' : ''}`}
                        onClick={() => setActiveTab('years')}
                    >
                        📅 Years
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'modules' ? 'active' : ''}`}
                        onClick={() => setActiveTab('modules')}
                    >
                        📚 Modules
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'subjects' ? 'active' : ''}`}
                        onClick={() => setActiveTab('subjects')}
                    >
                        📖 Subjects
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lectures')}
                    >
                        🎓 Lectures
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'questions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('questions')}
                    >
                        ❓ Questions
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="btn btn-secondary btn-block" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="content-header">
                    <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                </header>

                <div className="content-body">
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'years' && <YearsPage />}
                    {activeTab === 'modules' && <ModulesPage />}
                    {activeTab === 'subjects' && <SubjectsPage />}
                    {activeTab === 'lectures' && <LecturesPage />}
                    {activeTab === 'questions' && <QuestionsPage />}
                </div>
            </main>
        </div>
    );
}

function DashboardView() {
    const { data: years } = useYears();
    const { data: modules } = useModules();
    const { data: subjects } = useSubjects();
    const { data: lectures } = useLectures();
    const { data: questions } = useQuestions();

    return (
        <div className="dashboard-view">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Years</h3>
                    <p className="stat-value">{years?.length || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Modules</h3>
                    <p className="stat-value">{modules?.length || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Subjects</h3>
                    <p className="stat-value">{subjects?.length || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Lectures</h3>
                    <p className="stat-value">{lectures?.length || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Questions</h3>
                    <p className="stat-value">{questions?.length || 0}</p>
                </div>
            </div>

            <div className="welcome-message">
                <h2>Welcome to Admin Dashboard v2</h2>
                <p>Supabase-native admin panel for Medical MCQ Platform</p>
                <ul style={{ marginTop: '16px', lineHeight: '1.8' }}>
                    <li>✅ UUID-first design</li>
                    <li>✅ Clean architecture</li>
                    <li>✅ TypeScript strict mode</li>
                    <li>✅ Secure by default</li>
                    <li>✅ CRUD operations active</li>
                </ul>
            </div>
        </div>
    );
}

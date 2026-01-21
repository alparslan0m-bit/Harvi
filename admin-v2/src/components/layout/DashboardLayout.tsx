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
                    <h1>{activeTab === 'dashboard' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    <div className="user-profile">
                        <span className="badge">Admin</span>
                    </div>
                </header>

                <div className="content-body">
                    {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
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

interface DashboardViewProps {
    setActiveTab: (tab: string) => void;
}

function DashboardView({ setActiveTab }: DashboardViewProps) {
    const { data: years } = useYears();
    const { data: modules } = useModules();
    const { data: subjects } = useSubjects();
    const { data: lectures } = useLectures();
    const { data: questions } = useQuestions();

    const stats = [
        { label: 'Years', value: years?.length || 0, icon: '📅', color: 'blue', tab: 'years' },
        { label: 'Modules', value: modules?.length || 0, icon: '📚', color: 'indigo', tab: 'modules' },
        { label: 'Subjects', value: subjects?.length || 0, icon: '📖', color: 'purple', tab: 'subjects' },
        { label: 'Lectures', value: lectures?.length || 0, icon: '🎓', color: 'pink', tab: 'lectures' },
        { label: 'Questions', value: questions?.length || 0, icon: '❓', color: 'orange', tab: 'questions' },
    ];

    return (
        <div className="dashboard-view">
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`stat-card stat-card--${stat.color}`}
                        onClick={() => setActiveTab(stat.tab)}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <h3>{stat.label}</h3>
                            <p className="stat-value">{stat.value}</p>
                        </div>
                        <div className="stat-arrow">→</div>
                    </div>
                ))}
            </div>

            <div className="quick-actions-section">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <button className="action-card" onClick={() => setActiveTab('questions')}>
                        <span className="action-icon">➕</span>
                        <div className="action-details">
                            <h4>Add Question</h4>
                            <p>Create a new MCQ</p>
                        </div>
                    </button>
                    <button className="action-card" onClick={() => setActiveTab('lectures')}>
                        <span className="action-icon">🎓</span>
                        <div className="action-details">
                            <h4>Manage Lectures</h4>
                            <p>Organize content</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

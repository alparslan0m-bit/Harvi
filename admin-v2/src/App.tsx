import { useEffect, useState } from 'react';
import { supabase, isAdmin } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false);

    useEffect(() => {
        checkAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    const adminStatus = await isAdmin();
                    setIsAdminUser(adminStatus);
                    setIsAuthenticated(true);
                } else if (event === 'SIGNED_OUT') {
                    setIsAuthenticated(false);
                    setIsAdminUser(false);
                }
                setLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    async function checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const adminStatus = await isAdmin();
                setIsAdminUser(adminStatus);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    if (!isAdminUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <h1>Access Denied</h1>
                <p>You do not have admin privileges.</p>
                <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
            </div>
        );
    }

    return <DashboardLayout />;
}

export default App;

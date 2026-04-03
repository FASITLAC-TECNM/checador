import Sidebar from './Sidebar';

const Layout = ({ children, activeView, setActiveView }) => {
    return (
        <div className="flex h-screen bg-bg-tertiary">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;
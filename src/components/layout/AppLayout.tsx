import React from 'react';
import { Outlet } from 'react-router-dom';
import ImprovedNavbar from './ImprovedNavbar';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <ImprovedNavbar />
      
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
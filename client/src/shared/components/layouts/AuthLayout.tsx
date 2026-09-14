import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-mint-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F0FDF4]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">CF</span>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            ClearFlow
          </h2>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-teal-900/5 sm:rounded-xl sm:px-10 border border-teal-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { User, Shield, Badge, Crown } from 'lucide-react';

const RoleEditModal = ({ isOpen, onClose, user, onSave }) => {
	// Initialize state with user's current role
	const [selectedRole, setSelectedRole] = useState(user?.role);

	// Sync state when the 'user' prop changes or modal opens
	useEffect(() => {
		if (user) {
			setSelectedRole(user.role);
		}
	}, [user, isOpen]);

	const handleSave = () => {
		// Prevent sending empty data if state hasn't initialized
		if (!selectedRole) return;
		
		onSave(selectedRole);
		onClose();
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				<div className='flex items-center gap-3'>
					<div className='bg-green-100 dark:bg-green-900/30 p-2 rounded-lg'>
						<User size={20} className='text-green-600 dark:text-green-400' />
					</div>
					<span>Edit {user?.name || user?.username}'s Role</span>
				</div>
			}
		>
			<div className='space-y-6'>
				<div className='space-y-2'>
					<label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
						Select Role
					</label>
					<div className='relative'>
						<select
							value={selectedRole || ''}
							onChange={(e) => setSelectedRole(e.target.value)}
							className='w-full p-3 pl-11 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white dark:bg-gray-800 dark:text-gray-200 transition-colors duration-300'
						>
							<option value='user'>User</option>
							<option value='admin'>Admin</option>
							<option value='manager'>Manager</option>
						</select>
						
						{/* Dynamic icon based on selected role */}
						<div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400'>
							{selectedRole === 'admin' ? (
								<Shield size={20} />
							) : selectedRole === 'manager' ? (
								<Badge size={20} />
							) : selectedRole === 'root' ? (
								<Crown size={20} className="text-orange-500" />
							) : (
								<User size={20} />
							)}
						</div>
					</div>
				</div>

				<div className='flex justify-end gap-3 pt-2'>
					<button
						onClick={onClose}
						className='px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300'
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						disabled={!selectedRole}
						className='px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50'
					>
						Save Changes
					</button>
				</div>
			</div>
		</BaseModal>
	);
};

export default RoleEditModal;
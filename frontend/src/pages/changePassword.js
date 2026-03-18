import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../components/common/FormInput';
import AuthButton from '../components/auth/AuthButton';
import AuthFooter from '../components/auth/AuthFooter';
import collegeBuilding from '../assets/collegeBuilding.jpg';
import Message from "../components/common/Error_successMessage";
import useAuth from '../hooks/useAuth';

const ChangePasswordPage = () => {
	const navigate = useNavigate();

	// Use custom hook
	const { isLoading, error, successMessage, changePassword, setError, setSuccessMessage } =
		useAuth();

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Reset local error state if needed, though hook handles most
		if (error) setError('');

		if (!currentPassword || !newPassword) {
			setError('All fields are required');
			return;
		}

		// Retrieve user email to send with the request
		const user = JSON.parse(localStorage.getItem('user'));
		const userEmail = user?.email;

		if (!userEmail) {
			setError('Unable to retrieve email. Please log in again.');
			return;
		}

		// Call hook to change password
		// The hook handles the API call, success message, and redirection to login
		await changePassword(userEmail, currentPassword, newPassword);
	};

	const handleCancel = () => {
		navigate('/homepage');
	};

	return (
		<section
			className='min-h-screen'
			style={{
				backgroundImage: `url(${collegeBuilding})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}
		>
			<div className='min-h-screen flex justify-center items-center'>
				<div className='w-full sm:w-[640px] p-10 bg-black bg-opacity-30 shadow-lg rounded-lg flex flex-col'>
					<div className='w-full p-6'>
						<div className='text-center'>
							<h4 className='mb-4 text-4xl font-extrabold text-white'>Change Password</h4>
							<p className='mt-2 text-sm text-white'>
								Please enter your current password and new password to update your credentials.
							</p>
						</div>

						<div className='mt-5'>
							<form onSubmit={handleSubmit}>
								<FormInput
									type='password'
									name='currentPassword'
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									label='Current Password'
								/>
								<FormInput
									type='password'
									name='newPassword'
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									label='New Password'
								/>

								<div className='text-center'>
									{error && <Message message={error} type='error' onClose={() => setError('')} />}
									{successMessage && (
										<Message
											message={successMessage}
											type='success'
											onClose={() => setSuccessMessage('')}
										/>
									)}
								</div>

								<div className='flex justify-between mt-4'>
									<button
										type='button'
										onClick={handleCancel}
										className='mr-2 w-5/12 py-2 px-4 bg-gradient-grayToRight hover:bg-gradient-grayToLeft text-white rounded-md'
									>
										Cancel
									</button>
									<AuthButton isSubmitting={isLoading} label='Apply Changes' />
								</div>
							</form>
						</div>
						<AuthFooter isForgotPassword={false} onLoginRedirect={() => navigate('/login')} />
					</div>
				</div>
			</div>
		</section>
	);
};

export default ChangePasswordPage;

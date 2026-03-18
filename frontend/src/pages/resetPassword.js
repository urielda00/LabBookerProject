import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../components/common/FormInput';
import AuthButton from '../components/auth/AuthButton';
import collegeBuilding from '../assets/collegeBuilding.jpg';
import Message from "../components/common/Error_successMessage";
import useAuth from '../hooks/useAuth';

const ResetPasswordPage = () => {
	const navigate = useNavigate();

	// Use custom hook
	const { isLoading, error, successMessage, resetPassword, setError, setSuccessMessage } =
		useAuth();

	const [newPassword, setNewPassword] = useState('');
	const [confirmNewPassword, setConfirmNewPassword] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Reset UI messages
		if (error) setError('');
		if (successMessage) setSuccessMessage('');

		const storedEmail = localStorage.getItem('email');

		// Local Validation
		if (!newPassword || !confirmNewPassword) {
			setError('All fields are required');
			return;
		}

		if (newPassword !== confirmNewPassword) {
			setError('Passwords do not match');
			return;
		}

		if (!storedEmail) {
			setError('Unable to retrieve email. Please try again.');
			return;
		}

		// Call hook to reset password
		// The hook handles the API call, success message, and redirection to login
		await resetPassword(storedEmail, newPassword, confirmNewPassword);

		// Optional: Clean up email from storage upon success
		// Note: Logic continues in the hook with a timeout for redirection
		if (!error) {
			localStorage.removeItem('email');
		}
	};

	const handleCancel = () => {
		localStorage.removeItem('email'); // Clear the email
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
							<h4 className='mb-4 text-4xl font-extrabold text-white'>Reset Password</h4>
							<p className='mt-2 text-sm text-white'>
								Please enter your new password and confirm it to reset your credentials.
							</p>
						</div>

						<div className='mt-5'>
							<form onSubmit={handleSubmit}>
								<FormInput
									type='password'
									name='newPassword'
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									label='New Password'
								/>
								<FormInput
									type='password'
									name='confirmNewPassword'
									value={confirmNewPassword}
									onChange={(e) => setConfirmNewPassword(e.target.value)}
									label='Confirm New Password'
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
									<AuthButton isSubmitting={isLoading} label='Reset Password' />
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ResetPasswordPage;

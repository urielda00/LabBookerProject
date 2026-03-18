import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../components/common/FormInput';
import AuthButton from '../components/auth/AuthButton';
import collegeBuilding from '../assets/collegeBuilding.jpg';
import Message from "../components/common/Error_successMessage";
import useAuth from '../hooks/useAuth';

const ForgotPasswordPage = () => {
	const navigate = useNavigate();

	// Use custom hook for logic and state
	const {
		isLoading,
		error,
		successMessage,
		forgotPassword,
		validateResetCode,
		setError,
		setSuccessMessage,
	} = useAuth();

	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [step, setStep] = useState(1);

	const handleEmailSubmit = async (e) => {
		e.preventDefault();

		// Call service via hook
		const success = await forgotPassword(email);

		if (success) {
			setStep(2);
			// Store email for the next step and the reset password page
			localStorage.setItem('email', email);
		}
	};

	const handleCodeSubmit = async (e) => {
		e.preventDefault();

		const storedEmail = localStorage.getItem('email');
		if (!storedEmail) {
			setError('Email not found. Please try again.');
			return;
		}

		// Call service via hook
		const success = await validateResetCode(storedEmail, code);

		if (success) {
			// Redirect after success message is shown
			setTimeout(() => navigate('/resetpassword'), 2000);
		}
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
				<div className='w-full sm:w-[640px] p-10 bg-black bg-opacity-30 shadow-lg rounded-lg flex flex-col lg:flex-row'>
					<div className='w-full p-6'>
						<div className='text-center'>
							<h4 className='mb-4 text-4xl font-extrabold text-white'>
								{step === 1 ? 'Forgot password?' : 'Enter Verification Code'}
							</h4>
							<p className='mt-2 text-sm text-white'>
								{step === 1
									? "Enter your email address to reset your password. We'll send a verification code to your email."
									: 'Check your email for the verification code.'}
							</p>
						</div>

						<div className='mt-5'>
							{step === 1 ? (
								<form onSubmit={handleEmailSubmit}>
									<FormInput
										type='email'
										name='email'
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											setError(''); // Clear errors on typing
										}}
										label='Email address'
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
									<div className='mt-4'>
										<AuthButton isSubmitting={isLoading} label='Reset password' />
									</div>
								</form>
							) : (
								<form onSubmit={handleCodeSubmit}>
									<FormInput
										type='text'
										name='code'
										value={code}
										onChange={(e) => {
											setCode(e.target.value);
											setError('');
										}}
										label='Verification Code'
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
									<div className='mt-4'>
										<AuthButton isSubmitting={isLoading} label='Verify Code' />
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ForgotPasswordPage;

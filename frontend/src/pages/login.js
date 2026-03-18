import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService'; // Imported for specific actions like checkAuth/resend
import collegeLogoWhite from '../assets/collegeLogoWhite.png';

// Importing shared components to maintain consistency
import FormInput from '../components/common/FormInput';
import AuthButton from '../components/auth/AuthButton';

// Local ErrorMessage component to preserve specific login page styling
const ErrorMessage = ({ message, onClose, className }) => {
	if (!message) return null;

	return (
		<div
			className={`bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mt-4 ${className}`}
		>
			<div className='flex justify-between items-center'>
				<p className='text-sm'>{message}</p>
				<button onClick={onClose} className='text-red-500 hover:text-red-400 focus:outline-none'>
					×
				</button>
			</div>
		</div>
	);
};

const LogInPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();

	// Custom hook for auth logic
	const { isLoading, error, login, verifyLogin, setError } = useAuth();

	const [stage, setStage] = useState('email');
	const [formData, setFormData] = useState({ email: '', verificationCode: '' });
	const [resendDisabled, setResendDisabled] = useState(false);
	const [resendTimer, setResendTimer] = useState(0);

	// Check if user is already logged in
	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem('token');
			const user = localStorage.getItem('user');

			if (token && user) {
				try {
					await authService.verifyToken();
					navigate('/homepage');
				} catch {
					localStorage.clear();
				}
			}
		};
		checkAuth();
	}, [navigate]);

	// Handle Resend Timer
	useEffect(() => {
		let interval;
		if (resendTimer > 0) {
			interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
		} else {
			setResendDisabled(false);
		}
		return () => clearInterval(interval);
	}, [resendTimer]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		setError(''); // Clear error using the hook's setter
	};

	const handleEmailSubmit = async (e) => {
		e.preventDefault();

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			setError(t('login.errors.invalidEmailFormat'));
			return;
		}

		// Attempt login
		const success = await login(formData.email);
		if (success) {
			setStage('verification');
			setResendDisabled(true);
			setResendTimer(30);
		}
	};

	const handleVerificationSubmit = async (e) => {
		e.preventDefault();
		const from = location.state?.from?.pathname || '/homepage';
		// verifyLogin handles navigation internally on success
		await verifyLogin(formData.email, formData.verificationCode, from);
	};

	const handleResendCode = async () => {
		if (resendDisabled) return;

		// We use authService directly here as this is a UI-specific minor action
		// that doesn't necessarily need a full global state transition
		try {
			await authService.resendCode(formData.email);
			setResendDisabled(true);
			setResendTimer(30);
			setError(''); // Clear any previous errors
		} catch (error) {
			// Manual error handling for this specific action if needed,
			// or use setError from hook to display it in the main alert
			setError(error.response?.data?.message || t('login.errors.unexpected'));
		}
	};

	const renderEmailForm = () => (
		<form onSubmit={handleEmailSubmit} className='space-y-6' noValidate>
			<div className='text-center'>
				<h2 className='text-xl text-white font-semibold mb-2'>{t('login.welcomeBack')}</h2>
				<p className='text-gray-400 text-sm'>{t('login.signInToAccount')}</p>
			</div>

			<FormInput
				type='email'
				name='email'
				label={t('login.emailLabel')}
				value={formData.email}
				onChange={handleChange}
				placeholder={t('login.emailPlaceholder')}
				required
			/>

			<AuthButton isSubmitting={isLoading} label={t('login.continue')} />

			<ErrorMessage message={error} onClose={() => setError('')} />
		</form>
	);

	const renderVerificationForm = () => (
		<form onSubmit={handleVerificationSubmit} className='space-y-6'>
			<div className='text-center'>
				<h2 className='text-xl text-white font-semibold mb-2'>
					{t('login.enterVerificationCode')}
				</h2>
				<p className='text-gray-400 text-sm'>
					{t('login.codeSentTo')}
					<br />
					<span className='font-medium text-gray-300'>{formData.email}</span>
				</p>
			</div>

			<FormInput
				name='verificationCode'
				label={t('login.codeLabel')}
				value={formData.verificationCode}
				onChange={handleChange}
				placeholder={t('login.codePlaceholder')}
				maxLength={6}
				required
				className='text-center tracking-widest text-lg'
			/>

			<div className='space-y-4'>
				<AuthButton isSubmitting={isLoading} label={t('login.verify')} />

				<div className='flex flex-col space-y-2'>
					<button
						type='button'
						className='text-sm text-gray-400 hover:text-white transition-colors duration-300'
						onClick={() => setStage('email')}
					>
						{t('login.backToEmail')}
					</button>
					<button
						type='button'
						className={`text-sm ${
							resendDisabled
								? 'text-gray-500 cursor-not-allowed'
								: 'text-blue-400 hover:text-blue-300 transition-colors duration-300'
						}`}
						onClick={handleResendCode}
						disabled={resendDisabled}
					>
						{resendTimer > 0
							? t('login.resendCodeIn', { seconds: resendTimer })
							: t('login.resendCode')}
					</button>
				</div>

				<ErrorMessage message={error} onClose={() => setError('')} />
			</div>
		</form>
	);

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<div className='sm:mx-auto sm:w-full sm:max-w-md'>
				<div dir='ltr' className='flex items-center justify-center space-x-3 mb-8'>
					<img
						className='w-16 md:w-20 h-auto object-contain drop-shadow-xl'
						src={collegeLogoWhite}
						alt='logo'
					/>
					<div className='border-l border-gray-600 pl-3'>
						<h4 className='text-2xl md:text-3xl font-bold text-white tracking-wider'>LabBooker</h4>
						<p className='text-xs md:text-sm text-gray-400'> {t('common.collegeName')}</p>
					</div>
				</div>

				<div className='bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-8 sm:px-10'>
					{stage === 'email' ? renderEmailForm() : renderVerificationForm()}
				</div>

				<div className='mt-8 text-center'>
					<p className='text-gray-400'>
						{t('login.dontHaveAccount')}{' '}
						<button
							onClick={() => navigate('/signup')}
							className='text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300'
						>
							{t('login.signup')}
						</button>
					</p>
				</div>
			</div>
		</div>
	);
};

export default LogInPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import collegeLogoWhite from '../assets/collegeLogoWhite.png';

// Import shared components
import FormInput from '../components/common/FormInput';
import AuthButton from '../components/auth/AuthButton';

// Local ErrorMessage component to preserve specific page styling
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

const SignUpPage = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();

	// Custom hook for auth logic
	const { isLoading, error, signup, verifySignup, setError } = useAuth();

	const [stage, setStage] = useState('details');
	const [formData, setFormData] = useState({
		username: '',
		name: '',
		email: '',
		verificationCode: '',
	});

	// Local validation errors (e.g. required fields before submitting)
	const [validationErrors, setValidationErrors] = useState({});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear specific field validation error
		if (validationErrors[name]) {
			setValidationErrors((prev) => ({ ...prev, [name]: '' }));
		}
		// Clear global API error
		if (error) setError('');
	};

	const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError('');

    // Check if all required fields are filled
    if (!formData.username || !formData.name || !formData.email) {
      setError(t('signup.errors.fillAllFields') || 'All fields are required');
      return;
    }

    // Simple Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('signup.errors.invalidEmail'));
      return;
    }

    // Call signup from hook
    const success = await signup({
      username: formData.username,
      name: formData.name,
      email: formData.email,
    });

    if (success) {
      setStage('verification');
    }
  };

	const handleVerificationSubmit = async (e) => {
		e.preventDefault();
		// Call verifySignup from hook (handles navigation to login internally on success)
		await verifySignup(formData.email, formData.verificationCode);
	};

	const renderDetailsForm = () => (
		<form onSubmit={handleDetailsSubmit} className='space-y-6' noValidate>
			<div className='text-center'>
				<h2 className='text-xl text-white font-semibold mb-2'>{t('signup.createAccount')}</h2>
				<p className='text-gray-400 text-sm'>{t('signup.fillDetails')}</p>
			</div>

			<FormInput
				name='username'
				label={t('signup.username')}
				value={formData.username}
				onChange={handleChange}
				error={validationErrors.username}
				placeholder={t('signup.usernamePlaceholder')}
				required
			/>
			<FormInput
				name='name'
				label={t('signup.name')}
				value={formData.name}
				onChange={handleChange}
				error={validationErrors.name}
				placeholder={t('signup.namePlaceholder')}
				required
			/>
			<FormInput
				name='email'
				label={t('signup.email')}
				type='email'
				value={formData.email}
				onChange={handleChange}
				error={validationErrors.email}
				placeholder={t('signup.emailPlaceholder')}
				required
			/>

			<AuthButton isSubmitting={isLoading} label={t('signup.continue')} />

			<ErrorMessage message={error} onClose={() => setError('')} />
		</form>
	);

	const renderVerificationForm = () => (
		<form onSubmit={handleVerificationSubmit} className='space-y-6'>
			<div className='text-center'>
				<h2 className='text-xl text-white font-semibold mb-2'>{t('signup.verifyEmail')}</h2>
				<p className='text-gray-400 text-sm'>
					{t('signup.codeSentTo')}
					<br />
					<span className='font-medium text-gray-300'>{formData.email}</span>
				</p>
			</div>

			<FormInput
				name='verificationCode'
				label={t('signup.verificationCode')}
				value={formData.verificationCode}
				onChange={handleChange}
				placeholder={t('signup.verificationCodePlaceholder')}
				maxLength={6}
				className='text-center tracking-widest text-lg'
				required
			/>

			<div className='space-y-4'>
				<AuthButton isSubmitting={isLoading} label={t('signup.verify')} />

				<button
					type='button'
					className='text-sm text-gray-400 hover:text-white transition-colors duration-300 block mx-auto'
					onClick={() => setStage('details')}
				>
					{t('signup.backToDetails')}
				</button>

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
						<p className='text-xs md:text-sm text-gray-400'>{t('common.collegeName')}</p>{' '}
					</div>
				</div>

				<div className='bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl px-4 py-8 sm:px-10'>
					{stage === 'details' ? renderDetailsForm() : renderVerificationForm()}
				</div>

				<div className='mt-8 text-center'>
					<p className='text-gray-400'>
						{t('signup.alreadyHaveAccount')}{' '}
						<button
							onClick={() => navigate('/login')}
							className='text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300'
						>
							{t('signup.login')}
						</button>
					</p>
				</div>
			</div>
		</div>
	);
};

export default SignUpPage;

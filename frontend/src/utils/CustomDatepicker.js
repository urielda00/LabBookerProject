import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
const themes = {
	blue: {
		primary: 'blue',
		selected: 'bg-blue-600 dark:bg-blue-700',
		hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/30',
		text: 'text-blue-600 dark:text-blue-400',
		border: 'border-blue-600 dark:border-blue-500',
		hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/20',
		hoverDark: 'hover:bg-blue-700 dark:hover:bg-blue-600',
		focus:
			'focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-500 dark:focus:border-blue-500',
	},
	green: {
		primary: 'green',
		selected: 'bg-green-500 dark:bg-green-600',
		hover: 'hover:bg-green-50 dark:hover:bg-green-900/30',
		text: 'text-green-500 dark:text-green-400',
		border: 'border-green-500 dark:border-green-500',
		hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/20',
		hoverDark: 'hover:bg-green-600 dark:hover:bg-green-500',
		focus:
			'focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-500 dark:focus:border-green-500',
	},
};

const CustomDatepicker = ({
	onDateChange,
	placeholder = 'Select a date',
	availableDates = [],
	theme = 'blue', // New theme prop with default value
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState(null);
	const [currentDate, setCurrentDate] = useState(new Date());
	const popupRef = useRef(null);
	const { t, i18n } = useTranslation();
	const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
	const currentTheme = themes[theme] || themes.blue;

	// Helper functions
	const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	const getStartDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

	const formatDate = (date) => {
		const year = date.getFullYear();
		const month = `0${date.getMonth() + 1}`.slice(-2);
		const day = `0${date.getDate()}`.slice(-2);
		return `${year}-${month}-${day}`;
	};

	// Close the calendar if clicking outside the popup overlay
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (popupRef.current && !popupRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	// Handlers for month navigation
	const handlePrevMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	};

	const handleNextMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	};

	// When a day cell is clicked, update the selected date (only if that date is available)
	const handleDayClick = (day, isDayAvailable) => {
		if (!isDayAvailable) return;
		const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
		setSelectedDate(newDate);
	};

	// Footer button handlers
	const handleCancelDate = () => {
		setSelectedDate(null);
		setCurrentDate(new Date());
		setIsOpen(false);
	};

	const handleApply = () => {
		if (selectedDate) {
			onDateChange(selectedDate);
		}
		setIsOpen(false);
	};

	// Today button handler
	const handleToday = () => {
		const today = new Date();
		setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
		setSelectedDate(today);
	};

	// Generate day cells
	const daysInMonth = getDaysInMonth(currentDate);
	const dayCells = [];

	// Add empty cells for offset
	const startDay = getStartDay(currentDate);
	for (let i = 0; i < startDay; i++) {
		dayCells.push(<div key={`empty-${i}`} className='w-10 h-10'></div>);
	}

	// Update day cells with themed classes
	for (let day = 1; day <= daysInMonth; day++) {
		const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
		const dateStr = formatDate(thisDate);
		const todayStr = formatDate(new Date());
		const isToday = dateStr === todayStr;
		const isDayAvailable = availableDates.includes(dateStr);
		const isSel = selectedDate && formatDate(selectedDate) === dateStr;

		dayCells.push(
			<div
				key={day}
				onClick={() => handleDayClick(day, isDayAvailable)}
				className={`flex items-center justify-center cursor-pointer w-10 h-10 rounded-full transition duration-150 
          ${
						isDayAvailable
							? isSel
								? `${currentTheme.selected} text-white`
								: `dark:text-gray-200 ${currentTheme.hover} text-gray-700`
							: 'opacity-50 cursor-not-allowed dark:text-gray-500'
					}`}
			>
				{day}
			</div>
		);
	}

	// Format current month text (e.g., "January 2025")
	const monthYearText = currentDate.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});

	return (
		<div className='relative'>
			{/* Input Field */}
			<div className='relative flex items-center'>
				<span className='absolute left-4 text-gray-500'>
					{/* Calendar Icon */}
					<svg className='fill-current' width='20' height='20' viewBox='0 0 20 20'>
						<path d='M17.5 3.3125H15.8125V2.625C15.8125 2.25 15.5 1.90625 15.0937 1.90625C14.6875 1.90625 14.375 2.21875 14.375 2.625V3.28125H5.59375V2.625C5.59375 2.25 5.28125 1.90625 4.875 1.90625C4.46875 1.90625 4.15625 2.21875 4.15625 2.625V3.28125H2.5C1.4375 3.28125 0.53125 4.15625 0.53125 5.25V16.125C0.53125 17.1875 1.40625 18.0937 2.5 18.0937H17.5C18.5625 18.0937 19.4687 17.2187 19.4687 16.125V5.25C19.4687 4.1875 18.5625 3.3125 17.5 3.3125ZM2.5 4.71875H4.1875V5.34375C4.1875 5.71875 4.5 6.0625 4.90625 6.0625C5.3125 6.0625 5.625 5.75 5.625 5.34375V4.71875H14.4687V5.34375C14.4687 5.71875 14.7812 6.0625 15.1875 6.0625C15.5937 6.0625 15.9062 5.75 15.9062 5.34375V4.71875H17.5C17.8125 4.71875 18.0625 4.96875 18.0625 5.28125V7.34375H1.96875V5.28125C1.96875 4.9375 2.1875 4.71875 2.5 4.71875Z' />
					</svg>
				</span>
				<input
					type='text'
					readOnly
					value={selectedDate ? selectedDate.toLocaleDateString() : ''}
					placeholder={placeholder}
					className={`w-full bg-transparent pl-12 pr-8 py-2.5 border rounded-lg text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 transition focus:outline-none focus:ring-2 ${currentTheme.focus} dark:bg-gray-800 dark:placeholder-gray-400`}
					onClick={() => setIsOpen(true)}
				/>
				<span
					className='absolute right-4 text-gray-500 cursor-pointer'
					onClick={() => setIsOpen(true)}
				>
					{/* Down Arrow Icon */}
					<svg className='fill-current' width='16' height='16' viewBox='0 0 16 16'>
						<path d='M2.29635 5.15354L7.65055 10.3827L8.00157 10.7255L8.35095 10.381L13.701 5.10603C13.7035 5.10354 13.722 5.08499 13.7499 5.08124C13.7613 5.08124 13.7778 5.08499 13.7963 5.10354C13.8149 5.12209 13.8187 5.13859 13.8187 5.14999C13.8187 5.1612 13.815 5.17734 13.7973 5.19552L8.04946 10.8433L8.04635 10.8464C8.01594 10.8768 7.99586 10.8921 7.98509 10.8992C7.97746 10.8983 7.97257 10.8968 7.96852 10.8952C7.96226 10.8929 7.94944 10.887 7.92872 10.8721L2.20253 5.2455C2.18478 5.22733 2.18115 5.2112 2.18115 5.19999C2.18115 5.18859 2.18491 5.17209 2.20346 5.15354C2.222 5.13499 2.2385 5.13124 2.2499 5.13124C2.2613 5.13124 2.2778 5.13499 2.29635 5.15354Z' />
					</svg>
				</span>
			</div>

			{/* Calendar Popup as a fixed, centered overlay */}
			{isOpen && (
				<div className='fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40'>
					<div
						ref={popupRef}
						className='bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-xl dark:shadow-gray-950/50 w-full max-w-md mx-4'
					>
						{/* Calendar Header */}
						<div className='flex items-center justify-between px-5 py-2 border-b border-gray-200'>
							<button
								onClick={handlePrevMonth}
								className='px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md'
							>
								<svg className='fill-current' width='20' height='20' viewBox='0 0 20 20'>
									<path d='M13.5312 17.9062C13.3437 17.9062 13.1562 17.8438 13.0312 17.6875L5.96875 10.5C5.6875 10.2187 5.6875 9.78125 5.96875 9.5L13.0312 2.3125C13.3125 2.03125 13.75 2.03125 14.0312 2.3125C14.3125 2.59375 14.3125 3.03125 14.0312 3.3125L7.46875 10L14.0625 16.6875C14.3438 16.9688 14.3438 17.4062 14.0625 17.6875C13.875 17.8125 13.7187 17.9062 13.5312 17.9062Z' />
								</svg>
							</button>
							<div className='text-lg font-medium text-gray-700 dark:text-gray-200'>
								{monthYearText}
							</div>
							<button
								onClick={handleNextMonth}
								className='px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md'
							>
								<svg className='fill-current' width='20' height='20' viewBox='0 0 20 20'>
									<path d='M6.46875 17.9063C6.28125 17.9063 6.125 17.8438 5.96875 17.7188C5.6875 17.4375 5.6875 17 5.96875 16.7188L12.5312 10L5.96875 3.3125C5.6875 3.03125 5.6875 2.59375 5.96875 2.3125C6.25 2.03125 6.6875 2.03125 6.96875 2.3125L14.0313 9.5C14.3125 9.78125 14.3125 10.2187 14.0313 10.5L6.96875 17.6875C6.84375 17.8125 6.65625 17.9063 6.46875 17.9063Z' />
								</svg>
							</button>
						</div>

						{/* Optional Today Button */}
						<div className='px-5 py-1 border-b border-gray-200 flex justify-end'>
							<button
								onClick={handleToday}
								className={`text-sm font-medium ${currentTheme.text} hover:underline dark:hover:text-${currentTheme.primary}-300`}
							>
								{t('datepicker.buttons.today')}
							</button>
						</div>

						{/* Weekday Labels */}
						<div className='grid grid-cols-7 gap-2 p-4'>
							{[
								t('datepicker.weekDays.sunday'),
								t('datepicker.weekDays.monday'),
								t('datepicker.weekDays.tuesday'),
								t('datepicker.weekDays.wednesday'),
								t('datepicker.weekDays.thursday'),
								t('datepicker.weekDays.friday'),
								t('datepicker.weekDays.saturday'),
							].map((day) => (
								<div
									key={day}
									className='text-center text-sm font-medium text-gray-600 dark:text-gray-400'
								>
									{day}
								</div>
							))}
						</div>

						{/* Days Grid */}
						<div className='grid grid-cols-7 gap-2 mt-2 px-5 pb-5'>{dayCells}</div>

						{/* Footer Buttons */}
						<div className='flex justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-700'>
							<button
								onClick={handleCancelDate}
								className={`px-5 py-2 text-base font-medium ${currentTheme.text} ${currentTheme.border} rounded-lg ${currentTheme.hoverBg}`}
							>
								{t('datepicker.buttons.cancel')}
							</button>
							<button
								onClick={handleApply}
								className={`ml-2 px-5 py-2 text-base font-medium ${currentTheme.selected} text-white rounded-lg ${currentTheme.hoverDark}`}
							>
								{t('datepicker.buttons.apply')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CustomDatepicker;

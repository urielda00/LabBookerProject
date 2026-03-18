import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash, FaChevronDown } from 'react-icons/fa';

const FAQEditor = ({ initialSections, onSave, onCancel }) => {
	const [sections, setSections] = useState(initialSections);
	const [activeSection, setActiveSection] = useState(null);

	const handleQuestionChange = (sectionKey, index, field, value) => {
		setSections((prevSections) => {
			const updatedSection = [...prevSections[sectionKey]];
			updatedSection[index] = { ...updatedSection[index], [field]: value };
			return { ...prevSections, [sectionKey]: updatedSection };
		});
	};

	const addQuestion = (sectionKey) => {
		setSections((prevSections) => ({
			...prevSections,
			[sectionKey]: [...prevSections[sectionKey], { question: '', answer: '', id: Date.now() }],
		}));
	};

	const deleteQuestion = (sectionKey, index) => {
		setSections((prevSections) => {
			const updatedSection = prevSections[sectionKey].filter((_, i) => i !== index);
			return { ...prevSections, [sectionKey]: updatedSection };
		});
	};

	const toggleSection = (sectionKey) => {
		setActiveSection(activeSection === sectionKey ? null : sectionKey);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700'
		>
			<div className='space-y-6'>
				{Object.keys(sections).map((sectionKey) => (
					<div key={sectionKey} className='border rounded-lg border-gray-200 dark:border-gray-700'>
						<button
							onClick={() => toggleSection(sectionKey)}
							className='w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-t-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors'
						>
							<h3 className='text-xl font-semibold text-gray-800 dark:text-gray-200'>
								{sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
							</h3>
							<FaChevronDown
								className={`transform transition-transform ${
									activeSection === sectionKey ? 'rotate-180' : ''
								} text-gray-600 dark:text-gray-300`}
							/>
						</button>

						{activeSection === sectionKey && (
							<div className='p-4 space-y-4 bg-white dark:bg-gray-800'>
								{sections[sectionKey].map((question, index) => (
									<div
										key={question.id}
										className='space-y-2 border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0'
									>
										<div className='flex gap-2'>
											<input
												type='text'
												value={question.question}
												onChange={(e) =>
													handleQuestionChange(sectionKey, index, 'question', e.target.value)
												}
												className='w-full p-2 border rounded-lg text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600'
												placeholder='Question'
											/>
											<button
												onClick={() => deleteQuestion(sectionKey, index)}
												className='p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
												title='Delete Question'
											>
												<FaTrash />
											</button>
										</div>
										<textarea
											value={question.answer}
											onChange={(e) =>
												handleQuestionChange(sectionKey, index, 'answer', e.target.value)
											}
											className='w-full p-2 border rounded-lg text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600'
											placeholder='Answer'
											rows='3'
										/>
									</div>
								))}

								<button
									onClick={() => addQuestion(sectionKey)}
									className='w-full flex items-center justify-center gap-2 p-2 mt-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors dashed border border-blue-200 dark:border-blue-800'
								>
									<FaPlus className='inline-block' />
									Add New Question
								</button>
							</div>
						)}
					</div>
				))}

				<div className='flex justify-end gap-4 mt-6'>
					<button
						onClick={onCancel}
						className='px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
					>
						Cancel
					</button>
					<button
						onClick={() => onSave(sections)}
						className='px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm'
					>
						Save Changes
					</button>
				</div>
			</div>
		</motion.div>
	);
};

export default FAQEditor;

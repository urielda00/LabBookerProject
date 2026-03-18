import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
import api from '../../utils/axiosConfig';
import {
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Clock,
	Server,
	HardDrive,
	Cloud,
	Activity,
	ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SERVICE_ICONS = {
	database: Server,
	redis: HardDrive,
	cloudinary: Cloud,
};

const STATUS_LEVELS = {
	operational: {
		color: 'bg-green-100 text-green-800',
		icon: CheckCircle2,
		label: 'Operational',
	},
	degraded: {
		color: 'bg-yellow-100 text-yellow-800',
		icon: AlertTriangle,
		label: 'Degraded',
	},
	outage: {
		color: 'bg-red-100 text-red-800',
		icon: XCircle,
		label: 'Outage',
	},
};

const StatusHistoryPage = () => {
	const navigate = useNavigate();
	const [history, setHistory] = useState([]); // Initialize as empty array
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchHistory = async () => {
			try {
				const response = await api.get('/health/healthy/history');
				// Adjust for the backend response structure
				const historyData = response.data.history || [];
				setHistory(historyData);
			} catch (err) {
				setError('Failed to load status history');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchHistory();
	}, []);

	if (loading) {
		return (
			<div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center'>
				<div className='flex flex-col items-center gap-4'>
					<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400'></div>
					<p className='text-gray-600 dark:text-gray-400'>Loading history...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center'>
				<div className='text-center max-w-md'>
					<XCircle className='h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4' />
					<h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
						Failed to load history
					</h2>
					<p className='text-gray-600 dark:text-gray-400 mb-4'>{error}</p>
					<button
						onClick={() => window.location.reload()}
						className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8'>
			<div className='max-w-6xl mx-auto'>
				<div className='mb-8'>
					<button
						onClick={() => navigate(-1)}
						className='flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors'
					>
						<ChevronLeft className='w-5 h-5' />
						<span className='font-medium'>Back to Dashboard</span>
					</button>

					<div className='mt-6 space-y-2'>
						<h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
							System Status History
						</h1>
						<p className='text-gray-600 dark:text-gray-400'>
							Historical records of system performance and incidents
						</p>
					</div>
				</div>

				<div className='space-y-6'>
					{history.length > 0 ? (
						history.map((entry, index) => {
							const statusConfig = STATUS_LEVELS[entry.status] || STATUS_LEVELS.outage;
							const date = new Date(entry.timestamp);

							return (
								<div
									key={index}
									className={`group relative rounded-xl p-6 shadow-sm transition-all 
                    ${statusConfig.color} 
                    hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-800/30
                    border border-transparent hover:border-opacity-20
                    dark:${statusConfig.color.replace('bg-', 'bg-opacity-20 dark:bg-')}`}
								>
									<div className='flex flex-col sm:flex-row justify-between gap-4 mb-4'>
										<div className='flex items-center gap-3'>
											<statusConfig.icon className='w-6 h-6 flex-shrink-0' />
											<div>
												<h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
													{statusConfig.label}
												</h3>
												<p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
													{entry.status === 'operational'
														? 'All systems functioning normally'
														: 'Service degradation detected'}
												</p>
											</div>
										</div>

										<div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
											<Clock className='w-5 h-5 flex-shrink-0' />
											<span className='whitespace-nowrap'>
												{date.toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'short',
													day: 'numeric',
												})}
												<span className='mx-1'>•</span>
												{date.toLocaleTimeString('en-US', {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</span>
										</div>
									</div>

									{entry.services && Object.keys(entry.services).length > 0 && (
										<div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
											<h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4'>
												Service Status Details
											</h4>
											<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
												{Object.entries(entry.services).map(([service, details]) => {
													const IconComponent = SERVICE_ICONS[service] || Activity;
													const isOperational = details?.status === 'operational';

													return (
														<div
															key={service}
															className='flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700'
														>
															<IconComponent className='w-5 h-5 mt-1 flex-shrink-0 text-gray-600 dark:text-gray-400' />
															<div className='flex-1 min-w-0'>
																<div className='flex items-center justify-between gap-2'>
																	<span className='font-medium text-gray-900 dark:text-gray-200 capitalize'>
																		{service}
																	</span>
																	<span
																		className={`px-2 py-1 rounded-full text-xs font-medium ${
																			isOperational
																				? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
																				: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
																		}`}
																	>
																		{details?.status || 'unknown'}
																	</span>
																</div>

																{details?.latency && (
																	<div className='mt-2 flex items-center gap-2'>
																		<span className='text-xs text-gray-500 dark:text-gray-400'>
																			Latency:
																		</span>
																		<div
																			className={`h-2 rounded-full flex-1 ${
																				details.latency < 300
																					? 'bg-green-500'
																					: details.latency < 500
																					? 'bg-yellow-500'
																					: 'bg-red-500'
																			}`}
																			style={{ width: `${Math.min(details.latency / 10, 100)}%` }}
																		/>
																		<span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
																			{details.latency}ms
																		</span>
																	</div>
																)}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className='text-center py-12 rounded-xl bg-white dark:bg-gray-800 shadow-xs'>
							<div className='text-gray-400 dark:text-gray-500 mb-4'>
								<Activity className='h-12 w-12 mx-auto' />
							</div>
							<h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
								No historical data available
							</h3>
							<p className='text-gray-500 dark:text-gray-400 mt-2'>
								System status history will appear here when available
							</p>
						</div>
					)}
				</div>

				<div className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400'>
					Last updated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
				</div>
			</div>
		</div>
	);
};

export default StatusHistoryPage;

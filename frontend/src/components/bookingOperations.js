import OperationsToolbar from './common/OperationsToolbar';
import { Calendar, Edit, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BookingOperations = ({ setOperation, setBookingId, setBookingDetails, operation }) => {
	const { t } = useTranslation();

	const handleActionChange = (newOperation) => {
		setOperation(newOperation);
		// Logic specific to Bookings
		if (newOperation !== 'create') {
			setBookingId('');
			setBookingDetails(null);
		}
	};

	const actions = [
		{ id: 'create', label: t('createBookingByNames.createBooking'), icon: Calendar },
		{ id: 'update', label: t('updateBooking.update'), icon: Edit },
		{ id: 'delete', label: t('deleteBooking.title'), icon: Trash },
	];

	return (
		<OperationsToolbar
			actions={actions}
			activeAction={operation}
			onActionChange={handleActionChange}
		/>
	);
};

export default BookingOperations;

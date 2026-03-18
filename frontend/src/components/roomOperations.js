import React from 'react';
import OperationsToolbar from './common/OperationsToolbar';
import { Plus, Edit, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RoomOperations = ({ operation, setOperation }) => {
	const { t } = useTranslation();

	// הגדרת הפעולות האפשריות
	const actions = [
		{ id: 'create', label: t('roomPage.operations.create'), icon: Plus },
		{ id: 'update', label: t('roomPage.operations.update'), icon: Edit },
		{ id: 'delete', label: t('roomPage.operations.delete'), icon: Trash },
	];

	// כאן אנחנו רק מעבירים את הבחירה לדף האב (RoomPage)
	// שמטפל בלוגיקה של איפוס הנתונים (setRoomId וכו')
	return (
		<OperationsToolbar actions={actions} activeAction={operation} onActionChange={setOperation} />
	);
};

export default RoomOperations;

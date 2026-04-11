import { Alert } from 'react-native';

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message && typeof error.message === 'string') return error.message;
  return fallback;
};

export const showActionError = (
  title = 'Action Failed',
  error,
  fallbackMessage = 'Please try again.'
) => {
  Alert.alert(title, getErrorMessage(error, fallbackMessage));
};


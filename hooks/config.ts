import Constants from 'expo-constants';
import { Platform } from 'react-native';

const resolveHost = () => {
	if (process.env.EXPO_PUBLIC_API_HOST) {
		return process.env.EXPO_PUBLIC_API_HOST;
	}

	const hostUri = Constants.expoConfig?.hostUri ?? '';
	const manifestHost = hostUri ? hostUri.split(':')[0] : undefined;
	if (manifestHost) {
		return manifestHost;
	}

	const manifestExtras = (Constants as Record<string, any>)?.manifest2?.extra ?? Constants.expoConfig?.extra;
	const manifestExtraHost = manifestExtras?.apiHost;
	if (manifestExtraHost) {
		return String(manifestExtraHost);
	}

	return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const resolvePort = () => {
	if (process.env.EXPO_PUBLIC_API_PORT) {
		return process.env.EXPO_PUBLIC_API_PORT;
	}

	const manifestExtras = (Constants as Record<string, any>)?.manifest2?.extra ?? Constants.expoConfig?.extra;
	const portFromExtra = manifestExtras?.apiPort;
	if (portFromExtra) {
		return String(portFromExtra);
	}

	return Platform.select({
		ios: '5001',
		android: '5001',
		macos: '5001',
		default: '5001',
	});
};

const protocol = process.env.EXPO_PUBLIC_API_PROTOCOL ?? 'http';
const host = resolveHost();
const port = resolvePort();

export const BASE_URL = `${protocol}://${host}${port ? `:${port}` : ''}`;


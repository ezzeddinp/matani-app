import { Platform } from 'react-native';

const DEFAULT_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL ?? 'http';
const DEFAULT_HOST = process.env.EXPO_PUBLIC_API_HOST ?? '192.168.1.2';

const platformPort = Platform.select({
	ios: '5173',
	macos: '5173',
	default: '5000',
});

const port = process.env.EXPO_PUBLIC_API_PORT ?? platformPort ?? '5000';

export const BASE_URL = `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${port}`;


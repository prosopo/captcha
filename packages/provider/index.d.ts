declare global {
	namespace Express {
		interface Request {
			t: (...args: any) => void;
		}
	}
}

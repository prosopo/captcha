export interface BrowserInfo {
	name: string;
	version?: string;
	major?: string;
	type?: string;
}

export interface CPUInfo {
	architecture?: string;
}

export interface DeviceInfo {
	vendor?: string;
	model?: string;
	type?: string;
}

export interface EngineInfo {
	name?: string;
	version?: string;
}

export interface OSInfo {
	name: string;
	version?: string;
}

export interface UserAgentInfo {
	ua: string;
	browser: BrowserInfo;
	cpu: CPUInfo;
	device: DeviceInfo;
	engine: EngineInfo;
	os: OSInfo;
}
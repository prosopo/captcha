import { z } from 'zod';
export declare const ProsopoConfigSchema: z.ZodObject<{
    defaultEnvironment: z.ZodString;
    networks: z.ZodObject<{
        development: z.ZodObject<{
            endpoint: z.ZodString;
            contract: z.ZodObject<{
                address: z.ZodString;
                deployer: z.ZodObject<{
                    address: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    address: string;
                }, {
                    address: string;
                }>;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            }, {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        }, {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        development: {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        };
    }, {
        development: {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        };
    }>;
    captchas: z.ZodObject<{
        solved: z.ZodObject<{
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
        }, {
            count: number;
        }>;
        unsolved: z.ZodObject<{
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
        }, {
            count: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        solved: {
            count: number;
        };
        unsolved: {
            count: number;
        };
    }, {
        solved: {
            count: number;
        };
        unsolved: {
            count: number;
        };
    }>;
    database: z.ZodObject<{
        development: z.ZodObject<{
            type: z.ZodString;
            endpoint: z.ZodString;
            dbname: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            endpoint: string;
            dbname: string;
        }, {
            type: string;
            endpoint: string;
            dbname: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        development: {
            type: string;
            endpoint: string;
            dbname: string;
        };
    }, {
        development: {
            type: string;
            endpoint: string;
            dbname: string;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    captchas: {
        solved: {
            count: number;
        };
        unsolved: {
            count: number;
        };
    };
    defaultEnvironment: string;
    networks: {
        development: {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        };
    };
    database: {
        development: {
            type: string;
            endpoint: string;
            dbname: string;
        };
    };
}, {
    captchas: {
        solved: {
            count: number;
        };
        unsolved: {
            count: number;
        };
    };
    defaultEnvironment: string;
    networks: {
        development: {
            contract: {
                address: string;
                deployer: {
                    address: string;
                };
                name: string;
            };
            endpoint: string;
        };
    };
    database: {
        development: {
            type: string;
            endpoint: string;
            dbname: string;
        };
    };
}>;
export declare type ProsopoConfig = z.infer<typeof ProsopoConfigSchema>;

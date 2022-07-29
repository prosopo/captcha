export class LocalStorageMock {

    private store: {[key: string]: string};

    constructor() {
        this.store = {};
    }
  
    clear() {
        this.store = {};
    }
  
    getItem(key: string) {
        return this.store[key] || null;
    }
  
    setItem(key: string, value: any) {
        this.store[key] = String(value);
    }
  
    removeItem(key: string) {
        delete this.store[key];
    }

}

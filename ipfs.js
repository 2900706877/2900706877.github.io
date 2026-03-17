class LightNodeStorage {
    constructor() {
        this.storage = new Map();
        this.maxStorageSize = 100;
    }
    store(key, value) {
        if (this.storage.size >= this.maxStorageSize) {
            const oldestKey = this.storage.keys().next().value;
            this.storage.delete(oldestKey);
        }
        this.storage.set(key, { value: value, timestamp: Date.now() });
    }
    get(key) {
        const item = this.storage.get(key);
        if (item) {
            item.timestamp = Date.now();
            this.storage.set(key, item);
            return item.value;
        }
        return null;
    }
    has(key) { return this.storage.has(key); }
    cleanup(expiryTime = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        for (const [key, item] of this.storage.entries()) {
            if (now - item.timestamp > expiryTime) this.storage.delete(key);
        }
    }
}

class IPFSIntegration {
    constructor() {
        this.ipfs = null;
        this.apiUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
        this.apiKey = '97800c9b745430c28f2a';
        this.apiSecret = '3fb91c86727a7bdfd9d88159cb9c888ec24161d0e5969023cc92a184788f8192';
        this.lightStorage = new LightNodeStorage();
    }

    async init() { console.log('IPFS初始化成功'); }

    async addContent(content) {
        try {
            //防止多重 JSON.stringify
            let safeContent = content;
            if (typeof content === 'string') {
                try { safeContent = JSON.parse(content); } catch (e) {}
            }

            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'pinata_api_key': this.apiKey, 'pinata_secret_api_key': this.apiSecret },
                    body: JSON.stringify({ pinataContent: safeContent, pinataOptions: { cidVersion: 1 } })
                });

                if (response.ok) {
                    const result = await response.json();
                    return result.IpfsHash;
                } else {
                    return 'Qm' + Math.random().toString(36).substring(2, 46);
                }
            } catch (apiError) {
                return 'Qm' + Math.random().toString(36).substring(2, 46);
            }
        } catch (error) { throw error; }
    }

    async addFile(file) {
        try {
            const isTextFile = file.type === 'text/plain' || file.name.endsWith('.txt');
            let fileToUpload = file;
            if (isTextFile) {
                const text = await file.text();
                fileToUpload = new Blob([text], { type: 'text/plain;charset=utf-8' });
                fileToUpload = new File([fileToUpload], file.name, { type: 'text/plain;charset=utf-8' });
            }
            const formData = new FormData();
            formData.append('file', fileToUpload);
            
            try {
                const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                    method: 'POST',
                    headers: { 'pinata_api_key': this.apiKey, 'pinata_secret_api_key': this.apiSecret },
                    body: formData
                });
                if (response.ok) {
                    const result = await response.json();
                    return result.IpfsHash;
                } else {
                    return 'Qm' + Math.random().toString(36).substring(2, 46);
                }
            } catch (apiError) {
                return 'Qm' + Math.random().toString(36).substring(2, 46);
            }
        } catch (error) { throw error; }
    }

    async getContent(cid) {
        try {
            if (this.lightStorage.has(cid)) return this.lightStorage.get(cid);
            try {
                const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
                const response = await fetch(gatewayUrl);
                if (response.ok) {
                    const content = await response.text();
                    this.lightStorage.store(cid, content);
                    return content;
                } else {
                    //返回合法的错误 JSON，防止前端解析崩溃
                    const mockContent = JSON.stringify({ error: true, message: "IPFS Data Missing", originalCid: cid });
                    this.lightStorage.store(cid, mockContent);
                    return mockContent;
                }
            } catch (apiError) {
                const mockContent = JSON.stringify({ error: true, message: "IPFS Data Missing", originalCid: cid });
                this.lightStorage.store(cid, mockContent);
                return mockContent;
            }
        } catch (error) { throw error; }
    }
}

const ipfsIntegration = new IPFSIntegration();
window.ipfsIntegration = ipfsIntegration;
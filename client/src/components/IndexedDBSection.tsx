import { useState, useCallback } from 'react';
import { StorageManager } from '@utils/storage-manager';

export function IndexedDBSection() {
    const [data, setData] = useState<any>(null);

    // Test IndexedDB storage
    const handleTestStorage = useCallback(async () => {
        const storage = StorageManager.getInstance();

        // Store data
        await storage.set('test-key', { message: 'Hello from IndexedDB!', timestamp: Date.now() });

        // Retrieve data
        const stored = await storage.get('test-key');
        console.log('Stored data:', stored);
        setData(stored);
    }, []);

    return (
        <section className="feature-section">
            <h2>IndexedDB Storage</h2>
            <button onClick={handleTestStorage} className="btn">
                Test Storage
            </button>
            {data && (
                <pre className="result-box">{JSON.stringify(data, null, 2)}</pre>
            )}
        </section>
    );
}

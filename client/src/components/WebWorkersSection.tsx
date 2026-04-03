import { useState, useMemo, useCallback } from 'react';

export function WebWorkersSection() {
    const [workerResult, setWorkerResult] = useState<string>('');

    // Initialize Web Worker
    const dataWorker = useMemo(() => {
        const w = new Worker(new URL('@workers/data-worker', import.meta.url), { type: 'module' });

        w.onmessage = (e: MessageEvent) => {
            console.log('Data Worker message:', e.data);
            setWorkerResult(JSON.stringify(e.data, null, 2));
        };

        w.onerror = (error: ErrorEvent) => {
            console.error('Data Worker error:', error);
        };

        return w;
    }, []);

    // Fetch data using worker
    const handleFetchData = useCallback(() => {
        dataWorker.postMessage({
            action: 'fetch',
            url: '/api/data'
        });
    }, [dataWorker]);

    return (
        <section className="feature-section">
            <h2>Web Workers</h2>
            <button onClick={handleFetchData} className="btn">
                Fetch Data (via Worker)
            </button>
            {workerResult && (
                <pre className="result-box">{workerResult}</pre>
            )}
        </section>
    );
}

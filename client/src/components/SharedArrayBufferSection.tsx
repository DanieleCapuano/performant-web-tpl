import { useState, useMemo, useCallback, useEffect } from 'react';
import { checkSharedArrayBufferSupport, logSharedBufferCapabilities, createSharedBuffer } from '@utils/shared-buffer-test';

export function SharedArrayBufferSection() {
    const [sabSupport, setSabSupport] = useState<any>(null);
    const [sabResult, setSabResult] = useState<string>('');

    // Check SharedArrayBuffer support on mount
    useEffect(() => {
        const support = checkSharedArrayBufferSupport();
        setSabSupport(support);
        logSharedBufferCapabilities();
    }, []);

    const sharedBufferWorker = useMemo(() => {
        const w = new Worker(new URL('@workers/shared-buffer-worker', import.meta.url), { type: 'module' });

        w.onmessage = (e: MessageEvent) => {
            console.log('Shared Buffer Worker message:', e.data);
            setSabResult(JSON.stringify(e.data, null, 2));
        };

        w.onerror = (error: ErrorEvent) => {
            console.error('Shared Buffer Worker error:', error);
            setSabResult(`Error: ${error.message}`);
        };

        return w;
    }, []);

    // Test SharedArrayBuffer
    const handleTestSharedBuffer = useCallback(() => {
        if (!sabSupport?.available) {
            setSabResult('SharedArrayBuffer not available. Check console for details.');
            return;
        }

        try {
            // Create a shared buffer with 1024 integers
            const { buffer, int32View } = createSharedBuffer(1024 * Int32Array.BYTES_PER_ELEMENT);

            // Fill with test data
            for (let i = 0; i < 100; i++) {
                int32View[i] = i;
            }

            // Initialize worker with shared buffer
            sharedBufferWorker.postMessage({ action: 'init', buffer });

            // Process data in worker after initialization
            setTimeout(() => {
                sharedBufferWorker.postMessage({
                    action: 'process',
                    offset: 0,
                    length: 100,
                });

                // Read results after processing
                setTimeout(() => {
                    const results = [];
                    for (let i = 0; i < 10; i++) {
                        results.push(`[${i}]: ${int32View[i]}`);
                    }
                    setSabResult(`Worker processed data (first 10 values):\n${results.join('\n')}`);
                }, 100);
            }, 100);

        } catch (error) {
            setSabResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [sabSupport, sharedBufferWorker]);

    return (
        <section className="feature-section">
            <h2>SharedArrayBuffer</h2>
            <p>
                Status: {sabSupport?.available ? '✅ Available' : '❌ Not Available'}
                {sabSupport?.error && <span> - {sabSupport.error}</span>}
            </p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
                Zero-copy data sharing between threads
            </p>
            <button
                onClick={handleTestSharedBuffer}
                disabled={!sabSupport?.available}
                className="btn"
            >
                Test Shared Buffer
            </button>
            {sabResult && (
                <pre className="result-box">{sabResult}</pre>
            )}
        </section>
    );
}

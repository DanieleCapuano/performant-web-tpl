import { useState, useMemo, useCallback } from 'react';

export function WebAssemblySection() {
    const [wasmResult, setWasmResult] = useState<string>('');
    const [wasmLoading, setWasmLoading] = useState<boolean>(false);

    const computeWorker = useMemo(() => {
        const w = new Worker(new URL('@workers/compute-worker', import.meta.url), { type: 'module' });

        w.onmessage = (e: MessageEvent) => {
            console.log('Compute Worker message:', e.data);
        };

        w.onerror = (error: ErrorEvent) => {
            console.error('Compute Worker error:', error);
        };

        return w;
    }, []);

    // Test WASM functions
    const handleWasmTest = useCallback((fn: string, params: any[], label: string) => {
        setWasmLoading(true);
        setWasmResult(`Running ${label}...`);

        const startTime = performance.now();
        computeWorker.postMessage({
            action: 'calculate',
            data: fn,
            params
        });

        // Store the function name for result display
        computeWorker.onmessage = (e: MessageEvent) => {
            const duration = performance.now() - startTime;
            const { success, result, error } = e.data;

            if (success) {
                let res;
                try {
                    res = JSON.stringify(result);
                }
                catch (_) {
                    res = result.toString();
                }
                setWasmResult(`${label}: ${res}\nDuration: ${duration.toFixed(2)}ms`);
            } else {
                setWasmResult(`${label} failed: ${error}\nDuration: ${duration.toFixed(2)}ms`);
            }
            setWasmLoading(false);
        };
    }, [computeWorker]);

    return (
        <section className="feature-section">
            <h2>WebAssembly</h2>
            <p>Status: {computeWorker !== null ? '✅ Ready' : '⏳ Loading...'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <button
                    onClick={() => handleWasmTest('fibonacci', [30], 'Fibonacci(30)')}
                    disabled={wasmLoading}
                    className="btn"
                    style={{ fontSize: '0.9em', padding: '8px 12px' }}
                >
                    Fibonacci
                </button>
                <button
                    onClick={() => handleWasmTest('add', [42, 58], 'Add(42, 58)')}
                    disabled={wasmLoading}
                    className="btn"
                    style={{ fontSize: '0.9em', padding: '8px 12px' }}
                >
                    Add Numbers
                </button>
                <button
                    onClick={() => handleWasmTest('sum_array', [[1, 2, 3, 4, 5, 10, 20, 30]], 'Sum Array')}
                    disabled={wasmLoading}
                    className="btn"
                    style={{ fontSize: '0.9em', padding: '8px 12px' }}
                >
                    Sum Array
                </button>
                <button
                    onClick={() => handleWasmTest('calculate_primes', [1000], 'Primes up to 1000')}
                    disabled={wasmLoading}
                    className="btn"
                    style={{ fontSize: '0.9em', padding: '8px 12px' }}
                >
                    Calculate Primes
                </button>
            </div>
            {wasmResult && (
                <pre className="result-box">{wasmResult}</pre>
            )}
        </section>
    );
}


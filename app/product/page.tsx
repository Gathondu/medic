"use client"

import { useState, FormEvent } from 'react';
import { useAuth } from '@clerk/nextjs';
import DatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Show, PricingTable, UserButton } from '@clerk/nextjs';

/**
 * LLM SSE streams often omit newlines. CommonMark ATX headings (# … ###) must
 * start a line or they render as plain text.
 */
function normalizeStreamedMarkdownForBlocks(src: string): string {
    if (!src) return src;
    return src.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');
}

function ConsultationForm() {
    const { getToken } = useAuth();

    // Form state
    const [patientName, setPatientName] = useState('');
    const [visitDate, setVisitDate] = useState<Date | null>(new Date());
    const [notes, setNotes] = useState('');

    // Streaming state
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setOutput('');
        setLoading(true);

        if (!(await getToken())) {
            setOutput('Authentication required');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        let buffer = '';

        try {
            await fetchEventSource('/api', {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({
                    patient_name: patientName,
                    date_of_visit: visitDate?.toISOString().slice(0, 10),
                    notes,
                }),
                fetch: async (input, init) => {
                    const token = await getToken();
                    if (!token) {
                        throw new Error('Authentication required');
                    }
                    const headers = new Headers(init?.headers);
                    headers.set('Authorization', `Bearer ${token}`);
                    const incoming = init?.signal;
                    const mergedSignal =
                        incoming &&
                        typeof AbortSignal !== 'undefined' &&
                        'any' in AbortSignal
                            ? AbortSignal.any([controller.signal, incoming])
                            : incoming ?? controller.signal;
                    return globalThis.fetch(input, {
                        ...init,
                        headers,
                        signal: mergedSignal,
                    });
                },
                async onopen(response) {
                    if (!response.ok) {
                        const detail = await response.text();
                        throw new Error(
                            `Backend returned ${response.status}: ${detail.slice(0, 500)}`,
                        );
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType?.startsWith('text/event-stream')) {
                        throw new Error(
                            `Expected text/event-stream, got ${contentType ?? 'none'}`,
                        );
                    }
                },
                onmessage(ev) {
                    buffer += ev.data;
                    setOutput(buffer);
                },
                onclose() {},
                onerror(err) {
                    console.error('SSE error:', err);
                    setOutput(
                        (prev) =>
                            prev ||
                            (err instanceof Error ? err.message : String(err)),
                    );
                    throw err;
                },
            });
        } catch (e) {
            console.error(e);
            setOutput((prev) => prev || (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
                Consultation Notes
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <div className="space-y-2">
                    <label htmlFor="patient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Patient Name
                    </label>
                    <input
                        id="patient"
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Enter patient's full name"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date of Visit
                    </label>
                    <DatePicker
                        id="date"
                        selected={visitDate}
                        onChange={(d: Date | null) => setVisitDate(d)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Consultation Notes
                    </label>
                    <textarea
                        id="notes"
                        required
                        rows={8}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Enter detailed consultation notes..."
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                    {loading ? 'Generating Summary...' : 'Generate Summary'}
                </button>
            </form>

            {output && (
                <section className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <div className="markdown-content prose prose-blue dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                            {normalizeStreamedMarkdownForBlocks(output)}
                        </ReactMarkdown>
                    </div>
                </section>
            )}
        </div>
    );
}

export default function Product() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Subscription Protection */}
            <Show
                when={{
                    plan: "premium_subscription"
                }}
                fallback={
                    <div className="container mx-auto px-4 py-12">
                        <header className="text-center mb-12">
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                                Healthcare Professional Plan
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                                Streamline your patient consultations with AI-powered summaries
                            </p>
                        </header>
                        <div className="max-w-4xl mx-auto">
                            <PricingTable />
                        </div>
                    </div>
                }
            >
                <ConsultationForm />
            </Show>
        </main>
    );
}
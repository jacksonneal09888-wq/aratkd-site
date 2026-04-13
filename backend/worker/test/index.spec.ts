import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src';

describe('Portal Worker API', () => {
	it('returns the API descriptor at the root route (unit style)', async () => {
		const request = new Request('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ message: 'Portal Worker API' });
	});

	it('returns the API descriptor at the root route (integration style)', async () => {
		const response = await SELF.fetch('http://example.com/');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ message: 'Portal Worker API' });
	});

	it('allows trusted site origins in CORS responses', async () => {
		const request = new Request('http://example.com/', {
			headers: { Origin: 'https://aratkd.com' }
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		await waitOnExecutionContext(ctx);

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://aratkd.com');
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
	});

	it('rejects untrusted CORS preflight origins', async () => {
		const request = new Request('http://example.com/portal/profile', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://evil.example',
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'Authorization'
			}
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ error: 'Origin not allowed' });
	});

	it('rejects kiosk check-ins without kiosk auth (unit style)', async () => {
		const request = new Request('http://example.com/kiosk/check-in', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentId: 'ARA001', classType: 'basic' })
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized kiosk' });
	});

	it('rejects kiosk check-ins without kiosk auth (integration style)', async () => {
		const response = await SELF.fetch('http://example.com/kiosk/check-in', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentId: 'ARA001', classType: 'basic' })
		});

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Unauthorized kiosk' });
	});
});

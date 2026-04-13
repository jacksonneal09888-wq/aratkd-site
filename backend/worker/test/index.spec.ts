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
